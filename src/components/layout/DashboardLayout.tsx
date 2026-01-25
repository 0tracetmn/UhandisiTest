import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { useUnreadAnnouncements } from '../../hooks/useUnreadAnnouncements';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import {
  Home,
  Calendar,
  BookOpen,
  MessageCircle,
  FileText,
  CreditCard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Briefcase,
  Clock,
} from 'lucide-react';
import { UserRole } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { unreadCount } = useUnreadMessages();
  const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();
  const unreadNotificationsCount = useUnreadNotifications();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <Home className="w-5 h-5" />,
      roles: ['admin', 'tutor', 'student'],
    },
    {
      label: 'Book a Class',
      path: '/dashboard/book-class',
      icon: <Calendar className="w-5 h-5" />,
      roles: ['student'],
    },
    {
      label: 'Bookings',
      path: '/dashboard/bookings',
      icon: <Calendar className="w-5 h-5" />,
      roles: ['admin', 'tutor', 'student'],
    },
    {
      label: 'My Availability',
      path: '/dashboard/availability',
      icon: <Clock className="w-5 h-5" />,
      roles: ['tutor'],
    },
    {
      label: 'Materials',
      path: '/dashboard/materials',
      icon: <BookOpen className="w-5 h-5" />,
      roles: ['admin', 'tutor', 'student'],
    },
    {
      label: 'Chat',
      path: '/dashboard/chat',
      icon: <MessageCircle className="w-5 h-5" />,
      roles: ['admin', 'tutor', 'student'],
    },
    {
      label: 'Announcements',
      path: '/dashboard/announcements',
      icon: <Bell className="w-5 h-5" />,
      roles: ['admin', 'tutor', 'student'],
    },
    {
      label: 'Payments',
      path: '/dashboard/payments',
      icon: <CreditCard className="w-5 h-5" />,
      roles: ['admin', 'student'],
    },
    {
      label: 'Invoices',
      path: '/dashboard/invoices',
      icon: <FileText className="w-5 h-5" />,
      roles: ['admin', 'student'],
    },
    {
      label: 'Users',
      path: '/dashboard/users',
      icon: <Users className="w-5 h-5" />,
      roles: ['admin'],
    },
    {
      label: 'Tutors',
      path: '/dashboard/tutors',
      icon: <Users className="w-5 h-5" />,
      roles: ['admin'],
    },
    {
      label: 'Services',
      path: '/dashboard/services',
      icon: <Briefcase className="w-5 h-5" />,
      roles: ['admin'],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role as UserRole)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden text-slate-600 hover:text-slate-900"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="flex items-center gap-3">
                <img
                  src="/63c6bf0a-3055-4ef7-9344-7ee7e8b608c7.jpg"
                  alt="Uhandisi Tutors"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-slate-900">Uhandisi Tutors</h1>
                  <p className="text-xs text-slate-600">GET/FET Physics & Mathematics</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-600 capitalize">{user?.role}</p>
                </div>
                {user?.profileImage && (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside
          className={`fixed lg:sticky top-16 left-0 z-20 h-[calc(100vh-4rem)] bg-white shadow-lg lg:shadow-none border-r border-slate-200 transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } w-64`}
        >
          <nav className="p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isChatItem = item.path === '/dashboard/chat';
              const isAnnouncementsItem = item.path === '/dashboard/announcements';
              const isBookingsItem = item.path === '/dashboard/bookings';
              const showChatBadge = isChatItem && unreadCount > 0;
              const showAnnouncementsBadge = isAnnouncementsItem && unreadAnnouncementsCount > 0 && user?.role === 'student';
              const showNotificationsBadge = isBookingsItem && unreadNotificationsCount > 0 && user?.role === 'student';

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="relative">
                    {item.icon}
                    {showChatBadge && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {showAnnouncementsBadge && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadAnnouncementsCount > 9 ? '9+' : unreadAnnouncementsCount}
                      </span>
                    )}
                    {showNotificationsBadge && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )}
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              to="/dashboard/settings"
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === '/dashboard/settings'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </aside>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
