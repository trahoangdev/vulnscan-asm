'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Globe,
  Server,
  Link2,
  Wifi,
  Shield,
  Clock,
  Activity,
  Loader2,
  ExternalLink,
  Lock,
  Calendar,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { assetsApi } from '@/services/api';

const typeConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  SUBDOMAIN: { icon: Globe, label: 'Subdomain', className: 'bg-blue-100 text-blue-700' },
  IP_ADDRESS: { icon: Server, label: 'IP Address', className: 'bg-purple-100 text-purple-700' },
  URL: { icon: Link2, label: 'URL', className: 'bg-green-100 text-green-700' },
  API_ENDPOINT: { icon: Wifi, label: 'API Endpoint', className: 'bg-orange-100 text-orange-700' },
};

const severityConfig: Record<string, { className: string }> = {
  CRITICAL: { className: 'bg-red-100 text-red-700' },
  HIGH: { className: 'bg-orange-100 text-orange-700' },
  MEDIUM: { className: 'bg-yellow-100 text-yellow-700' },
  LOW: { className: 'bg-blue-100 text-blue-700' },
  INFO: { className: 'bg-gray-100 text-gray-600' },
};

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetsApi.getById(assetId),
    enabled: !!assetId,
  });

  const asset = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Asset not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const config = typeConfig[asset.type] || typeConfig.URL;
  const TypeIcon = config.icon;
  const technologies = Array.isArray(asset.technologies) ? asset.technologies : [];
  const ports = Array.isArray(asset.ports) ? asset.ports : [];
  const dnsRecords = asset.dnsRecords && typeof asset.dnsRecords === 'object' ? asset.dnsRecords : null;
  const sslInfo = asset.sslInfo && typeof asset.sslInfo === 'object' ? asset.sslInfo : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.className}`}>
          <TypeIcon className="h-4 w-4" />
          {config.label}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{asset.value}</h1>
          <p className="text-muted-foreground text-sm">
            Target: {asset.target?.value} &middot; {asset.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">IP Address</span>
                  <p className="font-medium">{asset.ip || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">HTTP Status</span>
                  <p className="font-medium">{asset.httpStatus || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">First Seen</span>
                  <p className="font-medium">
                    {new Date(asset.firstSeenAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Seen</span>
                  <p className="font-medium">
                    {new Date(asset.lastSeenAt).toLocaleDateString()}
                  </p>
                </div>
                {asset.title && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Page Title</span>
                    <p className="font-medium">{asset.title}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Technologies */}
          {technologies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Technologies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm"
                    >
                      <Activity className="h-3 w-3" />
                      {typeof tech === 'string' ? tech : `${tech.name}${tech.version ? ` ${tech.version}` : ''}`}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Open Ports */}
          {ports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Open Ports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ports.map((port: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded text-sm">
                      <span className="font-mono font-bold text-primary">
                        {typeof port === 'number' ? port : port.port}
                      </span>
                      {port.protocol && <span className="text-muted-foreground">{port.protocol}</span>}
                      {port.service && <span>{port.service}</span>}
                      {port.version && <span className="text-muted-foreground text-xs">{port.version}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* DNS Records */}
          {dnsRecords && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DNS Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dnsRecords as Record<string, any>).map(([recordType, records]) => (
                    <div key={recordType}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                        {recordType}
                      </h4>
                      <div className="space-y-1">
                        {(Array.isArray(records) ? records : [records]).map((r: any, i: number) => (
                          <p key={i} className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                            {typeof r === 'string' ? r : JSON.stringify(r)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vulnerabilities */}
          {asset.findings && asset.findings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Vulnerabilities ({asset.findings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {asset.findings.map((f: any) => {
                    const sevConfig = severityConfig[f.severity] || severityConfig.INFO;
                    return (
                      <Link key={f.id} href={`/dashboard/vulnerabilities/${f.id}`}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted/50 transition-colors">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${sevConfig.className}`}>
                            {f.severity}
                          </span>
                          <span className="text-sm flex-1">{f.title}</span>
                          {f.cvssScore && (
                            <span className="text-xs text-muted-foreground">
                              CVSS {f.cvssScore}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discovery Timeline / Change History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Discovery Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                {/* First Seen */}
                <div className="flex gap-4 pb-4 relative">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Eye className="h-3 w-3 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">First Discovered</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(asset.firstSeenAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Asset first appeared during a scan of {asset.target?.value}
                    </p>
                  </div>
                </div>

                {/* Technology changes — show if technologies exist */}
                {technologies.length > 0 && (
                  <div className="flex gap-4 pb-4 relative">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Activity className="h-3 w-3 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Technologies Detected</p>
                      <p className="text-xs text-muted-foreground">
                        {technologies.length} technolog{technologies.length === 1 ? 'y' : 'ies'} identified
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {technologies.slice(0, 5).map((tech: any, i: number) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                            {typeof tech === 'string' ? tech : tech.name}
                          </span>
                        ))}
                        {technologies.length > 5 && (
                          <span className="text-[10px] text-muted-foreground">+{technologies.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ports discovered */}
                {ports.length > 0 && (
                  <div className="flex gap-4 pb-4 relative">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                        <Wifi className="h-3 w-3 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Open Ports Found</p>
                      <p className="text-xs text-muted-foreground">
                        {ports.length} open port{ports.length !== 1 && 's'} discovered
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ports.map((p: any, i: number) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded">
                            {typeof p === 'number' ? p : p.port}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SSL Info detected */}
                {sslInfo && (
                  <div className="flex gap-4 pb-4 relative">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Lock className="h-3 w-3 text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">SSL Certificate Detected</p>
                      <p className="text-xs text-muted-foreground">
                        Issued by {(sslInfo as any).issuer || 'Unknown'}
                        {(sslInfo as any).grade && ` · Grade ${(sslInfo as any).grade}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Vulnerabilities — show if findings exist */}
                {asset.findings && asset.findings.length > 0 && (
                  <div className="flex gap-4 pb-4 relative">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                        <Shield className="h-3 w-3 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Vulnerabilities Found</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.findings.length} finding{asset.findings.length !== 1 && 's'} detected across scans
                      </p>
                    </div>
                  </div>
                )}

                {/* Last Seen */}
                <div className="flex gap-4 relative">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock className="h-3 w-3 text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Seen</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(asset.lastSeenAt).toLocaleString()}
                    </p>
                    {(() => {
                      const firstSeen = new Date(asset.firstSeenAt).getTime();
                      const lastSeen = new Date(asset.lastSeenAt).getTime();
                      const days = Math.floor((lastSeen - firstSeen) / (1000 * 60 * 60 * 24));
                      return days > 0 ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tracked for {days} day{days !== 1 && 's'}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SSL Info */}
          {sslInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  SSL/TLS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(sslInfo as any).issuer && (
                  <div>
                    <span className="text-muted-foreground">Issuer</span>
                    <p className="font-medium">{(sslInfo as any).issuer}</p>
                  </div>
                )}
                {(sslInfo as any).validFrom && (
                  <div>
                    <span className="text-muted-foreground">Valid From</span>
                    <p className="font-medium">{(sslInfo as any).validFrom}</p>
                  </div>
                )}
                {(sslInfo as any).validTo && (
                  <div>
                    <span className="text-muted-foreground">Expires</span>
                    <p className="font-medium">{(sslInfo as any).validTo}</p>
                  </div>
                )}
                {(sslInfo as any).grade && (
                  <div>
                    <span className="text-muted-foreground">Grade</span>
                    <p className="font-bold text-lg">{(sslInfo as any).grade}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Findings Summary */}
          {asset.findingsCount && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Findings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: 'Critical', count: asset.findingsCount.critical, color: 'bg-red-500' },
                    { label: 'High', count: asset.findingsCount.high, color: 'bg-orange-500' },
                    { label: 'Medium', count: asset.findingsCount.medium, color: 'bg-yellow-500' },
                    { label: 'Low', count: asset.findingsCount.low, color: 'bg-blue-500' },
                    { label: 'Info', count: asset.findingsCount.info, color: 'bg-gray-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
