'use client';

import Link from 'next/link';
import { Shield, Radar, Lock, Eye, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

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
        y: [0, -25, 0, 25, 0],
        x: [0, 15, 0, -15, 0],
        scale: [1, 1.1, 1, 0.9, 1],
      }}
      transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function GridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

const highlights = [
  { icon: Radar, text: 'Automated asset discovery across your entire domain' },
  { icon: Lock, text: '9 scanner modules running in parallel' },
  { icon: Eye, text: 'Continuous monitoring with real-time alerts' },
  { icon: Cpu, text: 'CVSS scoring & OWASP compliance reporting' },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Left side — cinematic branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08),transparent_60%)]" />
        <GridPattern />

        {/* Floating orbs */}
        <FloatingOrb className="w-72 h-72 bg-blue-600/10 top-20 -left-20" delay={0} />
        <FloatingOrb className="w-56 h-56 bg-cyan-600/[0.07] bottom-32 right-10" delay={7} />
        <FloatingOrb className="w-40 h-40 bg-purple-600/[0.06] top-1/2 left-1/3" delay={12} />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/20 rounded-full"
              style={{ left: `${20 + i * 16}%`, top: `${15 + (i % 3) * 30}%` }}
              animate={{ y: [0, -40, 0], opacity: [0.15, 0.5, 0.15] }}
              transition={{ duration: 5 + i, repeat: Infinity, delay: i * 1.2 }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="flex items-center gap-2.5 group">
              <motion.div whileHover={{ rotate: 15 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Shield className="h-8 w-8 text-blue-500" />
              </motion.div>
              <span className="text-xl font-bold tracking-tight">
                Vuln<span className="text-blue-400">Scan</span>
                <span className="text-slate-500 font-normal ml-1.5 text-sm">ASM</span>
              </span>
            </Link>
          </motion.div>

          {/* Hero text */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl xl:text-5xl font-bold tracking-tight mb-4 leading-tight"
            >
              Protect Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
                Digital Frontier
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md"
            >
              Discover your attack surface, detect vulnerabilities, and manage
              security risks — all in one platform.
            </motion.p>

            {/* Feature highlights */}
            <div className="space-y-4">
              {highlights.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10 border border-blue-500/10">
                    <item.icon className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-sm text-slate-300">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-slate-600 text-sm"
          >
            &copy; {new Date().getFullYear()} VulnScan ASM. All rights reserved.
          </motion.p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center p-6 sm:p-8">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_70%)]" />

        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-bold tracking-tight">
              Vuln<span className="text-blue-400">Scan</span>
            </span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-md relative z-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
