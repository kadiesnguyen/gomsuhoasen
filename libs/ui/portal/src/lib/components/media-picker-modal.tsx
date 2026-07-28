import { useEffect, useState, type CSSProperties } from 'react';
import { readTrimmedString } from '@vt/common-utils';
import { api, apiAssetUrl, type FileAssetApi } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { Button } from '@vt/ui-components';
import { readDisplayText, readFirstDisplayText, readPositiveInteger } from '../utils/display-normalization';
import { LoadErrorState } from './load-error-state';
import { assetMatchesAccept, readMediaPreviewKind } from '../utils/media-fields';
import { MediaPreviewSurface, readMediaKindLabel } from './media-preview';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assets: FileAssetApi[]) => void;
  mode?: 'single' | 'multiple';
  accept?: string;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const panelStyle: CSSProperties = {
  width: 'min(860px, 100%)',
  height: 'min(640px, 90vh)',
  borderRadius: 14,
  background: '#fff',
  boxShadow: '0 24px 80px rgba(25, 23, 20, 0.28)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
};

function readAssetId(asset: FileAssetApi): string {
  return readFirstDisplayText([asset._id, asset.id], asset.id);
}

function readMimeSubtype(mimeType: string): string {
  return readDisplayText(mimeType.split('/')[1], mimeType);
}

export function MediaPickerModal({ isOpen, onClose, onSelect, mode = 'single', accept }: MediaPickerModalProps) {
  const [assets, setAssets] = useState<FileAssetApi[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    let mimePrefix: string | undefined;
    if (accept?.startsWith('image/')) mimePrefix = 'image';
    if (accept?.startsWith('video/')) mimePrefix = 'video';

    setLoading(true);
    setLoadError('');
    api.files.listAssets({ page, limit: 16, search: readTrimmedString(search), mimePrefix })
      .then(res => {
        setAssets(accept ? res.items.filter((asset) => assetMatchesAccept(asset, accept)) : res.items);
        setTotalPages(readPositiveInteger(res.totalPages, 1));
      })
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được thư viện file', err)))
      .finally(() => setLoading(false));
  }, [isOpen, page, search, accept, reloadKey]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleSelect = (asset: FileAssetApi) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const id = readAssetId(asset);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (mode === 'single') next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedAssets = assets.filter(a => selectedIds.has(readAssetId(a)));
    onSelect(selectedAssets);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="media-picker-title">
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(25, 23, 20, 0.56)' }} onClick={onClose} />
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #eee7d8' }}>
          <h2 id="media-picker-title" style={{ margin: 0, fontSize: '1.15rem', color: '#191714' }}>Chọn từ thư viện file</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Tìm tên file..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.86rem', outline: 'none' }}
            />
            <button type="button" aria-label="Đóng thư viện file" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#faf8f3' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Đang tải...</div>
          ) : loadError ? (
            <LoadErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />
          ) : assets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Không tìm thấy file nào</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {assets.map((asset) => {
                const id = readAssetId(asset);
                const isSelected = selectedIds.has(id);
                const previewKind = readMediaPreviewKind(asset.storagePath, {
                  mimeType: asset.mimeType,
                  accept,
                });
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => toggleSelect(asset)}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Bỏ chọn' : 'Chọn'} ${asset.originalName}`}
                    style={{
                      border: `2px solid ${isSelected ? '#9A7520' : '#eee7d8'}`,
                      borderRadius: 12,
                      background: '#fff',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: 0,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ padding: 10, background: '#fffdf8', borderBottom: '1px solid #f1eadb' }}>
                      <MediaPreviewSurface
                        kind={previewKind}
                        src={apiAssetUrl(asset.storagePath)}
                        title={asset.originalName}
                        aspectRatio="4 / 3"
                        radius={10}
                        minHeight={120}
                        fit="contain"
                        padding={12}
                      />
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#191714', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {asset.originalName}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#7b5e18', background: '#fff6dd', border: '1px solid #e9d8a6', padding: '2px 7px', borderRadius: 999 }}>
                          {readMediaKindLabel(previewKind)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#817666' }}>
                          {readMimeSubtype(asset.mimeType)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9a8f7d', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {asset.storagePath}
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: '#9A7520', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #eee7d8', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>{page} / {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={onClose}>Hủy</Button>
            <Button variant="primary" disabled={selectedIds.size === 0} onClick={handleConfirm}>
              Chọn {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
