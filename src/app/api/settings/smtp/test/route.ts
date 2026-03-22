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

    // Send test email — prefer user's email, fallback to fromAddress/user
    const recipient = principal.email || cfg.fromAddress || cfg.user;
    if (recipient) {
      await transporter.sendMail({
        from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddress}>` : cfg.fromAddress || cfg.user,
        to: recipient,
        subject: "ClawKB SMTP Test",
        html: `<p>This is a test email from ClawKB. SMTP is configured correctly! ✅</p><p style="color:#888;font-size:12px">Sent at ${new Date().toISOString()}</p>`,
      });
      return NextResponse.json({ ok: true, message: `Test email sent to ${recipient}` });
    }

    return NextResponse.json({ ok: true, message: "SMTP connection verified successfully (no recipient email found)" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
