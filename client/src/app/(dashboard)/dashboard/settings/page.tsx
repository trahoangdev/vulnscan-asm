'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  Lock,
  Bell,
  Building2,
  Loader2,
  Save,
  Shield,
  Globe,
  Scan,
  Copy,
  CheckCircle,
  XCircle,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth';
import { usersApi } from '@/services/api';
import { authApi } from '@/services/auth';
import toast from 'react-hot-toast';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Ho_Chi_Minh',
  'Asia/Seoul', 'Asia/Bangkok', 'Australia/Sydney', 'Pacific/Auckland',
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState((user as any)?.timezone || 'UTC');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState((user as any)?.twoFactorEnabled || false);
  const [twoFASetup, setTwoFASetup] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [disableToken, setDisableToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    emailCritical: true,
    emailHigh: true,
    emailWeeklyDigest: true,
    inAppEnabled: true,
    scanCompleted: true,
    scanFailed: true,
    newVulnerability: true,
    certExpiring: true,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // Default scan profile
  const [defaultScanProfile, setDefaultScanProfile] = useState('STANDARD');

  // Load notification prefs from server
  useEffect(() => {
    usersApi.getNotificationPrefs().then((res) => {
      const data = res?.data?.data;
      if (data) setNotifPrefs(data);
    }).catch(() => {});
  }, []);

  const handleProfileUpdate = async () => {
    try {
      setProfileLoading(true);
      const res = await usersApi.updateMe({ name, timezone });
      if (res.data) {
        useAuthStore.getState().setUser({
          ...user!,
          name: res.data.data?.name || name,
        });
      }
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      setPasswordLoading(true);
      await usersApi.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setTwoFALoading(true);
      const res = await authApi.setup2fa();
      setTwoFASetup(res.data?.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to setup 2FA');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (twoFAToken.length !== 6) {
      toast.error('Enter a 6-digit code');
      return;
    }
    try {
      setTwoFALoading(true);
      await authApi.enable2fa(twoFAToken);
      setTwoFAEnabled(true);
      setTwoFASetup(null);
      setTwoFAToken('');
      toast.success('Two-factor authentication enabled!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Invalid code');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableToken.length !== 6 || !disablePassword) {
      toast.error('Enter your password and 6-digit code');
      return;
    }
    try {
      setDisableLoading(true);
      await authApi.disable2fa(disableToken, disablePassword);
      setTwoFAEnabled(false);
      setDisableToken('');
      setDisablePassword('');
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  const toggleNotifPref = async (key: string) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key as keyof typeof notifPrefs] };
    setNotifPrefs(updated);
    try {
      setNotifLoading(true);
      await usersApi.updateNotificationPrefs(updated);
      toast.success('Notification preference updated');
    } catch {
      toast.error('Failed to save preference');
      setNotifPrefs(notifPrefs); // revert
    } finally {
      setNotifLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, security, and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative group">
                  {(user as any)?.avatar ? (
                    <img
                      src={(user as any).avatar}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      {(user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/jpeg,image/png,image/gif,image/webp';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Image must be under 5MB');
                          return;
                        }
                        try {
                          const res = await usersApi.uploadAvatar(file);
                          toast.success('Avatar updated!');
                          queryClient.invalidateQueries({ queryKey: ['user'] });
                          useAuthStore.getState().setUser({ ...user!, avatar: (res.data as any)?.data?.avatarUrl } as any);
                        } catch {
                          toast.error('Failed to upload avatar');
                        }
                      };
                      input.click();
                    }}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                </div>
                <div>
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="info" className="mt-1">{(user as any)?.role || 'MEMBER'}</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scanProfile">Default Scan Profile</Label>
                <select
                  id="scanProfile"
                  value={defaultScanProfile}
                  onChange={(e) => setDefaultScanProfile(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="QUICK">Quick — Headers, SSL, Exposed files (2-5 min)</option>
                  <option value="STANDARD">Standard — Quick + SQLi, XSS, Config (10-20 min)</option>
                  <option value="DEEP">Deep — All modules, full port scan (30-60 min)</option>
                </select>
              </div>
              <Button onClick={handleProfileUpdate} disabled={profileLoading}>
                {profileLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password regularly to stay secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !currentPassword || !newPassword}
                >
                  {passwordLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security using a TOTP authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {twoFAEnabled ? (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Two-factor authentication is enabled
                      </span>
                    </div>
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      To disable 2FA, enter your password and a code from your authenticator app.
                    </p>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Enter your password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Authenticator Code</Label>
                      <Input
                        value={disableToken}
                        onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="font-mono tracking-widest text-center text-lg"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDisable2FA}
                      disabled={disableLoading}
                    >
                      {disableLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Disable 2FA
                    </Button>
                  </>
                ) : twoFASetup ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                    </p>
                    <div className="flex justify-center py-4">
                      <img
                        src={twoFASetup.qrCode}
                        alt="2FA QR Code"
                        className="rounded-lg border p-2"
                        width={200}
                        height={200}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Manual entry key</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono p-2 bg-muted rounded break-all">
                          {twoFASetup.secret}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(twoFASetup.secret)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code from your authenticator app to verify setup
                      </p>
                      <Input
                        value={twoFAToken}
                        onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="font-mono tracking-widest text-center text-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleEnable2FA} disabled={twoFALoading || twoFAToken.length !== 6}>
                        {twoFALoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Verify &amp; Enable
                      </Button>
                      <Button variant="outline" onClick={() => { setTwoFASetup(null); setTwoFAToken(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Two-factor authentication is not enabled
                      </span>
                    </div>
                    <Button onClick={handleSetup2FA} disabled={twoFALoading}>
                      {twoFALoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                      Set Up Two-Factor Authentication
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    Use a strong, unique password with at least 8 characters
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    Enable two-factor authentication for enhanced security
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    Never share your password or API keys with anyone
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    Change your password regularly (every 90 days recommended)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified about events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[
                  { id: 'emailCritical', label: 'Critical vulnerability alerts', desc: 'Email notification when critical vulnerabilities are found', icon: '🔴' },
                  { id: 'emailHigh', label: 'High severity alerts', desc: 'Email notification for high severity findings', icon: '🟠' },
                  { id: 'emailWeeklyDigest', label: 'Weekly digest', desc: 'Weekly security summary email every Monday', icon: '📧' },
                  { id: 'inAppEnabled', label: 'In-app notifications', desc: 'Show notifications in the notification center', icon: '🔔' },
                  { id: 'scanCompleted', label: 'Scan completed', desc: 'Get notified when scans finish successfully', icon: '✅' },
                  { id: 'scanFailed', label: 'Scan failed', desc: 'Alert when a scan encounters errors', icon: '❌' },
                  { id: 'newVulnerability', label: 'New vulnerabilities', desc: 'Alert whenever new vulnerabilities are detected', icon: '🛡️' },
                  { id: 'certExpiring', label: 'Certificate expiring', desc: 'Warn when SSL certificates are about to expire', icon: '📜' },
                ].map((pref) => (
                  <div key={pref.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{pref.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{pref.label}</p>
                        <p className="text-xs text-muted-foreground">{pref.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs[pref.id as keyof typeof notifPrefs] ?? true}
                        onChange={() => toggleNotifPref(pref.id)}
                        className="sr-only peer"
                        disabled={notifLoading}
                      />
                      <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORGANIZATION TAB */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>View and manage your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={user?.organization?.name || 'My Organization'} disabled />
              </div>
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input value={user?.organization?.id || ''} disabled className="font-mono text-xs" />
              </div>
              <Separator />
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-1">Need changes?</h4>
                <p className="text-xs text-muted-foreground">
                  Organization settings like name, plan, and member management will be available in a future update.
                  Contact support for urgent changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
