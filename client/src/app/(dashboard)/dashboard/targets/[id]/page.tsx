'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Globe,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  Scan,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Server,
  FileText,
  Code,
  Wifi,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { targetsApi, scansApi } from '@/services/api';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING: { label: 'Pending', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
  VERIFIED: { label: 'Verified', icon: ShieldCheck, className: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Failed', icon: ShieldX, className: 'bg-red-100 text-red-800' },
  EXPIRED: { label: 'Expired', icon: AlertTriangle, className: 'bg-gray-100 text-gray-800' },
};

type VerifyMethod = 'DNS_TXT' | 'HTML_FILE' | 'META_TAG';

export default function TargetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<VerifyMethod>('DNS_TXT');
  const [copied, setCopied] = useState<string | null>(null);

  const { data: targetRes, isLoading } = useQuery({
    queryKey: ['target', id],
    queryFn: () => targetsApi.getById(id),
  });

  const { data: verifyRes } = useQuery({
    queryKey: ['target-verify', id],
    queryFn: () => targetsApi.getVerifyStatus(id),
  });

  const { data: assetsRes } = useQuery({
    queryKey: ['target-assets', id],
    queryFn: () => targetsApi.getAssets(id, { limit: 20 }),
  });

  const verifyMutation = useMutation({
    mutationFn: (method: string) => targetsApi.verify(id, method),
    onSuccess: (res) => {
      const result = res.data?.data || res.data;
      if (result.status === 'VERIFIED') {
        toast.success('Domain verified successfully!');
      } else {
        toast.error(result.message || 'Verification failed');
      }
      queryClient.invalidateQueries({ queryKey: ['target', id] });
      queryClient.invalidateQueries({ queryKey: ['target-verify', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Verification failed');
    },
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const target = targetRes?.data?.data || targetRes?.data;
  const verify = verifyRes?.data?.data || verifyRes?.data;
  const assets = assetsRes?.data?.data || assetsRes?.data || [];
  const status = statusConfig[target?.verificationStatus] || statusConfig.PENDING;
  const StatusIcon = status.icon;

  if (!target) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium">Target not found</h2>
        <Link href="/dashboard/targets"><Button className="mt-4">Back to Targets</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/targets">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{target.value}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
              <StatusIcon className="h-3 w-3" />{status.label}
            </span>
          </div>
          {target.label && <p className="text-muted-foreground mt-1">{target.label}</p>}
        </div>
        <div className="flex gap-2">
          {target.verificationStatus === 'VERIFIED' && (
            <Link href="/dashboard/scans">
              <Button><Scan className="h-4 w-4 mr-2" />New Scan</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{target.type}</div>
            <p className="text-xs text-muted-foreground">Target Type</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{target.scanProfile}</div>
            <p className="text-xs text-muted-foreground">Scan Profile</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{target._count?.assets || 0}</div>
            <p className="text-xs text-muted-foreground">Discovered Assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{target._count?.scans || 0}</div>
            <p className="text-xs text-muted-foreground">Total Scans</p>
          </CardContent>
        </Card>
      </div>

      {/* Scan Schedule — show when verified */}
      {target.verificationStatus === 'VERIFIED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scan Schedule
            </CardTitle>
            <CardDescription>
              Configure automated recurring scans for this target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Select
                  value={target.scanSchedule || 'none'}
                  onValueChange={(val) => {
                    const schedule = val === 'none' ? null : val;
                    targetsApi.setSchedule(id, { scanSchedule: schedule }).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['target', id] });
                      toast.success(schedule ? `Schedule set to ${schedule}` : 'Schedule removed');
                    }).catch(() => toast.error('Failed to update schedule'));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No schedule</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {target.nextScanAt && (
                <p className="text-sm text-muted-foreground">
                  Next scan: {new Date(target.nextScanAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Wizard — show when not verified */}
      {target.verificationStatus !== 'VERIFIED' && verify?.verificationMethods && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Domain Verification
            </CardTitle>
            <CardDescription>
              Verify ownership of <strong>{target.value}</strong> to enable scanning.
              Choose one of the methods below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Method Selector */}
            <div className="grid gap-3 md:grid-cols-3">
              {([
                { key: 'DNS_TXT' as VerifyMethod, icon: Wifi, title: 'DNS TXT Record', desc: 'Add a TXT record to your DNS' },
                { key: 'HTML_FILE' as VerifyMethod, icon: FileText, title: 'HTML File', desc: 'Upload a file to your website' },
                { key: 'META_TAG' as VerifyMethod, icon: Code, title: 'Meta Tag', desc: 'Add a meta tag to your homepage' },
              ]).map((method) => (
                <button
                  key={method.key}
                  onClick={() => setSelectedMethod(method.key)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedMethod === method.key
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <method.icon className={`h-5 w-5 mb-2 ${selectedMethod === method.key ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-sm">{method.title}</p>
                  <p className="text-xs text-muted-foreground">{method.desc}</p>
                </button>
              ))}
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              {selectedMethod === 'DNS_TXT' && (
                <>
                  <h4 className="font-medium">Step 1: Add DNS TXT Record</h4>
                  <p className="text-sm text-muted-foreground">
                    Add a TXT record to your DNS configuration with the following details:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-background rounded p-3 border">
                      <div>
                        <p className="text-xs text-muted-foreground">Host / Name</p>
                        <code className="text-sm font-mono">{verify.verificationMethods.dns.host}</code>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleCopy(verify.verificationMethods.dns.host, 'dns-host')}
                      >
                        {copied === 'dns-host' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded p-3 border">
                      <div>
                        <p className="text-xs text-muted-foreground">Value</p>
                        <code className="text-sm font-mono break-all">{verify.verificationMethods.dns.value}</code>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleCopy(verify.verificationMethods.dns.value, 'dns-value')}
                      >
                        {copied === 'dns-value' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Note: DNS changes may take up to 24 hours to propagate.</p>
                </>
              )}
              {selectedMethod === 'HTML_FILE' && (
                <>
                  <h4 className="font-medium">Step 1: Upload Verification File</h4>
                  <p className="text-sm text-muted-foreground">
                    Create a file at the following path on your web server:
                  </p>
                  <div className="flex items-center justify-between bg-background rounded p-3 border">
                    <div>
                      <p className="text-xs text-muted-foreground">File Path</p>
                      <code className="text-sm font-mono">
                        https://{target.value}{verify.verificationMethods.html.path}
                      </code>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleCopy(verify.verificationMethods.html.path, 'html-path')}
                    >
                      {copied === 'html-path' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-background rounded p-3 border">
                    <div>
                      <p className="text-xs text-muted-foreground">File Content</p>
                      <code className="text-sm font-mono break-all">{verify.verificationMethods.html.content}</code>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleCopy(verify.verificationMethods.html.content, 'html-content')}
                    >
                      {copied === 'html-content' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
              {selectedMethod === 'META_TAG' && (
                <>
                  <h4 className="font-medium">Step 1: Add Meta Tag</h4>
                  <p className="text-sm text-muted-foreground">
                    Add the following meta tag to the {'<head>'} section of your homepage:
                  </p>
                  <div className="flex items-center justify-between bg-background rounded p-3 border">
                    <div>
                      <p className="text-xs text-muted-foreground">Meta Tag</p>
                      <code className="text-sm font-mono break-all">{verify.verificationMethods.meta.tag}</code>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleCopy(verify.verificationMethods.meta.tag, 'meta-tag')}
                    >
                      {copied === 'meta-tag' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}

              <h4 className="font-medium pt-2">Step 2: Verify</h4>
              <p className="text-sm text-muted-foreground">
                After completing the step above, click the button below to verify.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => verifyMutation.mutate(selectedMethod)}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4 mr-2" />Verify Now</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    targetsApi.skipVerify(id).then(() => {
                      toast.success('Target verified (dev skip)');
                      queryClient.invalidateQueries({ queryKey: ['target', id] });
                      queryClient.invalidateQueries({ queryKey: ['target-verify', id] });
                    }).catch(() => toast.error('Skip verification failed'));
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />Skip Verification (Dev)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets List */}
      {Array.isArray(assets) && assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Discovered Assets
            </CardTitle>
            <CardDescription>Assets found during scans of this target</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Asset</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">IP</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset: any) => (
                    <tr key={asset.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{asset.value}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted">{asset.type}</span>
                      </td>
                      <td className="p-3 font-mono text-xs">{asset.ip || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${asset.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {asset.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(asset.lastSeenAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Target Info */}
      <Card>
        <CardHeader>
          <CardTitle>Target Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm font-medium">{new Date(target.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last Scan</dt>
              <dd className="text-sm font-medium">{target.lastScanAt ? new Date(target.lastScanAt).toLocaleString() : 'Never'}</dd>
            </div>
            {target.tags?.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground mb-1">Tags</dt>
                <dd className="flex gap-1 flex-wrap">
                  {target.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-muted rounded-full text-xs">{tag}</span>
                  ))}
                </dd>
              </div>
            )}
            {target.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Notes</dt>
                <dd className="text-sm">{target.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
