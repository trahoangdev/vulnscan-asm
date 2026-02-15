'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Loader2,
  LogIn,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Key,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usersApi } from '@/services/api';

const ITEMS_PER_PAGE = 20;

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'auth.login': { label: 'Logged in', icon: LogIn, color: 'text-blue-500' },
  'auth.login_2fa': { label: 'Logged in (2FA)', icon: ShieldCheck, color: 'text-blue-500' },
  'auth.oauth_login': { label: 'OAuth login', icon: Globe, color: 'text-purple-500' },
  'auth.register': { label: 'Account created', icon: UserPlus, color: 'text-green-500' },
  'auth.2fa_enabled': { label: '2FA enabled', icon: ShieldCheck, color: 'text-green-600' },
  'auth.2fa_disabled': { label: '2FA disabled', icon: ShieldOff, color: 'text-red-500' },
  'user.password_changed': { label: 'Password changed', icon: Key, color: 'text-yellow-500' },
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-log', page],
    queryFn: () => usersApi.getActivityLog({ page, limit: ITEMS_PER_PAGE }),
  });

  const activities = data?.data?.data || [];
  const meta = data?.data?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          Your recent account activity and login history.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No activity yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Your account activity will appear here as you use the platform.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            {meta && (
              <CardDescription>{meta.total} total events</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activities.map((activity: any) => {
                const config = actionConfig[activity.action] || {
                  label: activity.action,
                  icon: Clock,
                  color: 'text-muted-foreground',
                };
                const Icon = config.icon;
                const details = activity.details || {};

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`flex-shrink-0 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{config.label}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {details.provider && (
                          <Badge variant="outline" className="text-[10px] h-4 capitalize">
                            {details.provider}
                          </Badge>
                        )}
                        {details.method && !details.provider && (
                          <span className="capitalize">{details.method.replace(/_/g, ' ')}</span>
                        )}
                        {activity.ipAddress && (
                          <span className="font-mono">{activity.ipAddress}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-xs text-muted-foreground">
                      <span title={new Date(activity.createdAt).toLocaleString()}>
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
