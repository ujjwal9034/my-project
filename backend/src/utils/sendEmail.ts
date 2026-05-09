/**
 * FreshMarket Email Utility
 * 
 * Uses HTTP-based email delivery (not SMTP) because Render's free tier
 * blocks outbound SMTP ports (25, 465, 587).
 * 
 * Strategy:
 * 1. If RESEND_API_KEY is set → use Resend HTTP API (fastest, recommended)
 * 2. If BREVO_API_KEY is set → use Brevo HTTP API (300 emails/day free)
 * 3. If SMTP_USER + SMTP_PASS are set → try SMTP (won't work on Render free)
 * 4. Fallback → log to console
 */

interface SendEmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const sendEmail = async (options: SendEmailOptions) => {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@freshmarket.com';
  const fromName = process.env.FROM_NAME || 'FreshMarket';
  const htmlContent = options.html || buildPremiumEmail(options.subject, options.message);

  // ── Method 1: Brevo HTTP API (300 emails/day free) ──
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    return sendViaBrevо(brevoKey, fromName, fromEmail, options, htmlContent);
  }

  // ── Method 2: Resend HTTP API (100 emails/day free) ──
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    return sendViaResend(resendKey, fromName, fromEmail, options, htmlContent);
  }

  // ── Method 3: SMTP (won't work on Render free tier) ──
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    return sendViaSMTP(smtpUser, smtpPass, fromName, fromEmail, options, htmlContent);
  }

  // ── Fallback: Console ──
  console.log('━━━ EMAIL (Console — no API key configured) ━━━');
  console.log(`  To: ${options.email} | Subject: ${options.subject}`);
  console.log(`  Set BREVO_API_KEY or RESEND_API_KEY in environment`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

// ── Brevo (Sendinblue) HTTP API ──────────────────────────────────────────────
async function sendViaBrevо(
  apiKey: string, fromName: string, fromEmail: string,
  options: SendEmailOptions, html: string
) {
  console.log(`📧 Sending via Brevo → ${options.email}`);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: options.email }],
      subject: options.subject,
      htmlContent: html,
      textContent: options.message,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Brevo FAILED (${res.status}):`, err);
    throw new Error(`Brevo email failed: ${err}`);
  }
  console.log(`✅ Email sent via Brevo → ${options.email}`);
}

// ── Resend HTTP API ──────────────────────────────────────────────────────────
async function sendViaResend(
  apiKey: string, fromName: string, fromEmail: string,
  options: SendEmailOptions, html: string
) {
  console.log(`📧 Sending via Resend → ${options.email}`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [options.email],
      subject: options.subject,
      html: html,
      text: options.message,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Resend FAILED (${res.status}):`, err);
    throw new Error(`Resend email failed: ${err}`);
  }
  console.log(`✅ Email sent via Resend → ${options.email}`);
}

// ── SMTP Fallback (won't work on Render free tier) ───────────────────────────
async function sendViaSMTP(
  user: string, pass: string, fromName: string, fromEmail: string,
  options: SendEmailOptions, html: string
) {
  console.log(`📧 Sending via SMTP → ${options.email}`);
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });

  const info = await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: html,
  });
  console.log(`✅ Email sent via SMTP → ${options.email} (${info.messageId})`);
}

// ── Premium HTML Email Template ──────────────────────────────────────────────
function buildPremiumEmail(subject: string, textContent: string): string {
  const title = subject
    .replace('FreshMarket - ', '')
    .replace('FreshMarket — ', '')
    .replace('FreshMarket – ', '');
  const year = new Date().getFullYear();

  const bodyHtml = textContent
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      // 6-digit verification code
      const codeMatch = line.match(/\b(\d{6})\b/);
      if (codeMatch) {
        const code = codeMatch[1];
        const parts = line.split(code);
        return `
          ${parts[0] ? `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">${parts[0].trim()}</p>` : ''}
          <div style="text-align:center;margin:28px 0;">
            <div style="display:inline-block;background:#f0fdf4;border:2px dashed #22c55e;border-radius:16px;padding:20px 48px;">
              <span style="font-size:42px;font-weight:900;letter-spacing:14px;color:#16a34a;font-family:'Courier New',monospace;">${code}</span>
            </div>
            <p style="margin:12px 0 0;color:#94a3b8;font-size:12px;">This code expires in 10 minutes</p>
          </div>
          ${parts[1] ? `<p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">${parts[1].trim()}</p>` : ''}`;
      }
      // URL → button
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const textBefore = line.substring(0, line.indexOf(url)).trim();
        const isReset = subject.toLowerCase().includes('reset');
        return `
          ${textBefore ? `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">${textBefore}</p>` : ''}
          <div style="text-align:center;margin:28px 0;">
            <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;padding:16px 40px;border-radius:14px;text-decoration:none;font-weight:800;font-size:16px;box-shadow:0 6px 20px rgba(34,197,94,0.35);">
              ${isReset ? '🔑 Reset My Password' : '✅ Verify Now'}
            </a>
          </div>
          <p style="margin:0;text-align:center;color:#94a3b8;font-size:11px;word-break:break-all;">Or copy: <span style="color:#64748b;">${url}</span></p>`;
      }
      return `<p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.7;">${line.trim()}</p>`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#059669 0%,#16a34a 50%,#22c55e 100%);padding:40px 32px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:16px;padding:12px 16px;margin-bottom:12px;">
        <span style="font-size:32px;">🥬</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;">FreshMarket</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Fresh groceries, delivered fast</p>
    </div>
    <div style="padding:36px 32px 28px;">
      <h2 style="margin:0 0 24px;color:#0f172a;font-size:22px;font-weight:800;">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:0 32px 24px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">🔒 <strong>Security Notice:</strong> FreshMarket will never ask for your password via email. If you didn't request this, you can safely ignore it.</p>
      </div>
    </div>
    <div style="padding:20px 32px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;">FreshMarket</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;">Your local grocery marketplace</p>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#cbd5e1;font-size:10px;">© ${year} FreshMarket. All rights reserved.</p>
      </div>
    </div>
  </div>
</body></html>`;
}

export default sendEmail;
