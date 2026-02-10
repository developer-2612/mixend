'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faBell,
  faWifi,
  faBan,
  faBars,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../auth/AuthProvider.jsx';

const WHATSAPP_API_BASE =
  process.env.NEXT_PUBLIC_WHATSAPP_API_BASE || 'http://localhost:3001';
const WHATSAPP_SOCKET_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_SOCKET_URL || WHATSAPP_API_BASE;

export default function Navbar({ onMenuClick }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  useEffect(() => {
    let isMounted = true;
    if (!user?.id) {
      setWhatsappConnected(false);
      return () => {
        isMounted = false;
      };
    }

    const deriveConnected = (payload) => {
      const status = payload?.status || 'idle';
      const isCurrentAdmin =
        payload?.activeAdminId && user?.id && payload.activeAdminId === user.id;
      return status === 'connected' && isCurrentAdmin;
    };

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `${WHATSAPP_API_BASE}/whatsapp/status?adminId=${user.id}`
        );
        if (!response.ok) throw new Error('status');
        const payload = await response.json();
        if (!isMounted) return;
        setWhatsappConnected(deriveConnected(payload));
      } catch (error) {
        if (isMounted) setWhatsappConnected(false);
      }
    };

    fetchStatus();

    const socket = io(WHATSAPP_SOCKET_URL, {
      query: { adminId: user.id },
    });

    socket.on('whatsapp:status', (payload) => {
      setWhatsappConnected(deriveConnected(payload));
    });

    socket.on('connect_error', () => {
      setWhatsappConnected(false);
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, [user?.id]);

  return (
    <nav className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6" data-testid="navbar">
      {/* Left: Menu + Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          data-testid="sidebar-open-btn"
        >
          <FontAwesomeIcon icon={faBars} className="text-aa-gray" style={{ fontSize: 22 }} />
        </button>
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-aa-gray"
              style={{ fontSize: 18 }}
            />
            <input
              type="text"
              placeholder="Search contacts, leads, messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
              data-testid="navbar-search"
            />
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3 sm:gap-4 ml-4">
        {/* WhatsApp Status */}
        <div 
          className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg ${
            whatsappConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
          data-testid="whatsapp-status"
        >
          {whatsappConnected ? (
            <FontAwesomeIcon icon={faWifi} style={{ fontSize: 16 }} />
          ) : (
            <FontAwesomeIcon icon={faBan} style={{ fontSize: 16 }} />
          )}
          <span className="text-sm font-semibold">
            {whatsappConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg" data-testid="notification-btn">
          <FontAwesomeIcon icon={faBell} className="text-aa-gray" style={{ fontSize: 22 }} />
          {notifications > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-aa-orange text-white text-xs flex items-center justify-center rounded-full">
              {notifications}
            </span>
          )}
        </button>

        {user && (
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-aa-dark-blue">{user.name}</p>
              <p className="text-xs text-aa-gray">
                {user.admin_tier === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
              aria-label="Logout"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="text-aa-gray" style={{ fontSize: 18 }} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
