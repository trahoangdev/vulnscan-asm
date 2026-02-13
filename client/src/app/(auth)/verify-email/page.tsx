'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authApi } from '@/services/auth';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new one.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified. You can now sign in.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.response?.data?.error?.message ||
            'Verification failed. The link may have expired.'
        );
      });
  }, [token]);

  return (
    <Card className="border-0 shadow-none lg:border lg:shadow-sm">
      <CardContent className="pt-6 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Verifying your email...</h2>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Email verified!</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verification failed</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Link href="/login">
              <Button variant="outline">Back to Login</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
