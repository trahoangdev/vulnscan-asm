'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '@/services/auth';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12">
          <Loader2 className="h-10 w-10 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
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
            'Verification failed. The link may have expired.',
        );
      });
  }, [token]);

  return (
    <div className="text-center py-8">
      {status === 'loading' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="inline-flex p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold">Verifying your email...</h2>
          <p className="text-slate-500">Please wait a moment.</p>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle className="h-12 w-12 text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-bold">Email verified!</h2>
          <p className="text-slate-400 max-w-sm mx-auto">{message}</p>
          <div className="pt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
              >
                Sign in
              </Link>
            </motion.div>
          </div>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
          >
            <XCircle className="h-12 w-12 text-red-400" />
          </motion.div>
          <h2 className="text-2xl font-bold">Verification failed</h2>
          <p className="text-slate-400 max-w-sm mx-auto">{message}</p>
          <div className="pt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium transition-all"
              >
                Back to Login
              </Link>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
