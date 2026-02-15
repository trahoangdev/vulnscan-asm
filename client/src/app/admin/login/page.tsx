'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  Lock,
  Mail,
  ArrowLeft,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import Link from 'next/link';

const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // If already logged in as admin, redirect to admin panel
  useEffect(() => {
    if (user && (user.systemRole === 'ADMIN' || user.systemRole === 'SUPER_ADMIN')) {
      router.push('/admin');
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginForm) => {
    try {
      setError('');
      const response = await authApi.login(data);
      const { user: loggedUser, accessToken, refreshToken } = response.data.data;

      // Check if user has admin privileges
      if (loggedUser.systemRole !== 'ADMIN' && loggedUser.systemRole !== 'SUPER_ADMIN') {
        setError('Access denied. This portal is restricted to administrators only.');
        return;
      }

      setAuth(loggedUser, accessToken, refreshToken);
      router.push('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — admin branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border border-white/30 rounded-full" />
          <div className="absolute top-32 right-20 w-60 h-60 border border-white/20 rounded-full" />
          <div className="absolute bottom-20 left-1/4 w-80 h-80 border border-white/10 rounded-full" />
          <div className="absolute -bottom-10 right-10 w-32 h-32 border border-white/30 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xl font-bold">VulnScan ASM</span>
              <p className="text-red-200 text-sm">Administration Portal</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            System<br />Administration
          </h2>
          <p className="text-red-200 text-lg max-w-md">
            Manage users, organizations, system settings, and monitor platform activity from a centralized control panel.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <Fingerprint className="h-6 w-6 mb-2 text-red-200" />
              <p className="text-sm font-medium">Role-Based Access</p>
              <p className="text-xs text-red-300 mt-1">Admin & Super Admin privileges</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <Lock className="h-6 w-6 mb-2 text-red-200" />
              <p className="text-sm font-medium">Audit Logging</p>
              <p className="text-xs text-red-300 mt-1">All actions are tracked</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-red-300 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Authorized personnel only. All access is monitored and logged.</span>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to user login
          </Link>

          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-red-100 dark:bg-red-950 rounded-xl flex items-center justify-center">
                <ShieldAlert className="h-7 w-7 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Sign In</h1>
            <p className="text-muted-foreground">
              Enter your administrator credentials to access the control panel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm p-4 rounded-lg border border-red-200 dark:border-red-900">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@vulnscan.local"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Sign in to Admin Panel
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              This is a restricted area. Unauthorized access attempts are logged and may result in account suspension.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
