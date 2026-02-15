'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';
import { authApi } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';

function GitHubCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received from GitHub');
      return;
    }

    (async () => {
      try {
        const res = await authApi.githubLogin(code);
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'GitHub login failed. Please try again.');
      }
    })();
  }, [searchParams, setAuth, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4 p-8">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-semibold text-white">Authentication Failed</h2>
          <p className="text-slate-400 max-w-sm">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-medium transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
        <p className="text-slate-400">Authenticating with GitHub...</p>
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        </div>
      }
    >
      <GitHubCallbackInner />
    </Suspense>
  );
}
