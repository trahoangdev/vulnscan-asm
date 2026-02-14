'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Scan as ScanIcon,
  ChevronRight,
  Zap,
  Shield,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { scansApi, targetsApi } from '@/services/api';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  QUEUED: { label: 'Queued', className: 'bg-gray-100 text-gray-700', icon: Clock },
  RUNNING: { label: 'Running', className: 'bg-blue-100 text-blue-700', icon: Loader2 },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', className: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
};

const profileLabels: Record<string, string> = {
  QUICK: 'Quick Scan',
  STANDARD: 'Standard Scan',
  DEEP: 'Deep Scan',
};

const profileDescriptions: Record<string, { desc: string; icon: React.ElementType }> = {
  QUICK: { desc: 'Headers, SSL, exposed files — 2-5 min', icon: Zap },
  STANDARD: { desc: 'Quick + SQLi, XSS, config checks — 10-20 min', icon: Shield },
  DEEP: { desc: 'Full scan with all modules — 30-60 min', icon: ShieldAlert },
};

export default function ScansPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanForm, setScanForm] = useState({ targetId: '', profile: 'STANDARD' });

  const { data: scansData, isLoading } = useQuery({
    queryKey: ['scans', search],
    queryFn: () => scansApi.list({ search, page: 1, limit: 50 }),
  });

  const { data: targetsData } = useQuery({
    queryKey: ['targets-for-scan'],
    queryFn: () => targetsApi.list({ page: 1, limit: 100 }),
    enabled: dialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: { targetId: string; profile: string }) => scansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      setDialogOpen(false);
      setScanForm({ targetId: '', profile: 'STANDARD' });
      toast.success('Scan started');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to start scan');
    },
  });

  const scans = scansData?.data?.data || [];
  const targets = (targetsData?.data?.data || []).filter(
    (t: any) => t.verificationStatus === 'VERIFIED',
  );

  const handleStartScan = () => {
    if (!scanForm.targetId) {
      toast.error('Please select a target');
      return;
    }
    createMutation.mutate(scanForm);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scans</h1>
          <p className="text-muted-foreground">Run and monitor vulnerability scans.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              New Scan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start New Scan</DialogTitle>
              <DialogDescription>
                Select a verified target and scan profile to begin vulnerability assessment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Target selector */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Target</label>
                <Select
                  value={scanForm.targetId}
                  onValueChange={(v) => setScanForm({ ...scanForm, targetId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified target..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        No verified targets available
                      </div>
                    ) : (
                      targets.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" />
                            {t.value} ({t.type})
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {/* Profile selector */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Scan Profile</label>
                <div className="grid gap-2">
                  {(['QUICK', 'STANDARD', 'DEEP'] as const).map((profile) => {
                    const { desc, icon: ProfileIcon } = profileDescriptions[profile];
                    return (
                      <button
                        key={profile}
                        onClick={() => setScanForm({ ...scanForm, profile })}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                          scanForm.profile === profile
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-muted-foreground/30'
                        }`}
                      >
                        <ProfileIcon className={`h-5 w-5 mt-0.5 ${
                          scanForm.profile === profile ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{profileLabels[profile]}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartScan}
                disabled={!scanForm.targetId || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Scan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search scans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Scan List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : scans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ScanIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No scans yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Start your first vulnerability scan
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Play className="h-4 w-4 mr-2" />
              New Scan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {scans.map((scan: any) => {
            const st = statusConfig[scan.status] || statusConfig.QUEUED;
            const StatusIcon = st.icon;
            return (
              <Link key={scan.id} href={`/dashboard/scans/${scan.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <ScanIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {scan.target?.value || 'Unknown target'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {profileLabels[scan.profile] || scan.profile}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(scan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${st.className}`}>
                        <StatusIcon className={`h-3 w-3 ${scan.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                        {st.label}
                      </span>
                      {scan.progress != null && scan.status === 'RUNNING' && (
                        <span className="text-sm font-medium">{scan.progress}%</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
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
