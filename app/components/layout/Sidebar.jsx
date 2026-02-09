'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge,
  faInbox,
  faUsers,
  faChartLine,
  faTowerBroadcast,
  faBolt,
  faFileLines,
  faChartBar,
  faUserGroup,
  faGear,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../auth/AuthProvider.jsx';
import { filterMenuItems } from '../../../lib/access.js';

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onClose }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems = [
    { name: 'Dashboard', icon: faGauge, path: '/dashboard' },
    { name: 'Inbox', icon: faInbox, path: '/inbox', badge: '12' },
    { name: 'Contacts', icon: faUsers, path: '/contacts' },
    { name: 'Leads', icon: faChartLine, path: '/leads' },
    // { name: 'Broadcast', icon: faTowerBroadcast, path: '/broadcast' },
    // { name: 'Automation', icon: faBolt, path: '/automation' },
    // { name: 'Templates', icon: faFileLines, path: '/templates' },
    { name: 'Reports', icon: faChartBar, path: '/reports' },
    // { name: 'Team', icon: faUserGroup, path: '/team' },
    { name: 'Admins', icon: faUserGroup, path: '/admins', roles: ['super_admin'] },
    { name: 'Settings', icon: faGear, path: '/settings' },
  ];
  const visibleItems = filterMenuItems(user?.admin_tier, menuItems);

  const widthClass = collapsed ? 'w-64 lg:w-20' : 'w-64';
  const translateClass = mobileOpen ? 'translate-x-0' : '-translate-x-full';
  const showLabels = !collapsed || mobileOpen;

  return (
    <aside 
      className={`${widthClass} ${translateClass} lg:translate-x-0 bg-aa-dark-blue h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-200 ease-out`}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        {showLabels && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-aa-orange rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-white font-bold text-xl">AlgoAura</span>
          </div>
        )}
        {mobileOpen && (
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 lg:hidden"
            aria-label="Close sidebar"
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 20 }} />
          </button>
        )}
        <button 
          onClick={onToggleCollapse}
          className="text-white/70 hover:text-white p-1 hidden lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-testid="sidebar-toggle"
        >
          {collapsed ? (
            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 20 }} />
          ) : (
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 20 }} />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-6 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.path;
          const compact = collapsed && !mobileOpen;
          
          return (
            <Link 
              key={item.path}
              href={item.path}
              onClick={mobileOpen ? onClose : undefined}
              data-testid={`sidebar-${item.name.toLowerCase()}`}
            >
              <div
                className={`mx-3 mb-2 flex items-center ${compact ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-lg cursor-pointer ${
                  isActive 
                    ? 'bg-aa-orange text-white' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} style={{ fontSize: 20 }} />
                {showLabels && (
                  <>
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
