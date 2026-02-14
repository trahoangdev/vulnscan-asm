'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  Download,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  FileJson,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reportsApi, targetsApi } from '@/services/api';

const reportTypes = [
  { value: 'EXECUTIVE_SUMMARY', label: 'Executive Summary' },
  { value: 'TECHNICAL_DETAIL', label: 'Technical Detail' },
  { value: 'ASSET_INVENTORY', label: 'Asset Inventory' },
  { value: 'COMPLIANCE_OWASP', label: 'OWASP Compliance' },
];

const statusIcons: Record<string, React.ElementType> = {
  ready: CheckCircle2,
  generating: Loader2,
  failed: XCircle,
};

const statusColors: Record<string, string> = {
  ready: 'text-green-500',
  generating: 'text-blue-500 animate-spin',
  failed: 'text-red-500',
};

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newReport, setNewReport] = useState({
    type: 'EXECUTIVE_SUMMARY',
    title: '',
    format: 'JSON',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list({ page: 1, limit: 50 }),
  });

  const generateMutation = useMutation({
    mutationFn: (data: { type: string; title: string; format: string }) =>
      reportsApi.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowCreate(false);
      setNewReport({ type: 'EXECUTIVE_SUMMARY', title: '', format: 'JSON' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const reports = data?.data?.data || [];

  const handleGenerate = () => {
    if (!newReport.title.trim()) return;
    generateMutation.mutate(newReport);
  };

  const handleDownload = (report: any) => {
    if (report.fileUrl) {
      // For data URLs, create a blob and download
      if (report.fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = report.fileUrl;
        link.download = `${report.title.replace(/\s+/g, '_')}.json`;
        link.click();
      } else {
        window.open(report.fileUrl, '_blank');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download security reports.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Create Report Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input
                  placeholder="Monthly Security Report"
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <select
                  value={newReport.type}
                  onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  {reportTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerate}
                  disabled={!newReport.title.trim() || generateMutation.isPending}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No reports yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Generate your first security report.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => {
            const StatusIcon = statusIcons[report.status] || Clock;
            const statusColor = statusColors[report.status] || 'text-gray-400';

            return (
              <Card key={report.id}>
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <FileJson className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{report.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{report.type.replace(/_/g, ' ').toLowerCase()}</span>
                      <span>&middot;</span>
                      <span>{report.format}</span>
                      <span>&middot;</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                    <span className="text-xs capitalize">{report.status}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {report.status === 'ready' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(report)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(report.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
