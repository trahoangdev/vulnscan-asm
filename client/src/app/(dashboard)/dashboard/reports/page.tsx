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
  FileSpreadsheet,
  FileCode2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { reportsApi } from '@/services/api';
import toast from 'react-hot-toast';

const reportTypes = [
  { value: 'EXECUTIVE_SUMMARY', label: 'Executive Summary' },
  { value: 'TECHNICAL_DETAIL', label: 'Technical Detail' },
  { value: 'ASSET_INVENTORY', label: 'Asset Inventory' },
  { value: 'COMPLIANCE_OWASP', label: 'OWASP Compliance' },
];

const formatOptions = [
  { value: 'JSON', label: 'JSON', icon: FileJson },
  { value: 'CSV', label: 'CSV', icon: FileSpreadsheet },
  { value: 'HTML', label: 'HTML', icon: FileCode2 },
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

const formatExtensions: Record<string, string> = {
  JSON: '.json',
  CSV: '.csv',
  HTML: '.html',
};

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
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
      setCreateOpen(false);
      setNewReport({ type: 'EXECUTIVE_SUMMARY', title: '', format: 'JSON' });
      toast.success('Report generation started');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted');
    },
    onError: () => toast.error('Failed to delete report'),
  });

  const reports = data?.data?.data || [];

  const handleGenerate = () => {
    if (!newReport.title.trim()) return;
    generateMutation.mutate(newReport);
  };

  const handleDownload = async (report: any) => {
    try {
      const response = await reportsApi.download(report.id);
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });

      const ext = formatExtensions[report.format] || '.json';
      const filename = `${report.title.replace(/\s+/g, '_')}${ext}`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download report');
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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Create a comprehensive security report from your scan data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Report Title</label>
                <Input
                  placeholder="e.g. Monthly Security Report - January"
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Report Type</label>
                <Select
                  value={newReport.type}
                  onValueChange={(v) => setNewReport({ ...newReport, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Format</label>
                <Select
                  value={newReport.format}
                  onValueChange={(v) => setNewReport({ ...newReport, format: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        <span className="flex items-center gap-2">
                          <f.icon className="h-3.5 w-3.5" />
                          {f.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!newReport.title.trim() || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            const FormatIcon = formatOptions.find((f) => f.value === report.format)?.icon || FileJson;

            return (
              <Card key={report.id}>
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <FormatIcon className="h-5 w-5 text-primary" />
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
                        title="Download report"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(report.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete report"
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
