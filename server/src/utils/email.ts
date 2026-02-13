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
