'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scan,
  Search,
  XCircle,
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/services/api';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  QUEUED: { icon: Clock, color: 'text-yellow-600 border-yellow-200' },
  RUNNING: { icon: Play, color: 'text-blue-600 border-blue-200' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-600 border-green-200' },
  FAILED: { icon: AlertTriangle, color: 'text-red-600 border-red-200' },
  CANCELLED: { icon: Ban, color: 'text-gray-600 border-gray-200' },
};

export default function AdminScansPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const params: Record<string, any> = { page, limit: 20 };
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'scans', params],
    queryFn: () => adminApi.listScans(params),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminApi.cancelScan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scans'] });
      toast.success('Scan cancelled');
    },
    onError: () => toast.error('Failed to cancel scan'),
  });

  const scans = data?.data?.data || [];
  const meta = data?.data?.meta;

  function formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function formatDuration(sec?: number) {
    if (!sec) return '—';
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Scans</h1>
        <p className="text-muted-foreground">View and manage scans across all organizations</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="QUEUED">Queued</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Vulns</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan: any) => {
                  const cfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.QUEUED;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={scan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{scan.target?.value || '—'}</p>
                          <p className="text-xs text-muted-foreground">{scan.target?.type}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {scan.createdBy?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{scan.profile}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${cfg.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {scan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${scan.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{scan.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {scan.totalVulns ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(scan.duration)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {scan.startedAt ? formatDate(scan.startedAt) : formatDate(scan.createdAt)}
                      </TableCell>
                      <TableCell>
                        {['QUEUED', 'RUNNING'].includes(scan.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => cancelMutation.mutate(scan.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {scans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No scans found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
