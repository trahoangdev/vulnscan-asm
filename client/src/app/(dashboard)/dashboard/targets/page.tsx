'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreVertical,
  Globe,
  Server,
  Wifi,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { targetsApi } from '@/services/api';
import toast from 'react-hot-toast';

const typeIcons: Record<string, React.ElementType> = {
  DOMAIN: Globe,
  IP: Server,
  CIDR: Wifi,
};

const statusBadge: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  VERIFIED: { label: 'Verified', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function TargetsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTarget, setNewTarget] = useState({ value: '', type: 'DOMAIN' });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['targets', search],
    queryFn: () => targetsApi.list({ search, page: 1, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { value: string; type: string }) => targetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
      setShowAddForm(false);
      setNewTarget({ value: '', type: 'DOMAIN' });
      toast.success('Target added successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to add target');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => targetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
      toast.success('Target deleted');
    },
    onError: () => toast.error('Failed to delete target'),
  });

  const targets = data?.data?.data || [];

  const handleAdd = () => {
    if (!newTarget.value.trim()) return;
    createMutation.mutate(newTarget);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Targets</h1>
          <p className="text-muted-foreground">
            Manage the domains and IPs you want to scan.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Target
        </Button>
      </div>

      {/* Add Target Form */}
      {showAddForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newTarget.type}
                onChange={(e) => setNewTarget({ ...newTarget, type: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="DOMAIN">Domain</option>
                <option value="IP">IP Address</option>
                <option value="CIDR">CIDR Range</option>
              </select>
              <Input
                placeholder={
                  newTarget.type === 'DOMAIN'
                    ? 'example.com'
                    : newTarget.type === 'IP'
                    ? '192.168.1.1'
                    : '10.0.0.0/24'
                }
                value={newTarget.value}
                onChange={(e) => setNewTarget({ ...newTarget, value: e.target.value })}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search targets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Target List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : targets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No targets yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Add your first domain or IP to start scanning
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Target
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {targets.map((target: any) => {
            const TypeIcon = typeIcons[target.type] || Globe;
            const status = statusBadge[target.verificationStatus] || statusBadge.PENDING;
            const StatusIcon = status.icon;

            return (
              <Card key={target.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <TypeIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{target.value}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground uppercase">
                          {target.type}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMenuOpen(menuOpen === target.id ? null : target.id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {menuOpen === target.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 mt-1 w-40 bg-card border rounded-lg shadow-lg z-50 py-1">
                          <Link
                            href={`/dashboard/targets/${target.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                          >
                            <Eye className="h-4 w-4" /> View Details
                          </Link>
                          <button
                            onClick={() => {
                              deleteMutation.mutate(target.id);
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted w-full text-left text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      </>
                    )}
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
