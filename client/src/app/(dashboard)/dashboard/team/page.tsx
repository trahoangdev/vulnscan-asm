'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, UserPlus, Shield, Crown, Eye, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  OWNER: { label: 'Owner', color: 'bg-yellow-100 text-yellow-800', icon: Crown },
  ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-800', icon: Shield },
  MEMBER: { label: 'Member', color: 'bg-blue-100 text-blue-800', icon: Users },
  VIEWER: { label: 'Viewer', color: 'bg-gray-100 text-gray-700', icon: Eye },
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const { data: membersRes, isLoading } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => organizationsApi.listMembers(),
  });

  const { data: orgRes } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationsApi.get(),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      organizationsApi.inviteMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success('Member invited successfully');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to invite member');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      organizationsApi.updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success('Role updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update role');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      organizationsApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success('Member removed');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove member');
    },
  });

  const members = membersRes?.data?.data || [];
  const org = orgRes?.data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-gray-500 mt-1">
            Manage members of {org?.name || 'your organization'}
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization. The user must have a registered account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin — Full management access</SelectItem>
                    <SelectItem value="MEMBER">Member — Can create scans & targets</SelectItem>
                    <SelectItem value="VIEWER">Viewer — Read-only access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                disabled={!inviteEmail || inviteMutation.isPending}
              >
                {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].map((role) => {
          const count = members.filter((m: any) => m.role === role).length;
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          return (
            <Card key={role}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-gray-500">{config.label}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>All members in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: any) => {
                  const config = ROLE_CONFIG[member.role] || ROLE_CONFIG.MEMBER;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                            {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{member.user?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{member.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.role === 'OWNER' ? (
                          <Badge className={config.color}>{config.label}</Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(role) =>
                              updateRoleMutation.mutate({ memberId: member.id, role })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {member.user?.lastLoginAt
                          ? new Date(member.user.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.role !== 'OWNER' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`Remove ${member.user?.name || member.user?.email}?`)) {
                                removeMutation.mutate(member.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
