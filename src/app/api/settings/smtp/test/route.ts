import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageSettings } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageSettings(principal)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = await request.json();
  if (!cfg.host) {
    return NextResponse.json({ error: "SMTP host is required", message: "SMTP host is required" }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port || 587,
      secure: cfg.secure || false,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });

    await transporter.verify();

    // Send test email to the current user if they have an email
    if (principal.email) {
      await transporter.sendMail({
        from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddress}>` : cfg.fromAddress || cfg.user,
        to: principal.email,
        subject: "ClawKB SMTP Test",
        html: `<p>This is a test email from ClawKB. SMTP is configured correctly!</p>`,
      });
      return NextResponse.json({ ok: true, message: `Test email sent to ${principal.email}` });
    }

    return NextResponse.json({ ok: true, message: "SMTP connection verified successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
