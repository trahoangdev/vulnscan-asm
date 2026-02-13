'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Target,
  Scan,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/services/api';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  INFO: '#9ca3af',
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-400',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle2,
  RUNNING: PlayCircle,
  FAILED: XCircle,
  QUEUED: Clock,
  PENDING: Clock,
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'text-green-500',
  RUNNING: 'text-blue-500',
  FAILED: 'text-red-500',
  QUEUED: 'text-yellow-500',
  PENDING: 'text-gray-400',
};

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const stats = data?.data?.data;

  // Compute security score based on vulnerability severity distribution
  const computeScore = () => {
    if (!stats) return 'N/A';
    const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0 } = stats.vulnerabilities.bySeverity;
    const total = CRITICAL + HIGH + MEDIUM + LOW;
    if (total === 0) return 100;
    const deductions = CRITICAL * 25 + HIGH * 10 + MEDIUM * 3 + LOW * 1;
    return Math.max(0, Math.round(100 - Math.min(deductions, 100)));
  };

  // Pie chart data
  const severityPieData = stats
    ? Object.entries(stats.vulnerabilities.bySeverity as Record<string, number>)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const totalVulns = stats?.vulnerabilities.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your security posture and attack surface.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/targets">
            <Button variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Add Target
            </Button>
          </Link>
          <Link href="/dashboard/scans">
            <Button>
              <Scan className="h-4 w-4 mr-2" />
              New Scan
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="flex items-center justify-center py-8 text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Failed to load dashboard data
          </CardContent>
        </Card>
      )}

      {stats && (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/targets">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Targets
                  </CardTitle>
                  <Target className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.targets.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.targets.byStatus?.VERIFIED ?? 0} verified
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/scans">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Scans
                  </CardTitle>
                  <Scan className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.scans.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.scans.recent.filter((s: any) => s.status === 'RUNNING').length} running
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/vulnerabilities">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Vulnerabilities
                  </CardTitle>
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalVulns}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-red-500 font-medium">
                      {stats.vulnerabilities.bySeverity.CRITICAL ?? 0}
                    </span>{' '}
                    critical,{' '}
                    <span className="text-orange-500 font-medium">
                      {stats.vulnerabilities.bySeverity.HIGH ?? 0}
                    </span>{' '}
                    high
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Security Score
                </CardTitle>
                <Activity className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{computeScore()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.assets.total} assets discovered
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Vulnerability Breakdown with Donut Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Breakdown</CardTitle>
                <CardDescription>Distribution by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {totalVulns > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="w-40 h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={severityPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {severityPieData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={SEVERITY_COLORS[entry.name] || '#9ca3af'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [value, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((severity) => {
                        const count = stats.vulnerabilities.bySeverity[severity] ?? 0;
                        const pct = totalVulns > 0 ? Math.round((count / totalVulns) * 100) : 0;
                        return (
                          <div key={severity} className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${SEVERITY_BG[severity]}`} />
                            <span className="text-sm font-medium capitalize flex-1">
                              {severity.toLowerCase()}
                            </span>
                            <span className="text-sm font-semibold">{count}</span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${SEVERITY_BG[severity]} rounded-full transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <h3 className="font-medium text-muted-foreground">No vulnerabilities found</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Run a scan to discover vulnerabilities
                    </p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <Link href="/dashboard/vulnerabilities">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all vulnerabilities
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Scans */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
                <CardDescription>Latest scan activity</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.scans.recent.length > 0 ? (
                  <div className="space-y-3">
                    {stats.scans.recent.map((scan: any) => {
                      const Icon = STATUS_ICON[scan.status] || Clock;
                      const color = STATUS_COLOR[scan.status] || 'text-gray-400';
                      return (
                        <Link
                          key={scan.id}
                          href={`/dashboard/scans`}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{scan.target}</p>
                            <p className="text-xs text-muted-foreground">
                              {scan.profile} · {scan.status.toLowerCase()}
                              {scan.status === 'RUNNING' && ` · ${scan.progress}%`}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {new Date(scan.createdAt).toLocaleDateString()}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <h3 className="font-medium text-muted-foreground">No scans yet</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                      Add a target and start your first scan
                    </p>
                    <Link href="/dashboard/scans">
                      <Button size="sm">
                        <Scan className="h-4 w-4 mr-2" />
                        Start a scan
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Bar Chart + Trend Line */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Vulnerability Categories</CardTitle>
                <CardDescription>Most common finding types</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.vulnerabilities.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={stats.vulnerabilities.byCategory.map((c: any) => ({
                        name: c.category.replace(/_/g, ' '),
                        count: c.count,
                      }))}
                      layout="vertical"
                      margin={{ left: 10, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <h3 className="font-medium text-muted-foreground">No data yet</h3>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 30-Day Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Findings Trend</CardTitle>
                <CardDescription>New findings per day (last 30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                {Array.isArray(stats.vulnerabilities.trend) && stats.vulnerabilities.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                      data={(stats.vulnerabilities.trend as any[]).map((d: any) => ({
                        date: new Date(d.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }),
                        count: d.count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <h3 className="font-medium text-muted-foreground">No trend data yet</h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Findings will appear here after scans complete
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
