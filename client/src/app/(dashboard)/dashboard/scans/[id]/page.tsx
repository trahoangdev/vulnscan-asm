'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  StopCircle,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { scansApi } from '@/services/api';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  QUEUED: { label: 'Queued', className: 'bg-gray-100 text-gray-700', icon: Clock },
  RUNNING: { label: 'Running', className: 'bg-blue-100 text-blue-700', icon: Loader2 },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', className: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
};

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-400',
};

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const scanId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => scansApi.getById(scanId),
    refetchInterval: (query) => {
      const scan = query.state.data?.data?.data;
      return scan?.status === 'RUNNING' || scan?.status === 'QUEUED' ? 5000 : false;
    },
  });

  const { data: findingsData } = useQuery({
    queryKey: ['scan-findings', scanId],
    queryFn: () => scansApi.getFindings(scanId),
    enabled: !!data,
  });

  const cancelMutation = useMutation({
    mutationFn: () => scansApi.cancel(scanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      toast.success('Scan cancelled');
    },
    onError: () => toast.error('Failed to cancel scan'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const scan = data?.data?.data;
  if (!scan) {
    return <div className="text-center py-12 text-muted-foreground">Scan not found</div>;
  }

  const st = statusConfig[scan.status] || statusConfig.QUEUED;
  const StatusIcon = st.icon;
  const findings = findingsData?.data?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Scan: {scan.target?.value || 'Unknown'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${st.className}`}>
              <StatusIcon className={`h-3 w-3 ${scan.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              {st.label}
            </span>
            <span className="text-sm text-muted-foreground">
              {scan.profile} &middot; {new Date(scan.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        {(scan.status === 'RUNNING' || scan.status === 'QUEUED') && (
          <Button variant="destructive" size="sm" onClick={() => cancelMutation.mutate()}>
            <StopCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>

      {/* Progress */}
      {scan.status === 'RUNNING' && scan.progress != null && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Scan Progress</span>
              <span className="text-sm text-muted-foreground">{scan.progress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${scan.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {scan.status === 'COMPLETED' && (
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(severityColors).map(([severity, color]) => {
            const count = findings.filter((f: any) => f.severity === severity).length;
            return (
              <Card key={severity}>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${color}`} />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{severity.toLowerCase()}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Findings */}
      <Card>
        <CardHeader>
          <CardTitle>Findings ({findings.length})</CardTitle>
          <CardDescription>Vulnerability findings from this scan</CardDescription>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {scan.status === 'COMPLETED'
                  ? 'No vulnerabilities found — looking good!'
                  : 'Findings will appear here once the scan completes'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {findings.map((finding: any) => {
                const sevColor = severityColors[finding.severity] || 'bg-gray-400';
                return (
                  <div
                    key={finding.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${sevColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{finding.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {finding.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{finding.severity}</span>
                        {finding.cveId && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {finding.cveId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
