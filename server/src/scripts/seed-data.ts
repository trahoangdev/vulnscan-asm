import prisma from '../config/database';
import { hashPassword, generateSlug } from '../utils/crypto';

/**
 * Comprehensive seed script — populates realistic data for admin panel
 * Run: npx tsx src/scripts/seed-data.ts
 */

// Helper: random item from array
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600000);

async function seedData() {
  console.log('🌱 Seeding comprehensive data...\n');

  const passwordHash = await hashPassword('Test@1234');

  // ============================================================
  // 1. USERS (20 users)
  // ============================================================
  console.log('👤 Creating users...');

  const usersData = [
    { email: 'admin@vulnscan.local', name: 'Super Admin', systemRole: 'SUPER_ADMIN' as const, emailVerified: true },
    { email: 'admin2@vulnscan.local', name: 'Admin Nguyễn Văn A', systemRole: 'ADMIN' as const, emailVerified: true },
    { email: 'john.doe@techcorp.io', name: 'John Doe', systemRole: 'USER' as const, emailVerified: true },
    { email: 'jane.smith@techcorp.io', name: 'Jane Smith', systemRole: 'USER' as const, emailVerified: true },
    { email: 'bob.wilson@startupx.com', name: 'Bob Wilson', systemRole: 'USER' as const, emailVerified: true },
    { email: 'alice.chen@startupx.com', name: 'Alice Chen', systemRole: 'USER' as const, emailVerified: true },
    { email: 'carlos.garcia@megabank.com', name: 'Carlos Garcia', systemRole: 'USER' as const, emailVerified: true },
    { email: 'elena.petrov@megabank.com', name: 'Elena Petrov', systemRole: 'USER' as const, emailVerified: true },
    { email: 'david.kim@cloudnine.dev', name: 'David Kim', systemRole: 'USER' as const, emailVerified: true },
    { email: 'sarah.jones@cloudnine.dev', name: 'Sarah Jones', systemRole: 'USER' as const, emailVerified: true },
    { email: 'mike.taylor@retailhub.com', name: 'Mike Taylor', systemRole: 'USER' as const, emailVerified: true },
    { email: 'lisa.wang@retailhub.com', name: 'Lisa Wang', systemRole: 'USER' as const, emailVerified: true },
    { email: 'tom.nguyen@secureco.vn', name: 'Trần Minh Tâm', systemRole: 'USER' as const, emailVerified: true },
    { email: 'phuong.le@secureco.vn', name: 'Lê Thị Phương', systemRole: 'USER' as const, emailVerified: true },
    { email: 'james.brown@freelance.io', name: 'James Brown', systemRole: 'USER' as const, emailVerified: true },
    { email: 'emma.white@freelance.io', name: 'Emma White', systemRole: 'USER' as const, emailVerified: false },
    { email: 'ravi.patel@govtech.org', name: 'Ravi Patel', systemRole: 'USER' as const, emailVerified: true },
    { email: 'yuki.tanaka@healthplus.jp', name: 'Yuki Tanaka', systemRole: 'USER' as const, emailVerified: true },
    { email: 'inactive.user@old.com', name: 'Inactive User', systemRole: 'USER' as const, emailVerified: true },
    { email: 'newbie@test.com', name: 'New User', systemRole: 'USER' as const, emailVerified: false },
  ];

  const users: any[] = [];
  for (let i = 0; i < usersData.length; i++) {
    const u = usersData[i];
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { systemRole: u.systemRole },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        systemRole: u.systemRole,
        emailVerified: u.emailVerified,
        isActive: u.email !== 'inactive.user@old.com',
        lastLoginAt: u.email === 'inactive.user@old.com' ? daysAgo(90) :
          u.email === 'newbie@test.com' ? null :
          daysAgo(randomInt(0, 14)),
        lastLoginIp: pick(['192.168.1.' + randomInt(1, 254), '10.0.0.' + randomInt(1, 254), '203.162.4.' + randomInt(1, 254)]),
        createdAt: daysAgo(randomInt(i < 5 ? 60 : 5, i < 5 ? 180 : 60)),
      },
    });
    users.push(user);
  }
  console.log(`  ✅ ${users.length} users created/updated`);

  // ============================================================
  // 2. ORGANIZATIONS (8 orgs)
  // ============================================================
  console.log('🏢 Creating organizations...');

  const orgsData = [
    { name: 'System Admin', plan: 'ENTERPRISE' as const, maxTargets: 9999, maxScans: 9999 },
    { name: 'TechCorp Solutions', plan: 'ENTERPRISE' as const, maxTargets: 100, maxScans: 500 },
    { name: 'StartupX Inc', plan: 'PROFESSIONAL' as const, maxTargets: 25, maxScans: 100 },
    { name: 'MegaBank Financial', plan: 'ENTERPRISE' as const, maxTargets: 200, maxScans: 1000 },
    { name: 'CloudNine Dev', plan: 'PROFESSIONAL' as const, maxTargets: 50, maxScans: 200 },
    { name: 'RetailHub Commerce', plan: 'BUSINESS' as const, maxTargets: 30, maxScans: 150 },
    { name: 'SecureCo Vietnam', plan: 'BUSINESS' as const, maxTargets: 20, maxScans: 100 },
    { name: 'FreelanceHub', plan: 'STARTER' as const, maxTargets: 5, maxScans: 20 },
  ];

  const orgs: any[] = [];
  for (let i = 0; i < orgsData.length; i++) {
    const o = orgsData[i];
    const slug = generateSlug(o.name);
    const org = await prisma.organization.upsert({
      where: { slug },
      update: {},
      create: {
        name: o.name,
        slug,
        plan: o.plan,
        maxTargets: o.maxTargets,
        maxScansPerMonth: o.maxScans,
        scansUsed: randomInt(0, Math.min(o.maxScans, 80)),
        billingEmail: `billing@${slug}.com`,
        isActive: true,
        createdAt: daysAgo(randomInt(30, 180)),
      },
    });
    orgs.push(org);
  }
  console.log(`  ✅ ${orgs.length} organizations created`);

  // ============================================================
  // 3. ORG MEMBERS (assign users to orgs)
  // ============================================================
  console.log('👥 Assigning members...');

  const memberAssignments = [
    // System Admin org
    { userIdx: 0, orgIdx: 0, role: 'OWNER' as const },
    { userIdx: 1, orgIdx: 0, role: 'ADMIN' as const },
    // TechCorp
    { userIdx: 2, orgIdx: 1, role: 'OWNER' as const },
    { userIdx: 3, orgIdx: 1, role: 'ADMIN' as const },
    { userIdx: 16, orgIdx: 1, role: 'MEMBER' as const },
    // StartupX
    { userIdx: 4, orgIdx: 2, role: 'OWNER' as const },
    { userIdx: 5, orgIdx: 2, role: 'ADMIN' as const },
    // MegaBank
    { userIdx: 6, orgIdx: 3, role: 'OWNER' as const },
    { userIdx: 7, orgIdx: 3, role: 'ADMIN' as const },
    { userIdx: 17, orgIdx: 3, role: 'MEMBER' as const },
    // CloudNine
    { userIdx: 8, orgIdx: 4, role: 'OWNER' as const },
    { userIdx: 9, orgIdx: 4, role: 'MEMBER' as const },
    // RetailHub
    { userIdx: 10, orgIdx: 5, role: 'OWNER' as const },
    { userIdx: 11, orgIdx: 5, role: 'ADMIN' as const },
    // SecureCo
    { userIdx: 12, orgIdx: 6, role: 'OWNER' as const },
    { userIdx: 13, orgIdx: 6, role: 'MEMBER' as const },
    // FreelanceHub
    { userIdx: 14, orgIdx: 7, role: 'OWNER' as const },
    { userIdx: 15, orgIdx: 7, role: 'MEMBER' as const },
    // Cross-org memberships
    { userIdx: 18, orgIdx: 7, role: 'VIEWER' as const },
    { userIdx: 19, orgIdx: 2, role: 'VIEWER' as const },
  ];

  let memberCount = 0;
  for (const m of memberAssignments) {
    await prisma.orgMember.upsert({
      where: { userId_orgId: { userId: users[m.userIdx].id, orgId: orgs[m.orgIdx].id } },
      update: {},
      create: {
        userId: users[m.userIdx].id,
        orgId: orgs[m.orgIdx].id,
        role: m.role,
      },
    });
    memberCount++;
  }
  console.log(`  ✅ ${memberCount} org memberships created`);

  // ============================================================
  // 4. TARGETS (25 targets across orgs)
  // ============================================================
  console.log('🎯 Creating targets...');

  const targetsData = [
    // TechCorp (orgIdx 1)
    { orgIdx: 1, type: 'DOMAIN' as const, value: 'techcorp.io', label: 'Main Website', verified: true, score: 78 },
    { orgIdx: 1, type: 'DOMAIN' as const, value: 'api.techcorp.io', label: 'API Gateway', verified: true, score: 85 },
    { orgIdx: 1, type: 'DOMAIN' as const, value: 'staging.techcorp.io', label: 'Staging Env', verified: true, score: 62 },
    { orgIdx: 1, type: 'IP' as const, value: '203.0.113.10', label: 'Production Server', verified: true, score: 71 },
    // StartupX (orgIdx 2)
    { orgIdx: 2, type: 'DOMAIN' as const, value: 'startupx.com', label: 'Main Site', verified: true, score: 55 },
    { orgIdx: 2, type: 'DOMAIN' as const, value: 'app.startupx.com', label: 'Web App', verified: true, score: 68 },
    { orgIdx: 2, type: 'DOMAIN' as const, value: 'blog.startupx.com', label: 'Blog', verified: false, score: null },
    // MegaBank (orgIdx 3)
    { orgIdx: 3, type: 'DOMAIN' as const, value: 'megabank.com', label: 'Corporate Site', verified: true, score: 92 },
    { orgIdx: 3, type: 'DOMAIN' as const, value: 'online.megabank.com', label: 'Online Banking', verified: true, score: 95 },
    { orgIdx: 3, type: 'DOMAIN' as const, value: 'api.megabank.com', label: 'Banking API', verified: true, score: 90 },
    { orgIdx: 3, type: 'IP' as const, value: '198.51.100.50', label: 'Payment Gateway', verified: true, score: 88 },
    { orgIdx: 3, type: 'CIDR' as const, value: '198.51.100.0/24', label: 'Office Network', verified: true, score: 75 },
    // CloudNine (orgIdx 4)
    { orgIdx: 4, type: 'DOMAIN' as const, value: 'cloudnine.dev', label: 'Landing Page', verified: true, score: 80 },
    { orgIdx: 4, type: 'DOMAIN' as const, value: 'dashboard.cloudnine.dev', label: 'Dashboard', verified: true, score: 73 },
    { orgIdx: 4, type: 'DOMAIN' as const, value: 'docs.cloudnine.dev', label: 'Documentation', verified: true, score: 84 },
    // RetailHub (orgIdx 5)
    { orgIdx: 5, type: 'DOMAIN' as const, value: 'retailhub.com', label: 'E-commerce', verified: true, score: 67 },
    { orgIdx: 5, type: 'DOMAIN' as const, value: 'checkout.retailhub.com', label: 'Checkout', verified: true, score: 72 },
    { orgIdx: 5, type: 'DOMAIN' as const, value: 'admin.retailhub.com', label: 'Admin Panel', verified: true, score: 58 },
    // SecureCo (orgIdx 6)
    { orgIdx: 6, type: 'DOMAIN' as const, value: 'secureco.vn', label: 'Company Site', verified: true, score: 88 },
    { orgIdx: 6, type: 'DOMAIN' as const, value: 'portal.secureco.vn', label: 'Client Portal', verified: true, score: 82 },
    // FreelanceHub (orgIdx 7)
    { orgIdx: 7, type: 'DOMAIN' as const, value: 'freelancehub.io', label: 'Platform', verified: true, score: 45 },
    { orgIdx: 7, type: 'DOMAIN' as const, value: 'api.freelancehub.io', label: 'API', verified: false, score: null },
    // More targets
    { orgIdx: 1, type: 'DOMAIN' as const, value: 'mail.techcorp.io', label: 'Mail Server', verified: true, score: 60 },
    { orgIdx: 3, type: 'DOMAIN' as const, value: 'report.megabank.com', label: 'Reporting', verified: true, score: 81 },
    { orgIdx: 4, type: 'IP' as const, value: '172.16.0.100', label: 'Dev Server', verified: true, score: 50 },
  ];

  const targets: any[] = [];
  for (const t of targetsData) {
    try {
      const target = await prisma.target.upsert({
        where: { orgId_value: { orgId: orgs[t.orgIdx].id, value: t.value } },
        update: {},
        create: {
          orgId: orgs[t.orgIdx].id,
          type: t.type,
          value: t.value,
          label: t.label,
          verificationStatus: t.verified ? 'VERIFIED' : 'PENDING',
          verificationMethod: t.verified ? 'DNS_TXT' : null,
          verifiedAt: t.verified ? daysAgo(randomInt(5, 60)) : null,
          scanProfile: pick(['QUICK', 'STANDARD', 'DEEP']),
          securityScore: t.score,
          tags: pickN(['web', 'api', 'internal', 'production', 'staging', 'critical', 'pci'], randomInt(1, 3)),
          lastScanAt: t.verified ? daysAgo(randomInt(0, 7)) : null,
          scanSchedule: t.verified && Math.random() > 0.3 ? pick(['daily', 'weekly', 'monthly']) : null,
          createdAt: daysAgo(randomInt(14, 90)),
        },
      });
      targets.push(target);
    } catch {
      // Skip duplicates silently
    }
  }
  console.log(`  ✅ ${targets.length} targets created`);

  // ============================================================
  // 5. SCANS (50 scans across targets)
  // ============================================================
  console.log('🔍 Creating scans...');

  const statuses: Array<'COMPLETED' | 'FAILED' | 'RUNNING' | 'QUEUED' | 'CANCELLED'> =
    ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED',
     'COMPLETED', 'FAILED', 'RUNNING', 'QUEUED', 'CANCELLED'];
  const modules = ['port_scanner', 'subdomain_finder', 'http_analyzer', 'ssl_checker',
    'dns_enumerator', 'tech_detector', 'vuln_scanner', 'email_security', 'nuclei_scanner'];

  const verifiedTargets = targets.filter((_, i) => targetsData[i]?.verified);
  const scans: any[] = [];

  for (let i = 0; i < 50; i++) {
    const target = pick(verifiedTargets);
    if (!target) continue;
    const orgIdx = targetsData.find(t => t.value === target.value)?.orgIdx ?? 1;
    // Pick a user from that org's members
    const orgMembers = memberAssignments.filter(m => m.orgIdx === orgIdx);
    const creatorIdx = pick(orgMembers)?.userIdx ?? 0;

    const status = pick(statuses);
    const profile = pick(['QUICK', 'STANDARD', 'DEEP']) as any;
    const startedDaysAgo = randomInt(0, 30);
    const scanDuration = status === 'COMPLETED' ? randomInt(30, 600) : status === 'FAILED' ? randomInt(5, 120) : null;
    const startedAt = status !== 'QUEUED' ? daysAgo(startedDaysAgo) : null;
    const completedAt = (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') && startedAt
      ? new Date(startedAt.getTime() + (scanDuration || 60) * 1000) : null;

    const totalVulns = status === 'COMPLETED' ? randomInt(0, 25) : 0;
    const critical = status === 'COMPLETED' ? randomInt(0, Math.min(3, totalVulns)) : 0;
    const high = status === 'COMPLETED' ? randomInt(0, Math.min(5, totalVulns - critical)) : 0;
    const medium = status === 'COMPLETED' ? randomInt(0, Math.min(8, totalVulns - critical - high)) : 0;
    const low = status === 'COMPLETED' ? Math.max(0, totalVulns - critical - high - medium - randomInt(0, 3)) : 0;
    const info = status === 'COMPLETED' ? Math.max(0, totalVulns - critical - high - medium - low) : 0;

    const scan = await prisma.scan.create({
      data: {
        targetId: target.id,
        createdById: users[creatorIdx].id,
        type: pick(['ON_DEMAND', 'SCHEDULED', 'ON_DEMAND']) as any,
        profile,
        status,
        modules: pickN(modules, randomInt(3, 7)),
        progress: status === 'COMPLETED' ? 100 : status === 'RUNNING' ? randomInt(10, 85) : status === 'QUEUED' ? 0 : randomInt(5, 95),
        startedAt,
        completedAt,
        duration: scanDuration,
        errorMessage: status === 'FAILED' ? pick([
          'Connection timeout after 30s',
          'DNS resolution failed for target',
          'Target returned HTTP 503 - Service Unavailable',
          'Scanner module nuclei_scanner crashed unexpectedly',
          'Rate limit exceeded by target WAF',
        ]) : null,
        totalAssets: status === 'COMPLETED' ? randomInt(3, 50) : null,
        newAssets: status === 'COMPLETED' ? randomInt(0, 10) : null,
        totalVulns: totalVulns > 0 ? totalVulns : null,
        criticalCount: critical,
        highCount: high,
        mediumCount: medium,
        lowCount: low,
        infoCount: info,
        createdAt: daysAgo(startedDaysAgo),
      },
    });
    scans.push(scan);
  }
  console.log(`  ✅ ${scans.length} scans created`);

  // ============================================================
  // 6. ASSETS (discovered assets)
  // ============================================================
  console.log('🔗 Creating assets...');

  const subdomains = [
    'www', 'mail', 'api', 'staging', 'dev', 'admin', 'portal', 'cdn',
    'blog', 'docs', 'app', 'test', 'vpn', 'ftp', 'ns1', 'ns2',
    'mx', 'smtp', 'webmail', 'monitor', 'status', 'support'
  ];

  let assetCount = 0;
  for (const target of verifiedTargets.slice(0, 15)) {
    const tData = targetsData.find(t => t.value === target.value);
    if (!tData || tData.type !== 'DOMAIN') continue;
    const domain = target.value;
    const numAssets = randomInt(3, 10);

    for (let i = 0; i < numAssets; i++) {
      const sub = pick(subdomains);
      const assetValue = `${sub}.${domain}`;
      try {
        await prisma.asset.create({
          data: {
            targetId: target.id,
            type: 'SUBDOMAIN',
            value: assetValue,
            ip: `${randomInt(10, 200)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`,
            ports: [80, 443, ...(Math.random() > 0.5 ? [8080] : []), ...(Math.random() > 0.7 ? [22] : [])],
            httpStatus: pick([200, 200, 200, 301, 403, 404, 500]),
            title: `${sub.charAt(0).toUpperCase() + sub.slice(1)} - ${domain}`,
            technologies: pickN(['nginx', 'apache', 'cloudflare', 'react', 'nodejs', 'php', 'wordpress', 'jquery', 'bootstrap'], randomInt(1, 4)),
            firstSeenAt: daysAgo(randomInt(10, 60)),
            lastSeenAt: daysAgo(randomInt(0, 3)),
          },
        });
        assetCount++;
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log(`  ✅ ${assetCount} assets created`);

  // ============================================================
  // 7. VULNERABILITY FINDINGS
  // ============================================================
  console.log('🐛 Creating vulnerability findings...');

  const vulnTemplates = [
    { title: 'Missing X-Frame-Options Header', severity: 'MEDIUM' as const, category: 'SECURITY_HEADERS' as const, cvss: 4.3 },
    { title: 'Missing Content-Security-Policy', severity: 'MEDIUM' as const, category: 'SECURITY_HEADERS' as const, cvss: 5.0 },
    { title: 'Missing Strict-Transport-Security', severity: 'MEDIUM' as const, category: 'SECURITY_HEADERS' as const, cvss: 4.8 },
    { title: 'SSL Certificate Expiring Soon', severity: 'HIGH' as const, category: 'CERT_ISSUE' as const, cvss: 7.1 },
    { title: 'Weak TLS Configuration (TLS 1.0)', severity: 'HIGH' as const, category: 'SSL_TLS' as const, cvss: 7.5 },
    { title: 'Self-Signed SSL Certificate', severity: 'HIGH' as const, category: 'CERT_ISSUE' as const, cvss: 6.8 },
    { title: 'SQL Injection in Login Form', severity: 'CRITICAL' as const, category: 'SQL_INJECTION' as const, cvss: 9.8 },
    { title: 'Reflected XSS in Search Parameter', severity: 'HIGH' as const, category: 'XSS_REFLECTED' as const, cvss: 7.1 },
    { title: 'Stored XSS in Comment Field', severity: 'CRITICAL' as const, category: 'XSS_STORED' as const, cvss: 9.0 },
    { title: 'Directory Listing Enabled on /backup/', severity: 'MEDIUM' as const, category: 'DIRECTORY_LISTING' as const, cvss: 5.3 },
    { title: 'Exposed .env Configuration File', severity: 'CRITICAL' as const, category: 'SENSITIVE_FILE' as const, cvss: 9.1 },
    { title: 'Server Version Disclosure', severity: 'LOW' as const, category: 'INFO_DISCLOSURE' as const, cvss: 3.1 },
    { title: 'CORS Wildcard Configuration', severity: 'MEDIUM' as const, category: 'CORS_MISCONFIG' as const, cvss: 5.8 },
    { title: 'Missing SPF Record', severity: 'MEDIUM' as const, category: 'EMAIL_SECURITY' as const, cvss: 4.5 },
    { title: 'Missing DMARC Record', severity: 'LOW' as const, category: 'EMAIL_SECURITY' as const, cvss: 3.5 },
    { title: 'Open Redirect Vulnerability', severity: 'MEDIUM' as const, category: 'OPEN_REDIRECT' as const, cvss: 6.1 },
    { title: 'HTTP TRACE Method Enabled', severity: 'LOW' as const, category: 'HTTP_METHODS' as const, cvss: 3.0 },
    { title: 'Cookie Without HttpOnly Flag', severity: 'LOW' as const, category: 'COOKIE_SECURITY' as const, cvss: 3.8 },
    { title: 'Cookie Without Secure Flag', severity: 'LOW' as const, category: 'COOKIE_SECURITY' as const, cvss: 3.5 },
    { title: 'Outdated jQuery v2.1.4 Detected', severity: 'MEDIUM' as const, category: 'OUTDATED_SOFTWARE' as const, cvss: 5.4 },
    { title: 'Outdated WordPress v5.2 Detected', severity: 'HIGH' as const, category: 'OUTDATED_SOFTWARE' as const, cvss: 7.8 },
    { title: 'SSRF via Image URL Parameter', severity: 'CRITICAL' as const, category: 'SSRF' as const, cvss: 9.3 },
    { title: 'Path Traversal in File Download', severity: 'HIGH' as const, category: 'PATH_TRAVERSAL' as const, cvss: 8.2 },
    { title: 'Default Admin Credentials Found', severity: 'CRITICAL' as const, category: 'DEFAULT_CREDENTIALS' as const, cvss: 9.8 },
    { title: 'X-Powered-By Header Disclosure', severity: 'INFO' as const, category: 'INFO_DISCLOSURE' as const, cvss: 0.0 },
    { title: 'Robots.txt Sensitive Paths', severity: 'INFO' as const, category: 'INFO_DISCLOSURE' as const, cvss: 0.0 },
    { title: 'DNS Zone Transfer Allowed', severity: 'HIGH' as const, category: 'INFO_DISCLOSURE' as const, cvss: 7.5 },
    { title: 'Subdomain Takeover Possible', severity: 'HIGH' as const, category: 'OTHER' as const, cvss: 8.0 },
  ];

  const completedScans = scans.filter(s => s.status === 'COMPLETED');
  let vulnCount = 0;

  for (const scan of completedScans) {
    const numVulns = randomInt(1, 8);
    const selectedVulns = pickN(vulnTemplates, numVulns);
    const findingStatuses: Array<'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'ACCEPTED' | 'FALSE_POSITIVE'> =
      ['OPEN', 'OPEN', 'OPEN', 'IN_PROGRESS', 'FIXED', 'ACCEPTED', 'FALSE_POSITIVE'];

    for (const vuln of selectedVulns) {
      try {
        await prisma.vulnFinding.create({
          data: {
            scanId: scan.id,
            title: vuln.title,
            description: `${vuln.title} was detected on the target. This vulnerability could allow an attacker to exploit the system. Immediate remediation is recommended.`,
            severity: vuln.severity,
            cvssScore: vuln.cvss,
            cvssVector: vuln.cvss > 0 ? `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` : null,
            category: vuln.category,
            owaspCategory: pick(['A01:2021-Broken Access Control', 'A02:2021-Cryptographic Failures', 'A03:2021-Injection', 'A05:2021-Security Misconfiguration', 'A06:2021-Vulnerable Components']),
            affectedUrl: `https://${pick(verifiedTargets)?.value || 'example.com'}/${pick(['login', 'api/v1/users', 'search', 'admin', 'upload', ''])}`,
            remediation: `Apply the recommended fix for ${vuln.title}. Refer to OWASP guidelines for best practices.`,
            references: [`https://owasp.org/Top10/`, `https://cve.mitre.org/`],
            status: pick(findingStatuses),
            falsePositive: Math.random() > 0.9,
            firstFoundAt: daysAgo(randomInt(5, 45)),
            lastFoundAt: daysAgo(randomInt(0, 5)),
            occurrences: randomInt(1, 5),
          },
        });
        vulnCount++;
      } catch {
        // Skip
      }
    }
  }
  console.log(`  ✅ ${vulnCount} vulnerability findings created`);

  // ============================================================
  // 8. NOTIFICATIONS
  // ============================================================
  console.log('🔔 Creating notifications...');

  const notifTypes: Array<'SCAN_COMPLETED' | 'SCAN_FAILED' | 'CRITICAL_VULN_FOUND' | 'HIGH_VULN_FOUND' | 'NEW_ASSET_DISCOVERED' | 'SYSTEM'> =
    ['SCAN_COMPLETED', 'SCAN_FAILED', 'CRITICAL_VULN_FOUND', 'HIGH_VULN_FOUND', 'NEW_ASSET_DISCOVERED', 'SYSTEM'];

  let notifCount = 0;
  for (const user of users.slice(0, 14)) {
    const numNotifs = randomInt(3, 12);
    for (let i = 0; i < numNotifs; i++) {
      const type = pick(notifTypes);
      await prisma.notification.create({
        data: {
          userId: user.id,
          type,
          title: type === 'SCAN_COMPLETED' ? 'Scan Completed'
            : type === 'SCAN_FAILED' ? 'Scan Failed'
            : type === 'CRITICAL_VULN_FOUND' ? 'Critical Vulnerability Found'
            : type === 'HIGH_VULN_FOUND' ? 'High Severity Vulnerability'
            : type === 'NEW_ASSET_DISCOVERED' ? 'New Asset Discovered'
            : 'System Notification',
          message: type === 'SCAN_COMPLETED' ? `Scan on ${pick(verifiedTargets)?.value || 'target'} completed successfully with findings.`
            : type === 'SCAN_FAILED' ? `Scan on ${pick(verifiedTargets)?.value || 'target'} failed. Check error details.`
            : type === 'CRITICAL_VULN_FOUND' ? `Critical vulnerability "${pick(vulnTemplates).title}" found on target.`
            : type === 'HIGH_VULN_FOUND' ? `High severity vulnerability detected. Review recommended.`
            : type === 'NEW_ASSET_DISCOVERED' ? `New subdomain discovered: ${pick(subdomains)}.${pick(verifiedTargets)?.value || 'example.com'}`
            : 'System maintenance scheduled for this weekend.',
          isRead: Math.random() > 0.4,
          readAt: Math.random() > 0.4 ? daysAgo(randomInt(0, 5)) : null,
          createdAt: daysAgo(randomInt(0, 20)),
        },
      });
      notifCount++;
    }
  }
  console.log(`  ✅ ${notifCount} notifications created`);

  // ============================================================
  // 9. REPORTS
  // ============================================================
  console.log('📊 Creating reports...');

  const reportTypes: Array<'EXECUTIVE_SUMMARY' | 'TECHNICAL_DETAIL' | 'COMPLIANCE_OWASP' | 'ASSET_INVENTORY'> =
    ['EXECUTIVE_SUMMARY', 'TECHNICAL_DETAIL', 'COMPLIANCE_OWASP', 'ASSET_INVENTORY'];

  let reportCount = 0;
  for (let i = 1; i <= 7; i++) {
    const numReports = randomInt(1, 4);
    for (let j = 0; j < numReports; j++) {
      const rType = pick(reportTypes);
      await prisma.report.create({
        data: {
          orgId: orgs[i].id,
          type: rType,
          title: `${rType.replace(/_/g, ' ')} - ${orgs[i].name} - ${new Date().toISOString().split('T')[0]}`,
          format: pick(['PDF', 'HTML', 'CSV']),
          status: pick(['completed', 'completed', 'completed', 'generating', 'failed']),
          fileSize: randomInt(50000, 5000000),
          generatedAt: daysAgo(randomInt(0, 30)),
          createdAt: daysAgo(randomInt(0, 30)),
        },
      });
      reportCount++;
    }
  }
  console.log(`  ✅ ${reportCount} reports created`);

  // ============================================================
  // 10. WEBHOOKS
  // ============================================================
  console.log('🔗 Creating webhooks...');

  const webhooksData = [
    { orgIdx: 1, name: 'Slack Alerts', url: 'https://hooks.slack.com/services/T00/B00/xxx', events: ['scan.completed', 'vuln.critical'] },
    { orgIdx: 1, name: 'PagerDuty', url: 'https://events.pagerduty.com/v2/enqueue', events: ['vuln.critical', 'scan.failed'] },
    { orgIdx: 3, name: 'Security SIEM', url: 'https://siem.megabank.com/webhook/vulnscan', events: ['scan.completed', 'vuln.critical', 'vuln.high'] },
    { orgIdx: 3, name: 'Jira Integration', url: 'https://megabank.atlassian.net/rest/webhooks/1.0', events: ['vuln.critical', 'vuln.high'] },
    { orgIdx: 4, name: 'Discord Notify', url: 'https://discord.com/api/webhooks/1234/abcd', events: ['scan.completed'] },
    { orgIdx: 6, name: 'Telegram Bot', url: 'https://api.telegram.org/bot123/sendMessage', events: ['scan.completed', 'vuln.critical'] },
  ];

  for (const w of webhooksData) {
    await prisma.webhook.create({
      data: {
        orgId: orgs[w.orgIdx].id,
        name: w.name,
        url: w.url,
        events: w.events,
        isActive: Math.random() > 0.15,
        lastTriggeredAt: Math.random() > 0.3 ? daysAgo(randomInt(0, 14)) : null,
      },
    });
  }
  console.log(`  ✅ ${webhooksData.length} webhooks created`);

  // ============================================================
  // 11. AUDIT LOGS (admin activity history)
  // ============================================================
  console.log('📋 Creating audit logs...');

  const auditActions = [
    { action: 'user.update', entity: 'user', details: { field: 'systemRole', oldValue: 'USER', newValue: 'ADMIN' } },
    { action: 'user.deactivate', entity: 'user', details: { reason: 'Account inactive for 90 days' } },
    { action: 'user.activate', entity: 'user', details: { reason: 'Reactivated by admin' } },
    { action: 'user.password_reset', entity: 'user', details: { resetBy: 'admin' } },
    { action: 'organization.update', entity: 'organization', details: { field: 'plan', oldValue: 'STARTER', newValue: 'PROFESSIONAL' } },
    { action: 'organization.update', entity: 'organization', details: { field: 'maxTargets', oldValue: 5, newValue: 25 } },
    { action: 'setting.update', entity: 'setting', details: { key: 'security.max_login_attempts', oldValue: 5, newValue: 3 } },
    { action: 'setting.update', entity: 'setting', details: { key: 'scanner.max_concurrent_scans', oldValue: 5, newValue: 10 } },
    { action: 'setting.update', entity: 'setting', details: { key: 'app.maintenance_mode', oldValue: false, newValue: true } },
    { action: 'setting.update', entity: 'setting', details: { key: 'app.maintenance_mode', oldValue: true, newValue: false } },
    { action: 'scan.cancel', entity: 'scan', details: { reason: 'Manual cancellation by admin' } },
    { action: 'user.delete', entity: 'user', details: { email: 'spam@malicious.org', reason: 'Suspicious activity' } },
    { action: 'organization.delete', entity: 'organization', details: { name: 'Test Org', reason: 'Unused trial account' } },
    { action: 'user.update', entity: 'user', details: { field: 'emailVerified', oldValue: false, newValue: true } },
    { action: 'organization.update', entity: 'organization', details: { field: 'isActive', oldValue: true, newValue: false } },
  ];

  const adminUsers = users.filter(u => ['SUPER_ADMIN', 'ADMIN'].includes(u.systemRole));
  let auditCount = 0;

  for (let i = 0; i < 40; i++) {
    const template = pick(auditActions);
    const adminUser = pick(adminUsers);
    const targetUser = pick(users.filter(u => u.systemRole === 'USER'));
    const targetOrg = pick(orgs.slice(1));

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: template.action,
        entity: template.entity,
        entityId: template.entity === 'user' ? targetUser?.id : template.entity === 'organization' ? targetOrg?.id : null,
        details: template.details,
        ipAddress: pick(['192.168.1.100', '10.0.0.50', '203.162.4.190', '113.161.72.95']),
        userAgent: pick([
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/17.0',
          'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0',
        ]),
        createdAt: daysAgo(randomInt(0, 30)),
      },
    });
    auditCount++;
  }
  console.log(`  ✅ ${auditCount} audit logs created`);

  // ============================================================
  // 12. SYSTEM SETTINGS
  // ============================================================
  console.log('⚙️  Seeding system settings...');

  const defaultSettings = [
    { key: 'app.name', value: 'VulnScan ASM', category: 'general', label: 'Application Name' },
    { key: 'app.description', value: 'Attack Surface Management Platform', category: 'general', label: 'Description' },
    { key: 'app.maintenance_mode', value: false, category: 'general', label: 'Maintenance Mode' },
    { key: 'security.max_login_attempts', value: 5, category: 'security', label: 'Max Login Attempts' },
    { key: 'security.lockout_duration_minutes', value: 15, category: 'security', label: 'Lockout Duration (min)' },
    { key: 'security.session_timeout_minutes', value: 60, category: 'security', label: 'Session Timeout (min)' },
    { key: 'security.require_email_verification', value: true, category: 'security', label: 'Require Email Verification' },
    { key: 'security.allow_registration', value: true, category: 'security', label: 'Allow Public Registration' },
    { key: 'email.smtp_host', value: 'localhost', category: 'email', label: 'SMTP Host' },
    { key: 'email.smtp_port', value: 1025, category: 'email', label: 'SMTP Port' },
    { key: 'email.from_address', value: 'noreply@vulnscan.local', category: 'email', label: 'From Address' },
    { key: 'scanner.max_concurrent_scans', value: 5, category: 'scanner', label: 'Max Concurrent Scans' },
    { key: 'scanner.default_profile', value: 'STANDARD', category: 'scanner', label: 'Default Scan Profile' },
    { key: 'scanner.request_timeout_seconds', value: 30, category: 'scanner', label: 'Request Timeout (sec)' },
    { key: 'scanner.max_targets_per_scan', value: 100, category: 'scanner', label: 'Max Targets Per Scan' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value, category: s.category, label: s.label },
    });
  }
  console.log(`  ✅ ${defaultSettings.length} system settings seeded`);

  // ============================================================
  // SUMMARY
  // ============================================================
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.orgMember.count(),
    prisma.target.count(),
    prisma.scan.count(),
    prisma.asset.count(),
    prisma.vulnFinding.count(),
    prisma.notification.count(),
    prisma.report.count(),
    prisma.webhook.count(),
    prisma.auditLog.count(),
    prisma.systemSetting.count(),
  ]);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seeding complete! Database summary:');
  console.log('='.repeat(50));
  console.log(`  👤 Users:           ${counts[0]}`);
  console.log(`  🏢 Organizations:   ${counts[1]}`);
  console.log(`  👥 Org Members:     ${counts[2]}`);
  console.log(`  🎯 Targets:         ${counts[3]}`);
  console.log(`  🔍 Scans:           ${counts[4]}`);
  console.log(`  🔗 Assets:          ${counts[5]}`);
  console.log(`  🐛 Vulnerabilities: ${counts[6]}`);
  console.log(`  🔔 Notifications:   ${counts[7]}`);
  console.log(`  📊 Reports:         ${counts[8]}`);
  console.log(`  🔗 Webhooks:        ${counts[9]}`);
  console.log(`  📋 Audit Logs:      ${counts[10]}`);
  console.log(`  ⚙️  Settings:        ${counts[11]}`);
  console.log('='.repeat(50));
  console.log('\n🔑 Login credentials:');
  console.log('  Super Admin: admin@vulnscan.local / Test@1234');
  console.log('  Admin:       admin2@vulnscan.local / Test@1234');
  console.log('  Users:       john.doe@techcorp.io / Test@1234 (etc.)');

  process.exit(0);
}

seedData().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
