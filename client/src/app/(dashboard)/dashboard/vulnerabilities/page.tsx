'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Loader2,
  LayoutList,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { vulnerabilitiesApi } from '@/services/api';

const ITEMS_PER_PAGE = 20;

const severityConfig: Record<string, { className: string; dotColor: string; badge: string }> = {
  CRITICAL: { className: 'bg-red-100 text-red-700', dotColor: 'bg-red-500', badge: 'destructive' },
  HIGH: { className: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-500', badge: 'default' },
  MEDIUM: { className: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-500', badge: 'secondary' },
  LOW: { className: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-500', badge: 'outline' },
  INFO: { className: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400', badge: 'outline' },
};

const statusLabels: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  CONFIRMED: 'Confirmed',
  FALSE_POSITIVE: 'False Positive',
  ACCEPTED: 'Accepted',
  FIXED: 'Fixed',
};

type GroupBy = 'none' | 'severity' | 'category' | 'asset';

export default function VulnerabilitiesPage() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const { data, isLoading } = useQuery({
    queryKey: ['vulnerabilities', search, severity, status, category, page],
    queryFn: () =>
      vulnerabilitiesApi.list({
        search: search || undefined,
        severity: severity !== 'all' ? severity : undefined,
        status: status !== 'all' ? status : undefined,
        category: category !== 'all' ? category : undefined,
        page,
        limit: ITEMS_PER_PAGE,
      }),
  });

  const vulns = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Extract unique categories from results for filter
  const categories = [...new Set(vulns.map((v: any) => v.category).filter(Boolean))] as string[];

  // Group vulnerabilities
  const groupedVulns = (() => {
    if (groupBy === 'none') return null;
    const groups: Record<string, any[]> = {};
    vulns.forEach((vuln: any) => {
      let key = 'Uncategorized';
      if (groupBy === 'severity') key = vuln.severity || 'UNKNOWN';
      else if (groupBy === 'category') key = vuln.category || 'Uncategorized';
      else if (groupBy === 'asset') key = vuln.asset?.value || 'No Asset';
      if (!groups[key]) groups[key] = [];
      groups[key].push(vuln);
    });
    // Sort groups by severity order if grouping by severity
    if (groupBy === 'severity') {
      const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO', 'UNKNOWN'];
      return Object.fromEntries(
        Object.entries(groups).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)),
      );
    }
    return groups;
  })();

  const handleFilterChange = () => setPage(1);

  const VulnRow = ({ vuln }: { vuln: any }) => {
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
                  {vuln.category && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {vuln.category}
                    </Badge>
                  )}
                  {vuln.asset?.value && (
                    <span className="text-xs text-muted-foreground font-mono">
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vulnerabilities</h1>
          <p className="text-muted-foreground">
            View and manage discovered vulnerability findings.
          </p>
        </div>
        {total > 0 && (
          <Badge variant="secondary" className="text-sm">
            {total} total
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vulnerabilities..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handleFilterChange();
            }}
            className="pl-10"
          />
        </div>
        <Select value={severity} onValueChange={(v) => { setSeverity(v); handleFilterChange(); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); handleFilterChange(); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="FIXED">Fixed</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={category} onValueChange={(v) => { setCategory(v); handleFilterChange(); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: string) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="flex items-center gap-2"><LayoutList className="h-3.5 w-3.5" /> No Grouping</span>
            </SelectItem>
            <SelectItem value="severity">
              <span className="flex items-center gap-2"><FolderOpen className="h-3.5 w-3.5" /> By Severity</span>
            </SelectItem>
            <SelectItem value="category">
              <span className="flex items-center gap-2"><FolderOpen className="h-3.5 w-3.5" /> By Category</span>
            </SelectItem>
            <SelectItem value="asset">
              <span className="flex items-center gap-2"><FolderOpen className="h-3.5 w-3.5" /> By Asset</span>
            </SelectItem>
          </SelectContent>
        </Select>
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
              {search || severity !== 'all' || status !== 'all' || category !== 'all'
                ? 'Try adjusting your filters'
                : 'Run a scan to discover vulnerabilities'}
            </p>
          </CardContent>
        </Card>
      ) : groupBy !== 'none' && groupedVulns ? (
        // Grouped view
        <div className="space-y-6">
          {Object.entries(groupedVulns).map(([group, items]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {group}
                </h3>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="grid gap-2">
                {items.map((vuln: any) => (
                  <VulnRow key={vuln.id} vuln={vuln} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat list view
        <div className="grid gap-3">
          {vulns.map((vuln: any) => (
            <VulnRow key={vuln.id} vuln={vuln} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size="sm"
                    className="w-9"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
