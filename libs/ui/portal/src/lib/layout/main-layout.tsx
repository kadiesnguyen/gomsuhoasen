import { type LucideIcon, LayoutDashboard, Settings, Package, ScrollText, Users, ClipboardList, LogOut, FolderOpen } from 'lucide-react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Sản phẩm', icon: Package },
  { to: '/admin/rfq', label: 'Yêu cầu báo giá', icon: ClipboardList },
  { to: '/admin/quotes', label: 'Báo giá', icon: ScrollText },
  { to: '/admin/artisans', label: 'Nghệ nhân', icon: Users },
  { to: '/admin/files', label: 'Thư viện tệp', icon: FolderOpen },
  { to: '/admin/showroom-v2-content', label: 'Nội dung website', icon: LayoutDashboard },
  { to: '/admin/audit', label: 'Nhật ký hệ thống', icon: ScrollText },
  { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

export function MainLayout() {
  const { state, dispatch } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/admin/login');
  };

  return (
    <div className="ghs-shell">
      <aside className="ghs-sidebar">
        <div className="ghs-brand">
          <div className="ghs-brand-main">Gốm Hoa Sen</div>
          <div className="ghs-brand-sub">Portal quản trị</div>
        </div>
        <nav className="ghs-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/'}
                className={({ isActive }) => `ghs-nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="ghs-sidebar-footer">
          <div className="ghs-sidebar-user">
            <div>{state.user?.fullName}</div>
            <div>{state.user?.email}</div>
          </div>
          <button type="button" onClick={handleLogout} className="ghs-logout-btn">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LogOut size={14} />
              Đăng xuất
            </span>
          </button>
        </div>
      </aside>

      <section className="ghs-main">
        <header className="ghs-header">
          <div className="ghs-header-left">Quản trị showroom</div>
          <div className="ghs-role-badge">{state.user?.role}</div>
        </header>
        <main className="ghs-content">
          <div className="ghs-content-frame">
            <Outlet />
          </div>
        </main>
      </section>
    </div>
  );
}
