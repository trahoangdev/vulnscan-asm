import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  ...(env.SMTP_USER && {
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  }),
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"${env.APP_NAME}" <${env.SMTP_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}

// ===== Email Templates =====

export function verificationEmailHtml(name: string, verifyUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Welcome to ${env.APP_NAME}!</h2>
      <p>Hi ${name},</p>
      <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verify Email
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verifyUrl}">${verifyUrl}</a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
      </p>
    </div>
  `;
}

export function resetPasswordEmailHtml(name: string, resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">${env.APP_NAME} — Password Reset</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #dc2626; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        If you didn't request this, you can safely ignore this email.<br>
        This link expires in 1 hour.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
      </p>
    </div>
  `;
}

/**
 * Weekly digest email template
 */
export function weeklyDigestEmailHtml(
  name: string,
  orgName: string,
  stats: {
    newFindings: number;
    fixedFindings: number;
    criticalOpen: number;
    highOpen: number;
    totalOpen: number;
    scansRun: number;
    newAssets: number;
  },
  dashboardUrl: string,
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">📊 Weekly Security Digest — ${env.APP_NAME}</h2>
      <p>Hi ${name},</p>
      <p>Here's your weekly security summary for <strong>${orgName}</strong>:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 14px; text-align: center; background: #fef2f2; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${stats.criticalOpen}</div>
            <div style="font-size: 12px; color: #6b7280;">Critical Open</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 14px; text-align: center; background: #fff7ed; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: 700; color: #f97316;">${stats.highOpen}</div>
            <div style="font-size: 12px; color: #6b7280;">High Open</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 14px; text-align: center; background: #eff6ff; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: 700; color: #2563eb;">${stats.totalOpen}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Open</div>
          </td>
        </tr>
      </table>

      <h3 style="color: #374151;">This Week's Activity</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px;">
        <tr><td style="padding: 6px 0;">🔍 Scans completed</td><td style="text-align: right; font-weight: 600;">${stats.scansRun}</td></tr>
        <tr><td style="padding: 6px 0;">🆕 New findings</td><td style="text-align: right; font-weight: 600; color: #ef4444;">${stats.newFindings}</td></tr>
        <tr><td style="padding: 6px 0;">✅ Fixed findings</td><td style="text-align: right; font-weight: 600; color: #16a34a;">${stats.fixedFindings}</td></tr>
        <tr><td style="padding: 6px 0;">🌐 New assets discovered</td><td style="text-align: right; font-weight: 600;">${stats.newAssets}</td></tr>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 30px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Dashboard
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
      </p>
    </div>
  `;
}export function securityAlertEmailHtml(
  name: string,
  target: string,
  findings: Array<{ title: string; severity: string; category: string }>,
  dashboardUrl: string,
): string {
  const severityColor: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    INFO: '#9ca3af',
  };

  const findingRows = findings
    .map(
      (f) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; 
                       background-color: ${severityColor[f.severity] || '#9ca3af'}; color: white;
                       font-size: 11px; font-weight: bold; text-transform: uppercase;">
            ${f.severity}
          </span>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${f.title}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
          ${f.category.replace(/_/g, ' ')}
        </td>
      </tr>`,
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🚨 Security Alert — ${env.APP_NAME}</h2>
      <p>Hi ${name},</p>
      <p>A scan on <strong>${target}</strong> has discovered 
         <strong>${findings.length}</strong> critical/high severity finding(s) 
         that require your attention:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Severity</th>
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Finding</th>
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Category</th>
          </tr>
        </thead>
        <tbody>
          ${findingRows}
        </tbody>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Full Report
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        We recommend reviewing and remediating these findings as soon as possible.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
      </p>
    </div>
  `;
}
