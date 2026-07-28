import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { mergeApiErrorMessage } from '../services/api-error';
import { LoadErrorState } from '../components/load-error-state';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { QUOTE_STATUSES, RFQ_STATUSES, formatVnd as money } from '@gomhoasen/contracts';
import { readTrimmedString } from '@vt/common-utils';
import { ArrowRight, ClipboardList, Package, RefreshCw, ScrollText, Users } from 'lucide-react';

interface Stats {
  productsActive: number;
  productsTotal: number;
  rfqNew: number;
  rfqTotal: number;
  quotesTotal: number;
  quotesSent: number;
  acceptedValue: number;
  artisansActive: number;
  latestRfqs: Array<{ id: string; customerName?: string; customerPhone?: string; status?: string; createdAt?: string }>;
  latestQuotes: Array<{ id: string; code?: string; customerName?: string; status?: string; total?: number; createdAt?: string }>;
  chartData: Array<{ name: string; rfqs: number; quotes: number }>;
}

const EMPTY_STATS: Stats = {
  productsActive: 0,
  productsTotal: 0,
  rfqNew: 0,
  rfqTotal: 0,
  quotesTotal: 0,
  quotesSent: 0,
  acceptedValue: 0,
  artisansActive: 0,
  latestRfqs: [],
  latestQuotes: [],
  chartData: [],
};



export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoading(true);
    setLoadError('');
    api.dashboard.stats()
      .then(setStats)
      .catch((err) => {
        setStats(EMPTY_STATS);
        setLoadError(mergeApiErrorMessage('Không tải được dữ liệu tổng quan', err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = [
    {
      label: 'Sản phẩm đang hiển thị',
      value: stats.productsActive,
      secondary: `${stats.productsTotal} tổng sản phẩm`,
      icon: Package,
      color: '#9A7520',
      href: '/admin/products',
    },
    {
      label: 'RFQ mới',
      value: stats.rfqNew,
      secondary: `${stats.rfqTotal} yêu cầu báo giá`,
      icon: ClipboardList,
      color: '#C75050',
      href: '/admin/rfq',
    },
    {
      label: 'Báo giá đã tạo',
      value: stats.quotesTotal,
      secondary: `${stats.quotesSent} đã gửi khách`,
      icon: ScrollText,
      color: '#173B66',
      href: '/admin/quotes',
    },
    {
      label: 'Nghệ nhân hoạt động',
      value: stats.artisansActive,
      secondary: 'Hồ sơ nghệ nhân hiện hành',
      icon: Users,
      color: '#059669',
      href: '/admin/artisans',
    },
  ];

  const quickActions = [
    { label: 'Thêm sản phẩm', href: '/admin/products/new' },
    { label: 'Mở RFQ', href: '/admin/rfq' },
    { label: 'Tạo báo giá', href: '/admin/quotes/new' },
    { label: 'Cập nhật nội dung', href: '/admin/showroom-v2-content' },
  ];

  const openRfq = (id?: string) => {
    if (!id) {
      navigate('/admin/rfq');
      return;
    }
    navigate(`/admin/rfq?id=${id}`);
  };

  const openQuote = (id?: string) => {
    if (!id) {
      navigate('/admin/quotes');
      return;
    }
    navigate(`/admin/quotes/${id}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, color: '#191714' }}>Tổng quan</h1>
          <div style={{ color: '#8a8178', fontSize: '0.92rem' }}>
            Theo dõi nhanh tình hình RFQ, báo giá, sản phẩm và vận hành showroom.
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #e6dfd2',
            background: '#fff',
            color: '#6b5b45',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={15} />
          Làm mới
        </button>
      </div>
      {loadError ? (
        <LoadErrorState message={loadError} onRetry={load} />
      ) : (
        <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {quickActions.map((action) => (
          <button
            key={action.href}
            type="button"
            onClick={() => navigate(action.href)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid #e8dcc5',
              background: '#fffaf0',
              color: '#7b5e18',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.84rem',
            }}
          >
            {action.label}
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.href)}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '24px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #f1ece2',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#fbf7ef', color: card.color }}>
                <Icon size={20} />
              </span>
              <span style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                {card.label}
              </span>
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: card.color }}>
              {loading ? '—' : card.value}
            </div>
            <div style={{ marginTop: 8, color: '#8a8178', fontSize: '0.84rem' }}>{card.secondary}</div>
          </button>
        )})}
      </div>
      
      {/* Chart Section */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginTop: 20, height: 320 }}>
        <h3 style={{ marginTop: 0, color: '#9A7520', marginBottom: 16 }}>Hoạt động 7 ngày qua</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="rfqs" name="Yêu cầu (RFQ)" fill="#C75050" radius={[4, 4, 0, 0]} barSize={32} />
            <Bar dataKey="quotes" name="Báo giá" fill="#173B66" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3 style={{ marginTop: 0, color: '#9A7520' }}>RFQ mới nhất</h3>
            <button type="button" onClick={() => navigate('/admin/rfq')} style={{ border: 0, background: 'none', color: '#7b5e18', cursor: 'pointer', fontWeight: 700 }}>
              Mở hộp thư
            </button>
          </div>
          {stats.latestRfqs.length === 0 ? <div style={{ color: '#999' }}>Chưa có RFQ</div> : stats.latestRfqs.map(item => (
            <button
              key={item.id}
              type="button"
              aria-label={`Mở RFQ ${readTrimmedString(item.customerName) ?? item.id}`}
              onClick={() => openRfq(item.id)}
              style={{
                width: '100%',
                border: 0,
                borderTop: '1px solid #f0ede6',
                padding: '10px 0',
                fontSize: '0.9rem',
                textAlign: 'left',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <strong>{readTrimmedString(item.customerName) ?? 'Khách hàng'}</strong> · {readTrimmedString(item.customerPhone) ?? '—'}
              <div style={{ color: '#8a8178', fontSize: '0.78rem' }}>{readTrimmedString(item.status) ?? RFQ_STATUSES.NEW} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi') : ''}</div>
            </button>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3 style={{ marginTop: 0, color: '#9A7520' }}>Báo giá mới nhất</h3>
            <button type="button" onClick={() => navigate('/admin/quotes')} style={{ border: 0, background: 'none', color: '#7b5e18', cursor: 'pointer', fontWeight: 700 }}>
              Xem danh sách
            </button>
          </div>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Giá trị đã chấp nhận: {money(stats.acceptedValue)}</div>
          {stats.latestQuotes.length === 0 ? <div style={{ color: '#999' }}>Chưa có báo giá</div> : stats.latestQuotes.map(item => (
            <button
              key={item.id}
              type="button"
              aria-label={`Mở báo giá ${readTrimmedString(item.code) ?? item.id}`}
              onClick={() => openQuote(item.id)}
              style={{
                width: '100%',
                border: 0,
                borderTop: '1px solid #f0ede6',
                padding: '10px 0',
                fontSize: '0.9rem',
                textAlign: 'left',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <strong>{readTrimmedString(item.code) ?? 'Báo giá'}</strong> · {readTrimmedString(item.customerName) ?? '—'}
              <div style={{ color: '#8a8178', fontSize: '0.78rem' }}>{readTrimmedString(item.status) ?? QUOTE_STATUSES.DRAFT} · {money(Number(item.total ?? 0))}</div>
            </button>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
