'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Building2,
  Target,
  Scan,
  ShieldAlert,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi } from '@/services/api';

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-yellow-500',
  RUNNING: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  CANCELLED: 'bg-gray-500',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-400',
};

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
  });

  const stats = data?.data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const overviewCards = [
    { label: 'Total Users', value: stats.overview.totalUsers, icon: Users, color: 'text-blue-500', sub: `${stats.overview.activeUsers} active` },
    { label: 'Organizations', value: stats.overview.totalOrgs, icon: Building2, color: 'text-purple-500' },
    { label: 'Targets', value: stats.overview.totalTargets, icon: Target, color: 'text-green-500' },
    { label: 'Total Scans', value: stats.overview.totalScans, icon: Scan, color: 'text-orange-500' },
    { label: 'Vulnerabilities', value: stats.overview.totalVulns, icon: ShieldAlert, color: 'text-red-500' },
    { label: 'Inactive Users', value: stats.overview.inactiveUsers, icon: Users, color: 'text-gray-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">System-wide statistics and monitoring</p>
        </div>
        <Badge variant="outline" className="text-red-500 border-red-200">
          <Activity className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {overviewCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value.toLocaleString()}</p>
                  {card.sub && (
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  )}
                </div>
                <div className={`h-12 w-12 rounded-xl bg-muted flex items-center justify-center ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scans by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scans by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.scansByStatus.map((s: any) => {
                const total = stats.overview.totalScans || 1;
                const pct = Math.round((s.count / total) * 100);
                return (
                  <div key={s.status} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-400'}`} />
                    <span className="text-sm flex-1">{s.status}</span>
                    <span className="text-sm font-medium">{s.count}</span>
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Vulnerabilities by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vulnerabilities by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.vulnsBySeverity.map((v: any) => {
                const total = stats.overview.totalVulns || 1;
                const pct = Math.round((v.count / total) * 100);
                return (
                  <div key={v.severity} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${SEVERITY_COLORS[v.severity] || 'bg-gray-400'}`} />
                    <span className="text-sm flex-1">{v.severity}</span>
                    <span className="text-sm font-medium">{v.count}</span>
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${SEVERITY_COLORS[v.severity] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
              {stats.vulnsBySeverity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No vulnerabilities found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topOrgs.map((org: any) => (
                <div key={org.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {org.memberCount} members · {org.targetCount} targets
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">{org.plan}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{org.scansUsed} scans</p>
                  </div>
                </div>
              ))}
              {stats.topOrgs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No organizations yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentScans.map((scan: any) => (
                <div key={scan.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{scan.target}</p>
                    <p className="text-xs text-muted-foreground">by {scan.createdBy}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        scan.status === 'COMPLETED'
                          ? 'text-green-600 border-green-200'
                          : scan.status === 'FAILED'
                          ? 'text-red-600 border-red-200'
                          : scan.status === 'RUNNING'
                          ? 'text-blue-600 border-blue-200'
                          : 'text-yellow-600 border-yellow-200'
                      }`}
                    >
                      {scan.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {stats.recentScans.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No scans yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              User Signups (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.userGrowth.length > 0 ? (
              <div className="flex items-end gap-1 h-32">
                {stats.userGrowth.map((d: any, i: number) => {
                  const maxCount = Math.max(...stats.userGrowth.map((x: any) => x.count), 1);
                  const height = Math.max((d.count / maxCount) * 100, 4);
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {d.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No signups in the last 30 days</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
