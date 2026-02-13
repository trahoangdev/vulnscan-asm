'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Target,
  Scan,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StatCard {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color: string;
  href: string;
}

const placeholderStats: StatCard[] = [
  {
    title: 'Total Targets',
    value: 0,
    description: 'Active targets monitored',
    icon: Target,
    color: 'text-blue-500',
    href: '/dashboard/targets',
  },
  {
    title: 'Active Scans',
    value: 0,
    description: 'Currently running',
    icon: Scan,
    color: 'text-green-500',
    href: '/dashboard/scans',
  },
  {
    title: 'Vulnerabilities',
    value: 0,
    description: 'Open findings',
    icon: ShieldAlert,
    color: 'text-red-500',
    href: '/dashboard/vulnerabilities',
  },
  {
    title: 'Security Score',
    value: 'N/A',
    description: 'Overall health',
    icon: Activity,
    color: 'text-purple-500',
    href: '/dashboard',
  },
];

const severityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-400',
};

export default function DashboardPage() {
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {placeholderStats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vulnerability Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Vulnerability Breakdown</CardTitle>
            <CardDescription>Distribution by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(severityColors).map(([severity, color]) => (
                <div key={severity} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${color}`} />
                  <span className="text-sm font-medium capitalize flex-1">{severity}</span>
                  <span className="text-sm text-muted-foreground">0</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: '0%' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
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
          </CardContent>
        </Card>
      </div>

      {/* Top Vulnerable Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Top Vulnerable Assets</CardTitle>
          <CardDescription>
            Assets with the highest risk based on vulnerability findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No assets discovered yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Run a scan to discover assets on your targets
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
