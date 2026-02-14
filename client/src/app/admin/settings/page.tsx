'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Save,
  Shield,
  Mail,
  Scan,
  Globe,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi } from '@/services/api';
import { toast } from 'sonner';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  general: Globe,
  security: Shield,
  email: Mail,
  scanner: Scan,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  security: 'Security',
  email: 'Email',
  scanner: 'Scanner',
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('general');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (settings: Array<{ key: string; value: any; category?: string; label?: string }>) =>
      adminApi.batchUpdateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setEditedValues({});
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const settings = data?.data?.data || [];

  // Group by category
  const grouped: Record<string, any[]> = {};
  settings.forEach((s: any) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  const categories = Object.keys(grouped);
  const hasChanges = Object.keys(editedValues).length > 0;

  const getDisplayValue = (key: string, originalValue: any) => {
    return editedValues.hasOwnProperty(key) ? editedValues[key] : originalValue;
  };

  const handleChange = (key: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updates = Object.entries(editedValues).map(([key, value]) => {
      const setting = settings.find((s: any) => s.key === key);
      return { key, value, category: setting?.category, label: setting?.label };
    });
    saveMutation.mutate(updates);
  };

  const renderSettingInput = (setting: any) => {
    const value = getDisplayValue(setting.key, setting.value);
    const isEdited = editedValues.hasOwnProperty(setting.key);

    if (typeof setting.value === 'boolean') {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleChange(setting.key, !value)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              value ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm">{value ? 'Enabled' : 'Disabled'}</span>
          {isEdited && <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">Modified</Badge>}
        </div>
      );
    }

    if (typeof setting.value === 'number') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => handleChange(setting.key, parseInt(e.target.value) || 0)}
            className="w-40"
          />
          {isEdited && <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">Modified</Badge>}
        </div>
      );
    }

    // Special handling for known enum settings
    if (setting.key === 'scanner.default_profile') {
      return (
        <div className="flex items-center gap-2">
          <Select value={value} onValueChange={(v) => handleChange(setting.key, v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="QUICK">Quick</SelectItem>
              <SelectItem value="STANDARD">Standard</SelectItem>
              <SelectItem value="DEEP">Deep</SelectItem>
            </SelectContent>
          </Select>
          {isEdited && <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">Modified</Badge>}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          className="max-w-md"
        />
        {isEdited && <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">Modified</Badge>}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">Configure platform-wide settings</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            'Saving...'
          ) : hasChanges ? (
            <>
              <Save className="h-4 w-4" />
              Save Changes ({Object.keys(editedValues).length})
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              All Saved
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Settings;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-2">
                <Icon className="h-4 w-4" />
                {CATEGORY_LABELS[cat] || cat}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{CATEGORY_LABELS[cat] || cat} Settings</CardTitle>
                <CardDescription>
                  {cat === 'general' && 'Application name, description, and maintenance mode'}
                  {cat === 'security' && 'Login security, registration, and session settings'}
                  {cat === 'email' && 'SMTP and email notification configuration'}
                  {cat === 'scanner' && 'Scan limits and default options'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {grouped[cat].map((setting: any) => (
                    <div key={setting.key} className="flex items-start justify-between py-3 border-b last:border-0">
                      <div className="space-y-1 flex-1">
                        <Label className="text-sm font-medium">
                          {setting.label || setting.key}
                        </Label>
                        <p className="text-xs text-muted-foreground">{setting.key}</p>
                      </div>
                      <div className="ml-4">
                        {renderSettingInput(setting)}
                      </div>
                    </div>
                  ))}
                  {grouped[cat].length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No settings in this category</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
