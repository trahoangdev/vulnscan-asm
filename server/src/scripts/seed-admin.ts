import prisma from '../config/database';
import { hashPassword, generateSlug } from '../utils/crypto';

/**
 * Seed script — creates default super admin + system settings
 * Run: npx tsx src/scripts/seed-admin.ts
 */
async function seedAdmin() {
  console.log('🌱 Seeding admin data...');

  // 1. Create super admin user
  const adminEmail = 'admin@vulnscan.local';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await hashPassword('Admin@1234');
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
        systemRole: 'SUPER_ADMIN',
        emailVerified: true,
      },
    });

    // Create admin organization
    const org = await prisma.organization.create({
      data: {
        name: 'System Admin',
        slug: generateSlug('System Admin'),
        plan: 'ENTERPRISE',
        maxTargets: 9999,
        maxScansPerMonth: 9999,
      },
    });

    await prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: 'OWNER',
      },
    });

    console.log(`✅ Super Admin created: ${adminEmail} / Admin@1234`);
  } else {
    // Ensure they have SUPER_ADMIN role
    await prisma.user.update({
      where: { email: adminEmail },
      data: { systemRole: 'SUPER_ADMIN' },
    });
    console.log(`✅ Super Admin already exists (role enforced): ${adminEmail}`);
  }

  // 2. Seed default system settings
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
  console.log(`✅ ${defaultSettings.length} system settings seeded`);

  // 3. Promote test user to admin if exists
  const testUser = await prisma.user.findUnique({ where: { email: 'test3@test.com' } });
  if (testUser) {
    await prisma.user.update({
      where: { email: 'test3@test.com' },
      data: { systemRole: 'ADMIN' },
    });
    console.log('✅ test3@test.com promoted to ADMIN');
  }

  console.log('\n🎉 Admin seeding complete!');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
