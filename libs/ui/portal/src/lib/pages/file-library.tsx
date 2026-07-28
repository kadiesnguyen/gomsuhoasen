import { useCallback, useEffect, useRef, useState } from 'react';
import { readTrimmedString } from '@vt/common-utils';
import {
  FILE_ASSET_STATUSES,
  FILE_ASSET_STATUS_VALUES,
  type FileAssetStatusContract,
} from '@gomhoasen/contracts';
import { Button } from '@vt/ui-components';
import { LoadErrorState } from '../components/load-error-state';
import { MediaLightboxModal } from '../components/media-lightbox-modal';
import { MediaPreviewSurface } from '../components/media-preview';
import { useToast } from '../components/toast';
import { api, apiAssetUrl, type FileAssetApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import {
  readDisplayText,
  readFirstDisplayText,
  readPositiveInteger,
} from '../utils/display-normalization';
import { readMediaPreviewKind } from '../utils/media-fields';

type StatusFilter = '' | FileAssetStatusContract;
type ModuleFilter =
  | ''
  | 'legacy-static'
  | 'catalog-product'
  | 'catalog'
  | 'artisan'
  | 'showroom-v2-content'
  | 'site-config';
type StatusMeta = { label: string; color: string; background: string };

const STATUS_META: Record<FileAssetStatusContract, StatusMeta> = {
  TEMP: { label: 'Tạm', color: '#92400e', background: '#fef3c7' },
  ATTACHED: { label: 'Đã gắn', color: '#0f766e', background: '#d1fae5' },
  ORPHAN: { label: 'Mồ côi', color: '#6b7280', background: '#f3f4f6' },
  DELETED: { label: 'Đã xóa', color: '#6b7280', background: '#f3f4f6' },
};

const MODULE_OPTIONS: Array<{ value: ModuleFilter; label: string }> = [
  { value: '', label: 'Tất cả module' },
  { value: 'legacy-static', label: 'Tài nguyên tĩnh' },
  { value: 'catalog-product', label: 'Sản phẩm' },
  { value: 'catalog', label: 'Catalog / báo giá' },
  { value: 'artisan', label: 'Nghệ nhân' },
  { value: 'showroom-v2-content', label: 'Nội dung website' },
  { value: 'site-config', label: 'Cấu hình website' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN');
}

function readStatusMeta(status: FileAssetApi['status']): StatusMeta {
  return STATUS_META[status] ?? STATUS_META[FILE_ASSET_STATUSES.TEMP];
}

function readAssetId(asset: FileAssetApi): string {
  return readFirstDisplayText([asset._id, asset.id], asset.id);
}

function readModuleLabel(moduleRef: unknown): string {
  if (moduleRef === 'legacy-static') return 'Tài nguyên tĩnh';
  if (moduleRef === 'site-config') return 'Cấu hình website';
  return readDisplayText(moduleRef, '—');
}

function readFileKindLabel(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'ẢNH';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType === 'application/pdf') return 'PDF';
  const [type] = mimeType.split('/');
  return readDisplayText(type, 'FILE').toUpperCase();
}

export function FileLibraryPage() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileAssetApi[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('');
  const [moduleRef, setModuleRef] = useState<ModuleFilter>('');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<FileAssetApi | null>(null);

  useEffect(() => {
    if (!copiedId) return undefined;
    const timeoutId = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copiedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.files.listAssets({
        page,
        limit,
        status: status || undefined,
        moduleRef: moduleRef || undefined,
        search: readTrimmedString(search),
      });
      setItems(data.items);
      setTotalItems(readPositiveInteger(data.total, 0));
      setTotalPages(readPositiveInteger(data.totalPages, 1));
    } catch (err) {
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setError(mergeApiErrorMessage('Không tải được thư viện tệp', err));
    } finally {
      setLoading(false);
    }
  }, [limit, moduleRef, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitSearch = () => {
    setPage(1);
    setSearch(readTrimmedString(searchDraft) ?? '');
  };

  const clearFilters = () => {
    setPage(1);
    setStatus('');
    setModuleRef('');
    setSearch('');
    setSearchDraft('');
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    let successCount = 0;
    let failureCount = 0;

    setUploading(true);
    try {
      for (const file of files) {
        try {
          await api.files.uploadAsset(file);
          successCount += 1;
        } catch {
          failureCount += 1;
        }
      }

      if (successCount > 0) {
        toast(
          successCount === 1
            ? 'Đã tải 1 tệp lên thư viện.'
            : `Đã tải ${successCount} tệp lên thư viện.`,
          'success',
        );
      }

      if (failureCount > 0) {
        toast(
          failureCount === 1
            ? 'Có 1 tệp tải lên thất bại.'
            : `Có ${failureCount} tệp tải lên thất bại.`,
          'error',
        );
      }

      setPage(1);
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const hasActiveFilters = Boolean(status || moduleRef || search);
  const showEmptyLibraryState = !loading && !error && items.length === 0 && !hasActiveFilters;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(event) => {
          void handleUploadFiles(event.target.files);
        }}
        style={{ display: 'none' }}
      />
      <MediaLightboxModal
        isOpen={previewAsset !== null}
        kind={readMediaPreviewKind(previewAsset?.storagePath ?? '', { mimeType: previewAsset?.mimeType })}
        src={previewAsset ? apiAssetUrl(previewAsset.storagePath) : undefined}
        title={previewAsset?.originalName ?? ''}
        subtitle={previewAsset?.storagePath}
        onClose={() => setPreviewAsset(null)}
        onOpenExternal={
          previewAsset
            ? () => window.open(apiAssetUrl(previewAsset.storagePath), '_blank', 'noopener,noreferrer')
            : undefined
        }
      />

      <div className="ghs-page-header">
        <div>
          <h1>Thư viện tệp</h1>
          <p>
            Theo dõi tài nguyên đã tải lên, trạng thái gắn tham chiếu, và nguồn sử dụng trong hệ thống.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            isLoading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Tải tệp lên
          </Button>
          <Button variant="secondary" onClick={() => { void load(); }}>
            Làm mới
          </Button>
        </div>
      </div>

      <div className="ghs-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as StatusFilter);
          }}
          style={{ border: '1px solid #ddd', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
        >
          <option value="">Tất cả trạng thái</option>
          {FILE_ASSET_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {STATUS_META[value].label}
            </option>
          ))}
        </select>

        <select
          value={moduleRef}
          onChange={(event) => {
            setPage(1);
            setModuleRef(event.target.value as ModuleFilter);
          }}
          style={{ border: '1px solid #ddd', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
        >
          {MODULE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitSearch();
          }}
          placeholder="Tìm theo tên hoặc đường dẫn tệp..."
          style={{ border: '1px solid #ddd', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
        />

        <Button variant="secondary" onClick={submitSearch}>
          Tìm
        </Button>

        <Button variant="outline" onClick={clearFilters}>
          Xóa lọc
        </Button>
      </div>

      {error ? (
        <LoadErrorState message={error} onRetry={() => { void load(); }} />
      ) : (
        <div className="ghs-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>Đang tải...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>
              <div>
                {showEmptyLibraryState
                  ? 'Chưa có tệp nào trong thư viện.'
                  : 'Chưa có tệp nào phù hợp bộ lọc hiện tại.'}
              </div>
              {showEmptyLibraryState ? (
                <div style={{ marginTop: 14 }}>
                  <Button
                    variant="primary"
                    isLoading={uploading}
                    onClick={() => inputRef.current?.click()}
                  >
                    Tải tệp đầu tiên
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.88rem',
                  minWidth: 1040,
                }}
              >
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: 12 }}>Tệp</th>
                    <th style={{ padding: 12 }}>Trạng thái</th>
                    <th style={{ padding: 12 }}>Kích thước</th>
                    <th style={{ padding: 12, textAlign: 'center' }}>Ref</th>
                    <th style={{ padding: 12 }}>Module</th>
                    <th style={{ padding: 12 }}>Cập nhật</th>
                    <th style={{ padding: 12, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const assetId = readAssetId(item);
                    const assetUrl = apiAssetUrl(item.storagePath);
                    const meta = readStatusMeta(item.status);
                    return (
                      <tr
                        key={assetId}
                        style={{ borderBottom: '1px solid #f5f3ee', verticalAlign: 'top' }}
                      >
                        <td style={{ padding: 12 }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '56px minmax(0, 1fr)',
                              gap: 12,
                              alignItems: 'center',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewAsset(item)}
                              style={{
                                padding: 0,
                                border: 0,
                                background: 'transparent',
                                cursor: 'pointer',
                              }}
                              aria-label={`Xem lớn ${item.originalName}`}
                            >
                              <div style={{ width: 56 }}>
                                <MediaPreviewSurface
                                  kind={readMediaPreviewKind(item.storagePath, { mimeType: item.mimeType })}
                                  src={assetUrl}
                                  title={item.originalName}
                                  aspectRatio="4 / 3"
                                  radius={10}
                                  minHeight={48}
                                  fit="contain"
                                  padding={5}
                                  background="linear-gradient(180deg, #fbf7ef 0%, #f2e6cd 100%)"
                                  fallbackText={item.mimeType.startsWith('image/') ? undefined : readFileKindLabel(item.mimeType)}
                                />
                              </div>
                            </button>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: '#191714',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.originalName}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.76rem',
                                  color: '#817666',
                                  wordBreak: 'break-all',
                                  marginTop: 2,
                                }}
                              >
                                {item.storagePath}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#9a8f7d', marginTop: 4 }}>
                                Trường: {readDisplayText(item.fieldRef, '—')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: meta.color,
                              background: meta.background,
                              padding: '4px 8px',
                              borderRadius: 999,
                            }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ padding: 12 }}>{formatBytes(item.sizeBytes)}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{item.referenceCount}</td>
                        <td style={{ padding: 12 }}>{readModuleLabel(item.moduleRef)}</td>
                        <td style={{ padding: 12 }}>{formatDateTime(item.updatedAt ?? item.createdAt)}</td>
                        <td style={{ padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => setPreviewAsset(item)}
                            >
                              Xem trước
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(item.storagePath);
                                  setCopiedId(assetId);
                                  toast('Đã chép đường dẫn tệp.', 'success');
                                } catch {
                                  toast('Không thể chép đường dẫn trên trình duyệt này.', 'error');
                                }
                              }}
                            >
                              {copiedId === assetId ? 'Đã chép' : 'Chép path'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              isLoading={processingId === assetId}
                              onClick={async () => {
                                setProcessingId(assetId);
                                try {
                                  await api.files.unref({ assetIds: [assetId] });
                                  toast('Đã gỡ tham chiếu tệp.', 'success');
                                  await load();
                                } catch (err) {
                                  toast(mergeApiErrorMessage('Gỡ tham chiếu thất bại', err), 'error');
                                } finally {
                                  setProcessingId(null);
                                }
                              }}
                            >
                              Unref
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 12,
          alignItems: 'center',
          color: '#7a7265',
          fontSize: '0.82rem',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          {totalItems > 0 ? `Tổng ${totalItems} tệp | ` : ''}
          Trang {page} / {totalPages}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Trước
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
