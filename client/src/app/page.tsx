import Link from 'next/link';
import { Shield, Search, BarChart3, FileCheck, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-500" />
          <span className="text-xl font-bold">VulnScan ASM</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-medium transition-colors"
          >
            Get Started Free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Know Your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            Attack Surface
          </span>
          <br />
          Before Attackers Do
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Discover assets, detect vulnerabilities, prioritize risks, and meet compliance — all in one platform built for modern teams.
        </p>

        <div className="flex justify-center gap-4 mb-20">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold text-lg transition-colors flex items-center gap-2"
          >
            Start Free Scan <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="#features"
            className="border border-slate-600 hover:border-slate-500 px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
          >
            Learn More
          </Link>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-4 gap-8 mb-20">
          {[
            {
              icon: Search,
              title: 'Discover',
              desc: 'Automatically find all digital assets from your root domain.',
            },
            {
              icon: Shield,
              title: 'Scan',
              desc: 'Detect web app, API, and infrastructure vulnerabilities.',
            },
            {
              icon: BarChart3,
              title: 'Prioritize',
              desc: 'AI-assisted risk scoring and fix recommendations.',
            },
            {
              icon: FileCheck,
              title: 'Report',
              desc: 'Compliance-ready reports for technical and management teams.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-left hover:border-blue-500/50 transition-colors"
            >
              <feature.icon className="h-10 w-10 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            { value: '95%+', label: 'True Positive Rate' },
            { value: '<10min', label: 'Basic Scan Time' },
            { value: '90%+', label: 'Asset Coverage' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-blue-400">{stat.value}</div>
              <div className="text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-slate-800 text-center text-slate-500">
        <p>© {new Date().getFullYear()} VulnScan ASM. All rights reserved.</p>
      </footer>
    </div>
  );
}
