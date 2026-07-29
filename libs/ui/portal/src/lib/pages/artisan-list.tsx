// Portal artisan list page
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARTISAN_STATUSES, type ArtisanStatus } from '@gomhoasen/contracts';
import { api, apiAssetUrl, type ArtisanApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { useConfirm } from '../components/confirm-dialog';
import { LoadErrorState } from '../components/load-error-state';
import { MediaLightboxModal } from '../components/media-lightbox-modal';
import { MediaPreviewSurface } from '../components/media-preview';
import { useToast } from '../components/toast';
import { readOptionalDisplayText } from '../utils/display-normalization';
import { readMediaPreviewKind } from '../utils/media-fields';

type Artisan = ArtisanApi;

const STATUS_MAP: Record<ArtisanStatus, { label: string; bg: string; color: string }> = {
  [ARTISAN_STATUSES.ACTIVE]: { label: 'Đang hoạt động', bg: '#ecfdf5', color: '#059669' },
  [ARTISAN_STATUSES.INACTIVE]: { label: 'Tạm nghỉ', bg: '#f3f4f6', color: '#6b7280' },
};

function readExperienceLabel(artisan: Artisan): string {
  const hasWorkshop = readOptionalDisplayText(artisan.workshop) !== undefined;
  const hasYears = typeof artisan.yearsExperience === 'number' && Number.isFinite(artisan.yearsExperience);
  if (!hasWorkshop && !hasYears) return '—';
  return `${hasYears ? artisan.yearsExperience : '—'} năm kinh nghiệm`;
}

function readAvatarFallback(name: string): string {
  const normalized = name.trim();
  return normalized.length > 0 ? normalized.slice(0, 1).toUpperCase() : 'N';
}

export function ArtisanListPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [previewArtisan, setPreviewArtisan] = useState<Artisan | null>(null);
  const previewArtisanAvatar = readOptionalDisplayText(previewArtisan?.avatar);

  const load = () => {
    setLoading(true);
    setLoadError('');
    api.artisan
      .list()
      .then(setArtisans)
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được danh sách nghệ nhân', err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestDelete = (artisan: Artisan) => {
    confirm({
      title: 'Xóa nghệ nhân?',
      description: `Hồ sơ "${artisan.name}" sẽ được ẩn khỏi showroom nhưng vẫn giữ lịch sử dữ liệu.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.artisan.delete(artisan.id);
          setArtisans((prev) => prev.filter((item) => item.id !== artisan.id));
          toast('Đã xóa nghệ nhân.', 'success');
        } catch (err) {
          toast(mergeApiErrorMessage('Xóa nghệ nhân thất bại', err), 'error');
          throw err;
        }
      },
    });
  };

  return (
    <div>
      <MediaLightboxModal
        isOpen={previewArtisan !== null}
        kind={readMediaPreviewKind(previewArtisanAvatar ?? '')}
        src={previewArtisanAvatar ? apiAssetUrl(previewArtisanAvatar) : undefined}
        title={previewArtisan?.name ?? ''}
        subtitle={previewArtisanAvatar}
        onClose={() => setPreviewArtisan(null)}
        onOpenExternal={
          previewArtisanAvatar
            ? () => window.open(apiAssetUrl(previewArtisanAvatar), '_blank', 'noopener,noreferrer')
            : undefined
        }
      />
      <div className="ghs-page-header">
        <div><h1>Nghệ nhân</h1></div>
        <button
          type="button"
          onClick={() => navigate('/admin/artisans/new')}
          className="ghs-btn ghs-btn-primary"
        >
          + Thêm nghệ nhân
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>Đang tải...</div>
      ) : loadError ? (
        <LoadErrorState message={loadError} onRetry={load} />
      ) : artisans.length === 0 ? (
        <div className="ghs-card ghs-empty">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>NGHỆ NHÂN</div>
          <h3 style={{ fontWeight: 600, color: '#333', marginBottom: 8 }}>Chưa có nghệ nhân</h3>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Thêm nghệ nhân đầu tiên để kể câu chuyện thương hiệu.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {artisans.map((artisan) => {
            const statusMeta = STATUS_MAP[artisan.status] ?? STATUS_MAP[ARTISAN_STATUSES.ACTIVE];
            const avatar = readOptionalDisplayText(artisan.avatar);
            const specialty = readOptionalDisplayText(artisan.specialty);
            return (
              <div
                key={artisan.id}
                onClick={() => navigate(`/admin/artisans/${artisan.id}/edit`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/admin/artisans/${artisan.id}/edit`);
                  }
                }}
                role="link"
                tabIndex={0}
                aria-label={`Xem hồ sơ nghệ nhân ${artisan.name}`}
                className="ghs-card"
                style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 56,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f7f4ec, #e8e0cf)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.5rem',
                      overflow: 'hidden',
                    }}
                  >
                    {avatar !== undefined ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewArtisan(artisan);
                        }}
                        style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
                        aria-label={`Xem lớn ảnh nghệ nhân ${artisan.name}`}
                      >
                        <MediaPreviewSurface
                          kind={readMediaPreviewKind(avatar)}
                          src={apiAssetUrl(avatar)}
                          title={artisan.name}
                          aspectRatio="1 / 1"
                          radius={999}
                          minHeight={56}
                          fit="contain"
                          padding={4}
                          background="linear-gradient(135deg, #f7f4ec, #e8e0cf)"
                          fallbackText={readAvatarFallback(artisan.name)}
                        />
                      </button>
                    ) : (
                      readAvatarFallback(artisan.name)
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#191714', margin: 0 }}>{artisan.name}</h3>
                    {specialty !== undefined ? (
                      <p style={{ fontSize: '0.8rem', color: '#9A7520', margin: '2px 0 0', fontWeight: 500 }}>
                        {specialty}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#888', marginBottom: 14 }}>
                  <span>{readExperienceLabel(artisan)}</span>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: 20,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: statusMeta.bg,
                      color: statusMeta.color,
                    }}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <div className="ghs-table-actions">
                  <button
                    type="button"
                    className="ghs-btn ghs-btn-ghost ghs-btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/admin/artisans/${artisan.id}/edit`);
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="ghs-btn ghs-btn-danger ghs-btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      requestDelete(artisan);
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
