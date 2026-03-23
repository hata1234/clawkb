import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSetting, DEFAULT_SMTP, type SmtpConfig } from "./settings";

let _transporter: Transporter | null = null;
let _lastConfig: string | null = null;

export async function getSmtpConfig(): Promise<SmtpConfig> {
  return getSetting("smtp", DEFAULT_SMTP);
}

export async function getTransporter(): Promise<Transporter | null> {
  const cfg = await getSmtpConfig();
  if (!cfg.enabled || !cfg.host) return null;

  const configKey = JSON.stringify({ host: cfg.host, port: cfg.port, secure: cfg.secure, user: cfg.user });
  if (_transporter && _lastConfig === configKey) return _transporter;

  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  _lastConfig = configKey;
  return _transporter;
}

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  try {
    const cfg = await getSmtpConfig();
    const transporter = await getTransporter();
    if (!transporter) return false;

    await transporter.sendMail({
      from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddress}>` : cfg.fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    return true;
  } catch (err) {
    console.error("[email] sendEmail failed:", err);
    return false;
  }
}

export async function sendVerificationEmail(
  user: { email: string; displayName?: string | null; username: string },
  token: string,
): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  const name = user.displayName || user.username;

  return sendEmail(
    user.email,
    "Verify your email — ClawKB",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#333">Welcome to ClawKB, ${name}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Verify Email</a></p>
      <p style="color:#888;font-size:0.85rem">Or copy this link: ${verifyUrl}</p>
      <p style="color:#888;font-size:0.85rem">This link expires in 24 hours.</p>
    </div>`,
  );
}

export async function sendPasswordResetEmail(
  user: { email: string; displayName?: string | null; username: string },
  token: string,
): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const name = user.displayName || user.username;

  return sendEmail(
    user.email,
    "Reset your password — ClawKB",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#333">Password Reset</h2>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a></p>
      <p style="color:#888;font-size:0.85rem">Or copy this link: ${resetUrl}</p>
      <p style="color:#888;font-size:0.85rem">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>`,
  );
}

export async function sendNotificationEmail(
  user: { email: string; displayName?: string | null; username: string },
  subject: string,
  body: string,
): Promise<boolean> {
  const name = user.displayName || user.username;
  return sendEmail(
    user.email,
    subject,
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <p>Hi ${name},</p>
      <div>${body}</div>
      <p style="color:#888;font-size:0.85rem;margin-top:24px">— ClawKB</p>
    </div>`,
  );
}
