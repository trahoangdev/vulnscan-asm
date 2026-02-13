'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { vulnerabilitiesApi } from '@/services/api';
import toast from 'react-hot-toast';

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

export default function VulnerabilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const vulnId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['vulnerability', vulnId],
    queryFn: () => vulnerabilitiesApi.getById(vulnId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => vulnerabilitiesApi.updateStatus(vulnId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vulnerability', vulnId] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const vuln = data?.data?.data;
  if (!vuln) {
    return <div className="text-center py-12 text-muted-foreground">Vulnerability not found</div>;
  }

  const sev = severityConfig[vuln.severity] || severityConfig.INFO;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-3 w-3 rounded-full ${sev.dotColor}`} />
            <span className={`text-xs px-2 py-0.5 rounded-full ${sev.className}`}>
              {vuln.severity}
            </span>
            <span className="text-xs text-muted-foreground">
              {statusLabels[vuln.status] || vuln.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{vuln.title}</h1>
          {vuln.cveId && (
            <p className="text-sm font-mono text-muted-foreground mt-1">{vuln.cveId}</p>
          )}
        </div>
      </div>

      {/* Status Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED', 'FIXED'].map((s) => (
            <Button
              key={s}
              variant={vuln.status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateStatusMutation.mutate(s)}
              disabled={vuln.status === s || updateStatusMutation.isPending}
            >
              {statusLabels[s]}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{vuln.description}</p>
        </CardContent>
      </Card>

      {/* Solution */}
      {vuln.solution && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Remediation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{vuln.solution}</p>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {vuln.affectedComponent && (
              <>
                <dt className="text-muted-foreground">Affected Component</dt>
                <dd className="font-mono">{vuln.affectedComponent}</dd>
              </>
            )}
            {vuln.cvssScore != null && (
              <>
                <dt className="text-muted-foreground">CVSS Score</dt>
                <dd className="font-bold">{vuln.cvssScore}</dd>
              </>
            )}
            {vuln.category && (
              <>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{vuln.category}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Discovered</dt>
            <dd>{new Date(vuln.createdAt).toLocaleString()}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* Evidence */}
      {vuln.evidence && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
              {vuln.evidence}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* References */}
      {vuln.references?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">References</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {vuln.references.map((ref: string, i: number) => (
                <li key={i}>
                  <a
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {ref}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
