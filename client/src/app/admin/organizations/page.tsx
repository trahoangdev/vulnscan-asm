'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Target,
  Ban,
  CheckCircle,
  XCircle,
  Crown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { adminApi } from '@/services/api';
import { toast } from 'sonner';

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-700',
  PROFESSIONAL: 'bg-blue-100 text-blue-700',
  BUSINESS: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

export default function AdminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [editDialog, setEditDialog] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<any>(null);
  const [detailDialog, setDetailDialog] = useState<any>(null);

  const params: Record<string, any> = { page, limit: 20 };
  if (search) params.search = search;
  if (planFilter !== 'all') params.plan = planFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orgs', params],
    queryFn: () => adminApi.listOrgs(params),
  });

  const { data: detailData } = useQuery({
    queryKey: ['admin', 'org', detailDialog?.id],
    queryFn: () => adminApi.getOrgById(detailDialog.id),
    enabled: !!detailDialog?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      adminApi.updateOrg(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      toast.success('Organization updated');
      setEditDialog(null);
    },
    onError: () => toast.error('Failed to update organization'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteOrg(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      toast.success('Organization deleted');
      setDeleteDialog(null);
    },
    onError: () => toast.error('Failed to delete organization'),
  });

  const orgs = data?.data?.data || [];
  const meta = data?.data?.meta;
  const orgDetail = detailData?.data?.data;

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Management</h1>
        <p className="text-muted-foreground">View and manage all organizations</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="STARTER">Starter</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Scans Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org: any) => (
                  <TableRow key={org.id} className="cursor-pointer" onClick={() => setDetailDialog(org)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${PLAN_COLORS[org.plan]} border-0`}>
                        {org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {org.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 gap-1">
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200 gap-1">
                          <XCircle className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {org._count.members}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                        {org._count.targets}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {org.scansUsed} / {org.maxScansPerMonth}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(org.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditDialog(org); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMutation.mutate({ id: org.id, data: { isActive: !org.isActive } });
                            }}
                          >
                            {org.isActive ? (
                              <><Ban className="h-4 w-4 mr-2" /> Deactivate</>
                            ) : (
                              <><CheckCircle className="h-4 w-4 mr-2" /> Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => { e.stopPropagation(); setDeleteDialog(org); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {orgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No organizations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailDialog?.name}</DialogTitle>
            <DialogDescription>Organization details and members</DialogDescription>
          </DialogHeader>
          {orgDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <Badge className={`${PLAN_COLORS[orgDetail.plan]} border-0 mt-1`}>{orgDetail.plan}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Targets</p>
                  <p className="font-medium">{orgDetail._count.targets} / {orgDetail.maxTargets}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scans</p>
                  <p className="font-medium">{orgDetail.scansUsed} / {orgDetail.maxScansPerMonth}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Billing Email</p>
                  <p className="font-medium">{orgDetail.billingEmail || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Members ({orgDetail.members.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {orgDetail.members.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {m.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{m.user.name}</p>
                          <p className="text-xs text-muted-foreground">{m.user.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs gap-1">
                        {m.role === 'OWNER' && <Crown className="h-3 w-3" />}
                        {m.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization details and limits</DialogDescription>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editDialog.name}
                  onChange={(e) => setEditDialog({ ...editDialog, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={editDialog.plan} onValueChange={(v) => setEditDialog({ ...editDialog, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Targets</Label>
                  <Input
                    type="number"
                    value={editDialog.maxTargets}
                    onChange={(e) => setEditDialog({ ...editDialog, maxTargets: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Max Scans/Month</Label>
                  <Input
                    type="number"
                    value={editDialog.maxScansPerMonth}
                    onChange={(e) => setEditDialog({ ...editDialog, maxScansPerMonth: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({
                id: editDialog.id,
                data: {
                  name: editDialog.name,
                  plan: editDialog.plan,
                  maxTargets: editDialog.maxTargets,
                  maxScansPerMonth: editDialog.maxScansPerMonth,
                },
              })}
              disabled={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{deleteDialog?.name}</strong>? This removes all targets, scans, and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteDialog.id)} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
