'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  ShieldAlert,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { vulnerabilitiesApi } from '@/services/api';

const severityConfig: Record<string, { className: string; dotColor: string }> = {
  CRITICAL: { className: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
  HIGH: { className: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-500' },
  MEDIUM: { className: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-500' },
  LOW: { className: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-500' },
  INFO: { className: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
};

const statusLabels: Record<string, string> = {
  OPEN: 'Open',
  CONFIRMED: 'Confirmed',
  FALSE_POSITIVE: 'False Positive',
  ACCEPTED: 'Accepted',
  FIXED: 'Fixed',
};

export default function VulnerabilitiesPage() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vulnerabilities', search, severity, status],
    queryFn: () =>
      vulnerabilitiesApi.list({
        search,
        severity: severity || undefined,
        status: status || undefined,
        page: 1,
        limit: 50,
      }),
  });

  const vulns = data?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vulnerabilities</h1>
        <p className="text-muted-foreground">
          View and manage discovered vulnerability findings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vulnerabilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="FALSE_POSITIVE">False Positive</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="FIXED">Fixed</option>
        </select>
      </div>

      {/* Vulnerabilities List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : vulns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No vulnerabilities found</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || severity || status
                ? 'Try adjusting your filters'
                : 'Run a scan to discover vulnerabilities'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {vulns.map((vuln: any) => {
            const sev = severityConfig[vuln.severity] || severityConfig.INFO;
            return (
              <Link key={vuln.id} href={`/dashboard/vulnerabilities/${vuln.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`h-3 w-3 rounded-full shrink-0 ${sev.dotColor}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{vuln.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sev.className}`}>
                            {vuln.severity}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {statusLabels[vuln.status] || vuln.status}
                          </span>
                          {vuln.asset?.value && (
                            <span className="text-xs text-muted-foreground">
                              {vuln.asset.value}
                            </span>
                          )}
                          {vuln.cveId && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {vuln.cveId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
