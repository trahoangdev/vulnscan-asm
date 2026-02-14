'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  FileCode,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

const moduleLabels: Record<string, string> = {
  dns_enumerator: 'DNS Enumerator',
  port_scanner: 'Port Scanner',
  ssl_analyzer: 'SSL Analyzer',
  web_crawler: 'Web Crawler',
  tech_detector: 'Tech Detector',
  vuln_checker: 'Vulnerability Checker',
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

  const { data: resultsData } = useQuery({
    queryKey: ['scan-results', scanId],
    queryFn: () => scansApi.getResults(scanId),
    enabled: !!data?.data?.data && data.data.data.status === 'COMPLETED',
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
  const findings = findingsData?.data?.data || [];
  const results = resultsData?.data?.data || [];

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
        <div className="grid gap-4 md:grid-cols-5">
          {Object.entries(severityColors).map(([sev, color]) => {
            const count = findings.filter((f: any) => f.severity === sev).length;
            return (
              <Card key={sev}>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${color}`} />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{sev.toLowerCase()}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs: Findings & Results */}
      <Tabs defaultValue="findings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="findings" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Findings ({findings.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <Terminal className="h-4 w-4" />
            Module Results ({results.length})
          </TabsTrigger>
        </TabsList>

        {/* Findings Tab */}
        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <CardTitle>Vulnerability Findings</CardTitle>
              <CardDescription>Click a finding to view full details and manage status</CardDescription>
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
                <div className="space-y-1">
                  {findings.map((finding: any) => {
                    const sevColor = severityColors[finding.severity] || 'bg-gray-400';
                    return (
                      <Link
                        key={finding.id}
                        href={`/dashboard/vulnerabilities/${finding.id}`}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${sevColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">
                            {finding.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {finding.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {finding.severity}
                            </Badge>
                            {finding.cveId && (
                              <span className="text-xs font-mono text-muted-foreground">
                                {finding.cveId}
                              </span>
                            )}
                            {finding.category && (
                              <span className="text-xs text-muted-foreground">
                                {finding.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileCode className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="font-medium text-muted-foreground">No module results available</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {scan.status === 'COMPLETED'
                    ? 'Raw results were not recorded for this scan'
                    : 'Results will appear once the scan completes'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((result: any) => (
                <Card key={result.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        {moduleLabels[result.module] || result.module}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {result.status && (
                          <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
                            {result.status}
                          </Badge>
                        )}
                        {result.duration && (
                          <span className="text-xs text-muted-foreground">
                            {(result.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.rawOutput ? (
                      <pre className="text-xs bg-muted/70 p-4 rounded-lg overflow-x-auto max-h-96 whitespace-pre-wrap font-mono">
                        {typeof result.rawOutput === 'string'
                          ? result.rawOutput
                          : JSON.stringify(result.rawOutput, null, 2)}
                      </pre>
                    ) : result.data ? (
                      <pre className="text-xs bg-muted/70 p-4 rounded-lg overflow-x-auto max-h-96 whitespace-pre-wrap font-mono">
                        {typeof result.data === 'string'
                          ? result.data
                          : JSON.stringify(result.data, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">No output data available</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
