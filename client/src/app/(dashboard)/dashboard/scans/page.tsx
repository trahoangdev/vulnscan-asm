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
  Settings2,
  ChevronDown,
  Plus,
  X,
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

const SCANNER_MODULES = [
  { id: 'dns_enumerator', name: 'DNS Enumeration', description: 'DNS records & subdomain discovery' },
  { id: 'port_scanner', name: 'Port Scanner', description: 'TCP port scanning via nmap' },
  { id: 'ssl_analyzer', name: 'SSL/TLS Analyzer', description: 'Certificate & TLS configuration' },
  { id: 'web_crawler', name: 'Web Crawler', description: 'Endpoint discovery & security headers' },
  { id: 'tech_detector', name: 'Tech Detector', description: 'Technology fingerprinting' },
  { id: 'vuln_checker', name: 'Vuln Checker', description: 'Active injection testing (SQLi, XSS, SSRF)' },
  { id: 'subdomain_takeover', name: 'Subdomain Takeover', description: 'Dangling CNAME detection' },
  { id: 'admin_detector', name: 'Admin Detector', description: 'Exposed admin & login pages' },
  { id: 'nvd_cve_matcher', name: 'NVD CVE Matcher', description: 'Known CVE lookup via NVD API' },
];

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
  CUSTOM: 'Custom Scan',
};

const profileDescriptions: Record<string, { desc: string; icon: React.ElementType }> = {
  QUICK: { desc: 'DNS, SSL, tech detection — 2-5 min', icon: Zap },
  STANDARD: { desc: 'Discovery + crawl + admin detection — 10-20 min', icon: Shield },
  DEEP: { desc: 'Full scan with all 9 modules — 30-60 min', icon: ShieldAlert },
  CUSTOM: { desc: 'Pick specific modules & configure settings', icon: Settings2 },
};

interface ScanFormState {
  targetId: string;
  profile: string;
  modules: string[];
  excludePaths: string[];
  maxConcurrent: number;
  requestDelay: number;
}

const defaultForm: ScanFormState = {
  targetId: '',
  profile: 'STANDARD',
  modules: [],
  excludePaths: [],
  maxConcurrent: 3,
  requestDelay: 0,
};

export default function ScansPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanForm, setScanForm] = useState<ScanFormState>({ ...defaultForm });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newExclude, setNewExclude] = useState('');

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
    mutationFn: (data: any) => scansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      setDialogOpen(false);
      setScanForm({ ...defaultForm });
      setShowAdvanced(false);
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

  const toggleModule = (id: string) => {
    setScanForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(id)
        ? prev.modules.filter((m) => m !== id)
        : [...prev.modules, id],
    }));
  };

  const addExcludePath = () => {
    if (newExclude.trim() && !scanForm.excludePaths.includes(newExclude.trim())) {
      setScanForm((prev) => ({
        ...prev,
        excludePaths: [...prev.excludePaths, newExclude.trim()],
      }));
      setNewExclude('');
    }
  };

  const removeExcludePath = (path: string) => {
    setScanForm((prev) => ({
      ...prev,
      excludePaths: prev.excludePaths.filter((p) => p !== path),
    }));
  };

  const handleStartScan = () => {
    if (!scanForm.targetId) {
      toast.error('Please select a target');
      return;
    }
    const payload: any = {
      targetId: scanForm.targetId,
      profile: scanForm.profile,
    };
    if (scanForm.profile === 'CUSTOM' && scanForm.modules.length > 0) {
      payload.modules = scanForm.modules;
    }
    const scanConfig: any = {};
    if (scanForm.excludePaths.length > 0) scanConfig.excludePaths = scanForm.excludePaths;
    if (scanForm.maxConcurrent !== 3) scanConfig.maxConcurrent = scanForm.maxConcurrent;
    if (scanForm.requestDelay > 0) scanConfig.requestDelay = scanForm.requestDelay;
    if (Object.keys(scanConfig).length > 0) payload.scanConfig = scanConfig;

    createMutation.mutate(payload);
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
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                  {(['QUICK', 'STANDARD', 'DEEP', 'CUSTOM'] as const).map((profile) => {
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

              {/* Module selection — visible for CUSTOM profile */}
              {scanForm.profile === 'CUSTOM' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Select Modules ({scanForm.modules.length} selected)
                  </label>
                  <div className="grid gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {SCANNER_MODULES.map((mod) => (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          scanForm.modules.includes(mod.id)
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={scanForm.modules.includes(mod.id)}
                          onChange={() => toggleModule(mod.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{mod.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced settings toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  {/* Exclusion rules */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Exclude Paths</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      URL path substrings to skip during scanning
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="/logout, /api/internal..."
                        value={newExclude}
                        onChange={(e) => setNewExclude(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludePath())}
                        className="text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={addExcludePath}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {scanForm.excludePaths.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {scanForm.excludePaths.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
                          >
                            {p}
                            <button onClick={() => removeExcludePath(p)} className="hover:text-red-500">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Speed controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Concurrency</label>
                      <Select
                        value={String(scanForm.maxConcurrent)}
                        onValueChange={(v) =>
                          setScanForm({ ...scanForm, maxConcurrent: Number(v) })
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 (Slow)</SelectItem>
                          <SelectItem value="3">3 (Normal)</SelectItem>
                          <SelectItem value="5">5 (Fast)</SelectItem>
                          <SelectItem value="10">10 (Aggressive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Request Delay</label>
                      <Select
                        value={String(scanForm.requestDelay)}
                        onValueChange={(v) =>
                          setScanForm({ ...scanForm, requestDelay: Number(v) })
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="100">100ms</SelectItem>
                          <SelectItem value="500">500ms</SelectItem>
                          <SelectItem value="1000">1 sec</SelectItem>
                          <SelectItem value="2000">2 sec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
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
