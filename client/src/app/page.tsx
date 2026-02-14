import Link from 'next/link';
import {
  Shield, Search, BarChart3, FileCheck, ArrowRight,
  CheckCircle, Globe, Zap, Lock, Eye, Server,
} from 'lucide-react';

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
          <Link href="#features" className="text-slate-300 hover:text-white transition-colors hidden sm:inline">
            Features
          </Link>
          <Link href="#how-it-works" className="text-slate-300 hover:text-white transition-colors hidden sm:inline">
            How It Works
          </Link>
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
      <main>
        <section className="container mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-300">Automated Attack Surface Management</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Know Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Attack Surface
            </span>
            <br />
            Before Attackers Do
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Discover assets, detect vulnerabilities, prioritize risks, and meet compliance — all in one platform built for modern security teams.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
            >
              Start Free Scan <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="border border-slate-600 hover:border-slate-500 px-8 py-3 rounded-lg font-semibold text-lg transition-colors text-center"
            >
              Learn More
            </Link>
          </div>

          {/* Dashboard Preview Mock */}
          <div className="max-w-4xl mx-auto rounded-xl border border-slate-700 bg-slate-800/50 p-1 shadow-2xl">
            <div className="rounded-lg bg-slate-900/80 p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Targets', value: '12', color: 'text-blue-400' },
                  { label: 'Assets', value: '247', color: 'text-purple-400' },
                  { label: 'Vulnerabilities', value: '38', color: 'text-red-400' },
                  { label: 'Score', value: '72', color: 'text-green-400' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded bg-slate-800/60 border border-slate-700/50 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Complete Attack Surface Visibility
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              From discovery to remediation — everything you need to secure your external attack surface.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                title: 'Asset Discovery',
                desc: 'Automatically enumerate subdomains, IPs, and open services from your root domain.',
              },
              {
                icon: Shield,
                title: 'Vulnerability Scanning',
                desc: 'Detect web app, API, SSL/TLS, and infrastructure vulnerabilities with low false positives.',
              },
              {
                icon: BarChart3,
                title: 'Risk Prioritization',
                desc: 'Severity-based scoring and categorized findings help you fix what matters first.',
              },
              {
                icon: FileCheck,
                title: 'Reports & Compliance',
                desc: 'Generate executive and technical reports for stakeholders and compliance audits.',
              },
              {
                icon: Eye,
                title: 'Continuous Monitoring',
                desc: 'Schedule recurring scans and get alerts when new vulnerabilities emerge.',
              },
              {
                icon: Globe,
                title: 'DNS & SSL Analysis',
                desc: 'Deep inspection of DNS records, SSL certificates, and domain configurations.',
              },
              {
                icon: Server,
                title: 'Technology Detection',
                desc: 'Identify tech stacks, frameworks, and services running on your assets.',
              },
              {
                icon: Lock,
                title: 'Secure by Design',
                desc: 'Role-based access, encrypted data, and audit trails built into every operation.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="container mx-auto px-6 py-20 border-t border-slate-800">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Three simple steps to gain complete visibility of your attack surface.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Add Targets',
                desc: 'Enter your root domain, IP range, or URL. Verify ownership and configure scan settings.',
              },
              {
                step: '02',
                title: 'Run Scans',
                desc: 'Choose Quick, Standard, or Deep scan profiles. Our engine discovers assets and checks for vulnerabilities.',
              },
              {
                step: '03',
                title: 'Review & Fix',
                desc: 'Browse findings by severity, track remediation progress, and generate reports for your team.',
              },
            ].map((item, idx) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-blue-600/50 to-transparent" />
                )}
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="container mx-auto px-6 py-20 border-t border-slate-800">
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: '6', label: 'Scanner Modules' },
              { value: '95%+', label: 'True Positive Rate' },
              { value: '<5min', label: 'Quick Scan Time' },
              { value: '90%+', label: 'Asset Coverage' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-blue-400">{stat.value}</div>
                <div className="text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 py-20">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Secure Your Attack Surface?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Join security teams who trust VulnScan ASM to discover, monitor, and protect their external-facing assets.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="border border-slate-600 hover:border-slate-500 px-8 py-3 rounded-lg font-semibold text-lg transition-colors text-center"
              >
                Sign In
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-slate-400">
              {['No credit card required', 'Free tier available', 'Setup in minutes'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">VulnScan ASM</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} VulnScan ASM. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
