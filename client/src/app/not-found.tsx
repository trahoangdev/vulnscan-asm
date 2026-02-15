import Link from 'next/link';
import { Shield, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <Shield className="h-8 w-8 text-blue-500" />
        <span className="text-xl font-bold">VulnScan ASM</span>
      </div>

      {/* 404 Content */}
      <h1 className="text-8xl font-bold text-blue-500 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-3">Page Not Found</h2>
      <p className="text-slate-400 text-center max-w-md mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or navigate back to safety.
      </p>

      <div className="flex gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 border border-slate-600 hover:border-slate-500 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
