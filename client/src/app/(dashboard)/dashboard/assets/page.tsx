'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Globe,
  Server,
  Link2,
  ChevronRight,
  Loader2,
  HardDrive,
  Wifi,
  Shield,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { assetsApi } from '@/services/api';

const typeConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  SUBDOMAIN: { icon: Globe, label: 'Subdomain', className: 'bg-blue-100 text-blue-700' },
  IP_ADDRESS: { icon: Server, label: 'IP Address', className: 'bg-purple-100 text-purple-700' },
  URL: { icon: Link2, label: 'URL', className: 'bg-green-100 text-green-700' },
  API_ENDPOINT: { icon: Wifi, label: 'API', className: 'bg-orange-100 text-orange-700' },
};

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assets', search, type],
    queryFn: () =>
      assetsApi.list({
        search: search || undefined,
        type: type || undefined,
        page: 1,
        limit: 100,
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['assets', 'stats'],
    queryFn: assetsApi.getStats,
  });

  const assets = data?.data?.data || [];
  const stats = statsData?.data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
        <p className="text-muted-foreground">
          All discovered assets across your targets.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Subdomains</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.byType?.SUBDOMAIN || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">With Findings</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {assets.filter((a: any) => a._count?.findings > 0).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets by hostname, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="">All Types</option>
          <option value="SUBDOMAIN">Subdomain</option>
          <option value="IP_ADDRESS">IP Address</option>
          <option value="URL">URL</option>
          <option value="API_ENDPOINT">API Endpoint</option>
        </select>
      </div>

      {/* Assets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardDrive className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No assets found</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Run a scan on a target to discover assets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assets.map((asset: any) => {
            const config = typeConfig[asset.type] || typeConfig.URL;
            const TypeIcon = config.icon;
            const findingsCount = asset._count?.findings || 0;

            return (
              <Link key={asset.id} href={`/dashboard/assets/${asset.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    {/* Type badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
                      <TypeIcon className="h-3 w-3" />
                      {config.label}
                    </div>

                    {/* Asset info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{asset.value}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {asset.ip && <span>IP: {asset.ip}</span>}
                        {asset.httpStatus && <span>HTTP {asset.httpStatus}</span>}
                        {asset.target && <span>Target: {asset.target.value}</span>}
                      </div>
                    </div>

                    {/* Findings count */}
                    {findingsCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium">
                        <Shield className="h-3 w-3" />
                        {findingsCount} finding{findingsCount > 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Active indicator */}
                    <div className={`h-2 w-2 rounded-full ${asset.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
