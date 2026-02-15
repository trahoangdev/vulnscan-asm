'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScrollText,
  Search,
  Filter,
  User,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/services/api';

const ACTION_COLORS: Record<string, string> = {
  'user.update': 'bg-blue-100 text-blue-700',
  'user.delete': 'bg-red-100 text-red-700',
  'user.reset_password': 'bg-orange-100 text-orange-700',
  'org.update': 'bg-purple-100 text-purple-700',
  'org.delete': 'bg-red-100 text-red-700',
  'settings.update': 'bg-green-100 text-green-700',
  'settings.batch_update': 'bg-green-100 text-green-700',
  'scan.cancel': 'bg-yellow-100 text-yellow-700',
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const params: Record<string, any> = { page, limit: 30 };
  if (actionFilter !== 'all') params.action = actionFilter;
  if (entityFilter !== 'all') params.entity = entityFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => adminApi.listAuditLogs(params),
  });

  const logs = data?.data?.data || [];
  const meta = data?.data?.meta;

  function formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatAction(action: string) {
    return action.replace('.', ' → ').replace(/_/g, ' ');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">Track all administrative actions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
                <SelectItem value="scan">Scan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="update">Updates</SelectItem>
                <SelectItem value="delete">Deletes</SelectItem>
                <SelectItem value="reset_password">Password Resets</SelectItem>
                <SelectItem value="cancel">Cancellations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Timeline */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log: any) => (
                <div key={log.id} className="px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className="mt-1 h-3 w-3 rounded-full bg-muted-foreground/30 ring-4 ring-background flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                          {formatAction(log.action)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.entity}
                        </Badge>
                        {log.entityId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.entityId.slice(0, 12)}...
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      {log.details && (
                        <div className="mt-1.5 text-xs text-muted-foreground bg-muted rounded p-2 max-w-2xl overflow-x-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                      {log.user && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground justify-end">
                          <User className="h-3 w-3" />
                          {log.user.name}
                        </div>
                      )}
                      {log.ipAddress && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{log.ipAddress}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
