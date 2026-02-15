'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Target,
  Scan,
  ShieldAlert,
  FileText,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  User,
  HardDrive,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
  ShieldCheck,
  Radio,
  Users,
  Key,
  Webhook,
  History,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth';
import { ProtectedRoute } from '@/components/providers/protected-route';
import { notificationsApi } from '@/services/api';
import { useNotifications } from '@/hooks/useSocket';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Targets', href: '/dashboard/targets', icon: Target },
  { name: 'Scans', href: '/dashboard/scans', icon: Scan },
  { name: 'Assets', href: '/dashboard/assets', icon: HardDrive },
  { name: 'Vulnerabilities', href: '/dashboard/vulnerabilities', icon: ShieldAlert },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Activity', href: '/dashboard/activity', icon: History },
];

const bottomNav = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Persist collapsed state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // Fetch unread notification count from API
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch recent notifications for dropdown
  const { data: recentNotifsData, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.list({ limit: 5 }),
    refetchInterval: 60000,
  });

  // Real-time notifications via WebSocket
  const { unreadCount: socketUnread, setUnreadCount } = useNotifications();

  // Combine API count + socket increments
  const apiUnread = unreadData?.data?.count ?? 0;
  const totalUnread = apiUnread + socketUnread;

  const recentNotifications = recentNotifsData?.data?.data ?? [];
  const queryClient = useQueryClient();

  // Close notification dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const NOTIF_ICON: Record<string, React.ElementType> = {
    SCAN_COMPLETED: ShieldCheck,
    SCAN_FAILED: AlertTriangle,
    CRITICAL_VULN_FOUND: ShieldAlert,
    HIGH_VULN_FOUND: ShieldAlert,
    NEW_ASSET_DISCOVERED: Radio,
    CERT_EXPIRING: AlertTriangle,
    SYSTEM: Info,
  };

  const NOTIF_COLOR: Record<string, string> = {
    SCAN_COMPLETED: 'text-green-500',
    SCAN_FAILED: 'text-red-500',
    CRITICAL_VULN_FOUND: 'text-red-500',
    HIGH_VULN_FOUND: 'text-orange-500',
    NEW_ASSET_DISCOVERED: 'text-blue-500',
    CERT_EXPIRING: 'text-yellow-500',
    SYSTEM: 'text-gray-500',
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const NavItem = ({ item, active, onClick, isCollapsed }: {
    item: { name: string; href: string; icon: React.ElementType };
    active: boolean;
    onClick?: () => void;
    isCollapsed?: boolean;
  }) => {
    const link = (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isCollapsed ? 'justify-center' : ''
        } ${
          active
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center border-b transition-all duration-300 ${
        isCollapsed ? 'justify-center px-2 py-5' : 'gap-2 px-6 py-5'
      }`}>
        <Shield className="h-8 w-8 text-primary flex-shrink-0" />
        {!isCollapsed && <span className="text-lg font-bold">VulnScan</span>}
      </div>

      {/* Main Nav */}
      <nav className={`flex-1 py-4 space-y-1 transition-all duration-300 ${
        isCollapsed ? 'px-2' : 'px-3'
      }`}>
        {navigation.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            active={isActive(item.href)}
            onClick={() => setSidebarOpen(false)}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className={`py-4 border-t space-y-1 transition-all duration-300 ${
        isCollapsed ? 'px-2' : 'px-3'
      }`}>
        {bottomNav.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            active={isActive(item.href)}
            onClick={() => setSidebarOpen(false)}
            isCollapsed={isCollapsed}
          />
        ))}
        {/* Admin Panel link — visible only for ADMIN / SUPER_ADMIN */}
        {(user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN') && (
          isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href="/admin"
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Admin Panel
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <ShieldAlert className="h-5 w-5" />
              Admin Panel
            </Link>
          )
        )}

        {/* Collapse Toggle */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronsRight className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronsLeft className="h-5 w-5" />
            <span>Collapse</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex lg:flex-col lg:border-r transition-all duration-300 ease-in-out ${
            collapsed ? 'lg:w-[68px]' : 'lg:w-64'
          }`}
        >
          <SidebarContent isCollapsed={collapsed} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r z-50">
              <div className="absolute right-3 top-4">
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent isCollapsed={false} />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold lg:hidden">VulnScan</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Center Dropdown */}
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setUserMenuOpen(false);
                  }}
                >
                  <Bell className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </Button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Dropdown Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                      <h3 className="text-sm font-semibold">Notifications</h3>
                      {totalUnread > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification Items */}
                    <div className="max-h-80 overflow-y-auto">
                      {recentNotifications.length > 0 ? (
                        recentNotifications.map((notif: any) => {
                          const Icon = NOTIF_ICON[notif.type] || Info;
                          const color = NOTIF_COLOR[notif.type] || 'text-gray-500';
                          // Deep-link based on notification type
                          const getNotifLink = (n: any): string | null => {
                            const d = n.data || {};
                            if (n.type === 'SCAN_COMPLETED' || n.type === 'SCAN_FAILED') {
                              return d.scanId ? `/dashboard/scans/${d.scanId}` : '/dashboard/scans';
                            }
                            if (n.type === 'CRITICAL_VULN_FOUND' || n.type === 'HIGH_VULN_FOUND') {
                              return d.vulnId ? `/dashboard/vulnerabilities/${d.vulnId}` : '/dashboard/vulnerabilities';
                            }
                            if (n.type === 'NEW_ASSET_DISCOVERED') {
                              return d.assetId ? `/dashboard/assets/${d.assetId}` : '/dashboard/assets';
                            }
                            return null;
                          };
                          const notifLink = getNotifLink(notif);

                          const handleNotifClick = async () => {
                            // Mark individual as read
                            if (!notif.isRead) {
                              try {
                                await notificationsApi.markAsRead(notif.id);
                                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                                if (totalUnread > 0) setUnreadCount(Math.max(0, socketUnread - 1));
                              } catch { /* ignore */ }
                            }
                            // Navigate to deep link
                            if (notifLink) {
                              setNotifOpen(false);
                              router.push(notifLink);
                            }
                          };

                          return (
                            <div
                              key={notif.id}
                              onClick={handleNotifClick}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && handleNotifClick()}
                              className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-0 cursor-pointer ${
                                !notif.isRead ? 'bg-primary/5' : ''
                              }`}
                            >
                              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${color}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-tight ${!notif.isRead ? 'font-semibold' : 'font-medium'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">
                                  {formatTimeAgo(notif.createdAt)}
                                </p>
                              </div>
                              {!notif.isRead && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">No notifications yet</p>
                        </div>
                      )}
                    </div>

                    {/* Dropdown Footer */}
                    <div className="border-t px-4 py-2.5 bg-muted/30">
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
                      >
                        View all notifications
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-50 py-1">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
