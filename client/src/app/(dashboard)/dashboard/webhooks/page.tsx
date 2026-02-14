'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Webhook,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  ToggleLeft,
  ToggleRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { webhooksApi } from '@/services/api';
import toast from 'react-hot-toast';

const WEBHOOK_EVENTS = [
  { value: 'scan.completed', label: 'Scan Completed' },
  { value: 'scan.failed', label: 'Scan Failed' },
  { value: 'vulnerability.critical', label: 'Critical Vulnerability' },
  { value: 'vulnerability.high', label: 'High Vulnerability' },
  { value: 'asset.discovered', label: 'Asset Discovered' },
  { value: 'report.ready', label: 'Report Ready' },
];

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhooksApi.list({ page: 1, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string; secret?: string; events: string[] }) =>
      webhooksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setCreateOpen(false);
      setNewWebhook({ name: '', url: '', secret: '', events: [] });
      toast.success('Webhook created');
    },
    onError: () => toast.error('Failed to create webhook'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted');
    },
    onError: () => toast.error('Failed to delete webhook'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      webhooksApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.test(id),
    onSuccess: () => toast.success('Test webhook sent!'),
    onError: () => toast.error('Test delivery failed'),
  });

  const webhooks = data?.data?.data || [];

  const toggleEvent = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleCreate = () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0) {
      toast.error('Fill in name, URL, and select at least one event');
      return;
    }
    createMutation.mutate({
      name: newWebhook.name,
      url: newWebhook.url,
      secret: newWebhook.secret || undefined,
      events: newWebhook.events,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Receive real-time notifications via HTTP callbacks.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                We&apos;ll send a POST request to your URL when selected events occur.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name</label>
                <Input
                  placeholder="e.g. Slack Notifications"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Payload URL</label>
                <Input
                  placeholder="https://example.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Secret (optional)</label>
                <Input
                  placeholder="Used to sign payloads (HMAC SHA-256)"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {WEBHOOK_EVENTS.map((evt) => (
                    <button
                      key={evt.value}
                      type="button"
                      onClick={() => toggleEvent(evt.value)}
                      className={`px-3 py-2 text-sm rounded-md border text-left transition-colors ${
                        newWebhook.events.includes(evt.value)
                          ? 'bg-primary/10 border-primary text-primary font-medium'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {evt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Webhook className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-muted-foreground">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add a webhook to receive notifications for scan events.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: any) => (
            <Card key={wh.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{wh.name}</p>
                      {wh.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wh.events?.map((evt: string) => (
                        <Badge key={evt} variant="outline" className="text-xs">{evt}</Badge>
                      ))}
                    </div>
                    {wh.lastError && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                        <AlertTriangle className="h-3 w-3" />
                        {wh.lastError}
                      </div>
                    )}
                    {wh.lastTriggeredAt && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last triggered: {new Date(wh.lastTriggeredAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testMutation.mutate(wh.id)}
                      disabled={testMutation.isPending}
                      title="Send test"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: wh.id, isActive: !wh.isActive })}
                      title={wh.isActive ? 'Disable' : 'Enable'}
                    >
                      {wh.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(wh.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
