'use client';

import { useRef, useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useInView,
  useSpring,
  useMotionValue,
  AnimatePresence,
} from 'framer-motion';
import {
  Shield,
  Search,
  BarChart3,
  FileCheck,
  ArrowRight,
  CheckCircle,
  Globe,
  Zap,
  Lock,
  Eye,
  Server,
  ChevronDown,
  Menu,
  X,
  Radar,
  ShieldCheck,
  Bug,
  ArrowUpRight,
  Fingerprint,
  Layers,
  Cpu,
  Network,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   UTILITY HOOKS
   ═══════════════════════════════════════════ */

function useMouseParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [x, y]);
  return { x, y };
}

/* ═══════════════════════════════════════════
   ANIMATED COMPONENTS
   ═══════════════════════════════════════════ */

function FadeInWhenVisible({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const offsets = {
    up: { x: 0, y: 40 },
    down: { x: 0, y: -40 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: offsets[direction].x, y: offsets[direction].y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingOrb({
  className,
  delay = 0,
  duration = 20,
}: {
  className: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      animate={{
        y: [0, -30, 0, 30, 0],
        x: [0, 20, 0, -20, 0],
        scale: [1, 1.1, 1, 0.9, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
}

function GridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 50, damping: 20 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (isInView) motionVal.set(target);
  }, [isInView, target, motionVal]);

  useMotionValueEvent(spring, 'change', (v) => {
    setDisplay(Math.round(v).toLocaleString());
  });

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════
   SECTION: NAVIGATION
   ═══════════════════════════════════════════ */

function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 50));

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Stats', href: '#stats' },
  ];

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-blue-500/5'
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container mx-auto px-6 flex justify-between items-center h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Shield className="h-8 w-8 text-blue-500" />
            </motion.div>
            <span className="text-lg font-bold tracking-tight">
              Vuln<span className="text-blue-400">Scan</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300"
              >
                {link.label}
              </Link>
            ))}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="ml-1 px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40"
              >
                Start Free
              </Link>
            </motion.div>
          </nav>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl md:hidden pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <nav className="flex flex-col items-center gap-6 py-12">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-2xl font-medium text-slate-300 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <div className="h-px w-24 bg-white/10" />
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-xl text-slate-400">
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="px-8 py-3 bg-blue-600 rounded-xl text-lg font-medium"
              >
                Start Free
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════
   SECTION: HERO
   ═══════════════════════════════════════════ */

function HeroSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.92]);
  const mouse = useMouseParallax();
  const mx = useTransform(mouse.x, [0, typeof window !== 'undefined' ? window.innerWidth : 1920], [-15, 15]);
  const my = useTransform(mouse.y, [0, typeof window !== 'undefined' ? window.innerHeight : 1080], [-10, 10]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)]" />
      <GridPattern />
      <FloatingOrb className="w-96 h-96 bg-blue-600/10 top-20 -left-48" delay={0} />
      <FloatingOrb className="w-80 h-80 bg-cyan-600/[0.08] bottom-20 -right-40" delay={5} />
      <FloatingOrb className="w-64 h-64 bg-purple-600/[0.06] top-1/3 right-1/4" delay={10} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -60, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8 }}
          />
        ))}
      </div>

      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 container mx-auto px-6 text-center pt-24"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-5 py-2 mb-8 backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-sm text-blue-300 font-medium">
            Automated Attack Surface Management
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.95]"
        >
          <span className="block">Know Your</span>
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
            Attack Surface
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Discover assets, detect vulnerabilities, and eliminate blind spots
          &mdash; before attackers find them first.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row justify-center gap-4 mb-20"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/register"
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-2xl shadow-blue-600/25 hover:shadow-blue-500/40 overflow-hidden"
            >
              <span className="relative z-10">Start Free Scan</span>
              <ArrowRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-2xl font-semibold text-lg transition-all duration-300 backdrop-blur-sm"
            >
              Explore Features
            </Link>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          style={{ x: mx, y: my }}
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50">
            {/* Glow line */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/20 via-transparent to-transparent pointer-events-none" />

            {/* Window */}
            <div className="rounded-xl bg-slate-950/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-slate-500">
                    dashboard.vulnscan.io
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Targets', value: '24', icon: Radar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Assets', value: '1,847', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { label: 'Vulns', value: '156', icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10' },
                    { label: 'Score', value: '78', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.2 + i * 0.1 }}
                      className="rounded-xl bg-white/[0.03] border border-white/5 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                          <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                        </div>
                        <span className="text-xs text-slate-500">{stat.label}</span>
                      </div>
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart mock */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 rounded-xl bg-white/[0.02] border border-white/5 p-4 h-40">
                    <div className="text-xs text-slate-500 mb-3">Scan Activity (30d)</div>
                    <div className="flex items-end gap-1 h-24">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 50, 78, 92, 68, 84, 72, 96, 82].map(
                        (h, i) => (
                          <motion.div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm opacity-60"
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 0.8, delay: 1.5 + i * 0.05, ease: 'easeOut' }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 h-40">
                    <div className="text-xs text-slate-500 mb-3">By Severity</div>
                    <div className="space-y-2.5 mt-4">
                      {[
                        { label: 'Critical', w: '15%', color: 'bg-red-500' },
                        { label: 'High', w: '28%', color: 'bg-orange-500' },
                        { label: 'Medium', w: '35%', color: 'bg-yellow-500' },
                        { label: 'Low', w: '22%', color: 'bg-blue-500' },
                      ].map((s, i) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 w-12">{s.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${s.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: s.w }}
                              transition={{ duration: 0.8, delay: 1.8 + i * 0.1 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="h-6 w-6 text-slate-500" />
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION: SOCIAL PROOF
   ═══════════════════════════════════════════ */

function SocialProofSection() {
  return (
    <section className="relative py-16 border-y border-white/5 overflow-hidden">
      <div className="container mx-auto px-6">
        <FadeInWhenVisible>
          <p className="text-center text-sm text-slate-500 mb-8 tracking-widest uppercase">
            Trusted by security teams worldwide
          </p>
        </FadeInWhenVisible>
        <div className="flex justify-center items-center flex-wrap gap-x-12 gap-y-6 opacity-40">
          {['TechCorp', 'MegaBank', 'CloudNine', 'SecureCo', 'RetailHub', 'GovTech'].map(
            (name, i) => (
              <FadeInWhenVisible key={name} delay={i * 0.08}>
                <div className="flex items-center gap-2 text-slate-400">
                  <Shield className="h-5 w-5" />
                  <span className="text-lg font-semibold tracking-tight">{name}</span>
                </div>
              </FadeInWhenVisible>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION: FEATURES
   ═══════════════════════════════════════════ */

const features = [
  {
    icon: Search,
    title: 'Asset Discovery',
    desc: 'Automatically enumerate subdomains, IPs, open ports, and services across your entire domain landscape.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Vulnerability Scanning',
    desc: 'Detect web, API, SSL/TLS, and infrastructure vulnerabilities with industry-leading accuracy.',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Risk Prioritization',
    desc: 'CVSS scoring, OWASP categorization, and intelligent grouping to fix what matters first.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Eye,
    title: 'Continuous Monitoring',
    desc: 'Scheduled scans, real-time alerts, and drift detection for emerging threats 24/7.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Globe,
    title: 'DNS & SSL Analysis',
    desc: 'Deep inspection of DNS records, SSL certificates, DMARC/SPF, and domain configurations.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Server,
    title: 'Technology Detection',
    desc: 'Identify tech stacks, frameworks, and running services to assess exposure surface.',
    gradient: 'from-pink-500 to-purple-500',
  },
  {
    icon: FileCheck,
    title: 'Reports & Compliance',
    desc: 'Executive summaries, OWASP/PCI compliance reports, and exportable findings.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Lock,
    title: 'Secure by Design',
    desc: 'Role-based access, encrypted storage, full audit trails, and API key management.',
    gradient: 'from-slate-400 to-blue-500',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeInWhenVisible className="text-center mb-20">
          <span className="inline-block text-sm font-medium text-blue-400 tracking-widest uppercase mb-4">
            Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Complete Attack Surface
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Visibility
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            From discovery to remediation &mdash; everything your security team
            needs in a single platform.
          </p>
        </FadeInWhenVisible>

        <StaggerContainer
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
          staggerDelay={0.06}
        >
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all duration-500 h-full overflow-hidden">
                {/* Hover glow */}
                <div
                  className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${feature.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700`}
                />
                <div
                  className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 mb-5`}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION: HOW IT WORKS
   ═══════════════════════════════════════════ */

const steps = [
  {
    num: '01',
    title: 'Add Your Targets',
    desc: 'Enter root domains, IP ranges, or URLs. Verify ownership through DNS, HTML file, or meta tag.',
    icon: Radar,
    visual: (
      <div className="space-y-3">
        {['techcorp.io', '203.0.113.0/24', 'api.example.com'].map((t, i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5"
          >
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm font-mono text-slate-300">{t}</span>
            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    num: '02',
    title: 'Launch Scans',
    desc: 'Choose Quick, Standard, or Deep profiles. 9 scanner modules run in parallel to detect everything.',
    icon: Cpu,
    visual: (
      <div className="space-y-3">
        {[
          { name: 'Port Scanner', progress: 100 },
          { name: 'Subdomain Finder', progress: 87 },
          { name: 'Vuln Scanner', progress: 64 },
          { name: 'SSL Checker', progress: 42 },
        ].map((m, i) => (
          <div key={m.name} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{m.name}</span>
              <span className="text-slate-500">{m.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                initial={{ width: 0 }}
                whileInView={{ width: `${m.progress}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 1,
                  delay: 0.4 + i * 0.15,
                  ease: 'easeOut',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '03',
    title: 'Review & Remediate',
    desc: 'Browse findings by severity, assign to team members, track fixes, and generate compliance reports.',
    icon: Network,
    visual: (
      <div className="space-y-2.5">
        {[
          { title: 'SQL Injection — Login', sev: 'CRITICAL', color: 'bg-red-500' },
          { title: 'Weak TLS Config', sev: 'HIGH', color: 'bg-orange-500' },
          { title: 'Missing CSP Header', sev: 'MEDIUM', color: 'bg-yellow-500' },
          { title: 'Server Disclosure', sev: 'LOW', color: 'bg-blue-500' },
        ].map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5"
          >
            <div className={`w-2 h-2 rounded-full ${v.color}`} />
            <span className="text-sm text-slate-300 flex-1 truncate">{v.title}</span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${v.color}/20 text-white/80`}
            >
              {v.sev}
            </span>
          </motion.div>
        ))}
      </div>
    ),
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.04),transparent_60%)]" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeInWhenVisible className="text-center mb-20">
          <span className="inline-block text-sm font-medium text-blue-400 tracking-widest uppercase mb-4">
            Workflow
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Three Steps to
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              {' '}
              Full Visibility
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            From target onboarding to actionable insights &mdash; streamlined
            for speed.
          </p>
        </FadeInWhenVisible>

        <div className="space-y-8 max-w-5xl mx-auto">
          {steps.map((step, idx) => (
            <FadeInWhenVisible key={step.num} delay={idx * 0.1}>
              <div className="group relative rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-all duration-500 overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Content */}
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-5">
                      <span className="text-5xl font-black text-white/5">
                        {step.num}
                      </span>
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <step.icon className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>

                  {/* Visual */}
                  <div className="p-8 md:p-10 border-t md:border-t-0 md:border-l border-white/5 flex items-center">
                    {step.visual}
                  </div>
                </div>
              </div>
            </FadeInWhenVisible>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION: STATS
   ═══════════════════════════════════════════ */

function StatsSection() {
  const stats = [
    { value: 9, suffix: '', label: 'Scanner Modules', icon: Cpu },
    { value: 150, suffix: '+', label: 'Vuln Signatures', icon: Bug },
    { value: 95, suffix: '%', label: 'True Positive Rate', icon: ShieldCheck },
    { value: 5, suffix: 'min', label: 'Quick Scan Time', icon: Zap },
  ];

  return (
    <section id="stats" className="relative py-32">
      <div className="container mx-auto px-6">
        <StaggerContainer
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="relative text-center p-8 rounded-2xl border border-white/5 bg-white/[0.02] group hover:bg-white/[0.04] transition-all duration-500">
                <div className="inline-flex p-3 rounded-xl bg-blue-500/10 mb-4">
                  <stat.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION: TESTIMONIALS
   ═══════════════════════════════════════════ */

function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        'VulnScan ASM cut our vulnerability discovery time by 70%. The automated scanning is a game changer for our small security team.',
      name: 'Carlos Garcia',
      role: 'Head of Security, MegaBank',
      avatar: 'CG',
    },
    {
      quote:
        "The asset discovery feature found 40+ subdomains we didn't even know existed. Incredible visibility into our attack surface.",
      name: 'David Kim',
      role: 'CTO, CloudNine Dev',
      avatar: 'DK',
    },
    {
      quote:
        'Finally a platform that combines scanning, monitoring, and compliance reporting in one place. Essential tool for any security team.',
      name: 'Elena Petrov',
      role: 'Security Lead, TechCorp',
      avatar: 'EP',
    },
  ];

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_50%)]" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeInWhenVisible className="text-center mb-16">
          <span className="text-sm font-medium text-blue-400 tracking-widest uppercase mb-4 block">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Loved by Security
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              {' '}
              Teams
            </span>
          </h2>
        </FadeInWhenVisible>

        <StaggerContainer
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          staggerDelay={0.1}
        >
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 h-full flex flex-col">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-4 h-4 text-yellow-500">
                      ★
                    </div>
                  ))}
                </div>
                <p className="text-slate-300 leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION: CTA
   ═══════════════════════════════════════════ */

function CTASection() {
  return (
    <section className="relative py-32">
      <div className="container mx-auto px-6">
        <FadeInWhenVisible>
          <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-cyan-600/10 to-purple-600/20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.3),transparent_60%)]" />

            <div className="relative border border-white/10 rounded-3xl p-12 md:p-20 text-center backdrop-blur-sm">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="inline-flex p-4 rounded-2xl bg-blue-500/10 mb-8"
              >
                <Fingerprint className="h-10 w-10 text-blue-400" />
              </motion.div>

              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Ready to Secure Your
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Attack Surface?
                </span>
              </h2>
              <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">
                Join security teams who trust VulnScan ASM to discover and
                protect their external-facing assets.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    href="/register"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-semibold text-lg transition-all shadow-2xl shadow-blue-600/25"
                  >
                    Get Started Free
                    <ArrowUpRight className="h-5 w-5 group-hover:rotate-45 transition-transform" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/10 hover:border-white/20 rounded-2xl font-semibold text-lg transition-all backdrop-blur-sm"
                  >
                    Sign In
                  </Link>
                </motion.div>
              </div>

              <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
                {[
                  'No credit card required',
                  'Free tier included',
                  'Setup in 2 minutes',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500/80" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTION: FOOTER
   ═══════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="relative border-t border-white/5">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Shield className="h-7 w-7 text-blue-500" />
              <span className="text-lg font-bold">
                Vuln<span className="text-blue-400">Scan</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Attack Surface Management built for modern security teams.
              Discover, scan, and protect.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-300">
              Product
            </h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <Link href="#features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-300">
              Resources
            </h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-300">
              Company
            </h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} VulnScan ASM. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="#" className="hover:text-slate-300 transition-colors">
              Twitter
            </Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">
              GitHub
            </Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE EXPORT
   ═══════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30 overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <SocialProofSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
