import { useCallback, useEffect, useState } from 'react';
import { hasTrimmedString, readTextInputValue, readTrimmedString } from '@vt/common-utils';
import { Button } from '@vt/ui-components';
import { LoadErrorState } from '../components/load-error-state';
import { api, type AuditLogContract } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';

const SYSTEM_ACTOR_LABEL = 'Hệ thống';

type AuditFilters = {
  actor: string;
  action: string;
  entity: string;
  date: string;
};

const EMPTY_FILTERS: AuditFilters = {
  actor: '',
  action: '',
  entity: '',
  date: '',
};

function readAuditDisplayText(value: unknown, fallback: string): string {
  return readTrimmedString(value) ?? fallback;
}

function toFilterParams(filters: AuditFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => hasTrimmedString(value)));
}

function formatAuditDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN');
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(EMPTY_FILTERS);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    const params = toFilterParams(filters);
    api.audit
      .list(params)
      .then((res) => setLogs(res.items))
      .catch((err) => setLoadError(mergeApiErrorMessage('Không tải được nhật ký hệ thống', err)))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const inputStyle = {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #ddd',
    minWidth: 160,
    background: '#fff',
  } as const;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#191714', margin: 0 }}>Nhật ký hệ thống</h1>
          <div style={{ color: '#7a7265', fontSize: '0.85rem', marginTop: 4 }}>
            Theo dõi thao tác quản trị để dễ rà soát thay đổi và hỗ trợ vận hành.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Người thực hiện / User ID"
            value={draftFilters.actor}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, actor: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setFilters({ ...draftFilters });
            }}
            style={inputStyle}
          />
          <input
            placeholder="Hành động"
            value={draftFilters.action}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, action: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setFilters({ ...draftFilters });
            }}
            style={inputStyle}
          />
          <input
            placeholder="Đối tượng"
            value={draftFilters.entity}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, entity: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setFilters({ ...draftFilters });
            }}
            style={inputStyle}
          />
          <input
            type="date"
            value={draftFilters.date}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, date: event.target.value }))}
            style={inputStyle}
          />
          <Button variant="secondary" onClick={() => setFilters({ ...draftFilters })}>
            Lọc
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraftFilters(EMPTY_FILTERS);
              setFilters(EMPTY_FILTERS);
            }}
          >
            Đặt lại
          </Button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>Đang tải...</div>
        ) : loadError ? (
          <LoadErrorState message={loadError} onRetry={load} />
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#999' }}>Chưa có nhật ký phù hợp</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 12 }}>Thời gian</th>
                <th style={{ padding: 12 }}>Người thực hiện</th>
                <th style={{ padding: 12 }}>Hành động</th>
                <th style={{ padding: 12 }}>Đối tượng</th>
                <th style={{ padding: 12 }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f5f3ee' }}>
                  <td style={{ padding: 12 }}>{formatAuditDate(log.createdAt)}</td>
                  <td style={{ padding: 12 }}>{readAuditDisplayText(log.userId, SYSTEM_ACTOR_LABEL)}</td>
                  <td style={{ padding: 12 }}>{readAuditDisplayText(log.action, '—')}</td>
                  <td style={{ padding: 12 }}>
                    {readAuditDisplayText(log.entity, '—')}
                    <br />
                    <span style={{ color: '#999', fontSize: '0.75rem' }}>{readTextInputValue(log.entityId)}</span>
                  </td>
                  <td style={{ padding: 12 }}>{readAuditDisplayText(log.ip, '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
