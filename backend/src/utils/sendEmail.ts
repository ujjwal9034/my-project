import nodemailer from 'nodemailer';

interface SendEmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

// ── Persistent transporter cache (reuse SMTP connection) ──
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(user: string, pass: string): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  console.log(`📧 Creating SMTP transporter for: ${user}`);
  
  // Use explicit SMTP config — port 587 + STARTTLS works on Render
  // (service: 'gmail' uses port 465/SSL which some hosts block)
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,          // false = STARTTLS on port 587
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,  // Needed for Render's network
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  // Verify connection in background (logs result, doesn't block)
  cachedTransporter.verify()
    .then(() => console.log('✅ SMTP connection verified — emails will send'))
    .catch((err) => {
      console.error('❌ SMTP verification FAILED:', err.message);
      console.error('   Check SMTP_USER and SMTP_PASS (App Password, no spaces)');
      cachedTransporter = null;
    });

  return cachedTransporter;
}

/**
 * Sends an email using Gmail App Password.
 * Falls back to console if no credentials are set.
 */
const sendEmail = async (options: SendEmailOptions) => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || 'noreply@freshmarket.com';
  const fromName = process.env.FROM_NAME || 'FreshMarket';

  // ── Fallback: no credentials → log to console ──
  if (!user || !pass) {
    console.log('━━━ EMAIL (Console Fallback — no SMTP_USER/SMTP_PASS) ━━━');
    console.log(`  To: ${options.email} | Subject: ${options.subject}`);
    console.log(`  Body: ${options.message.substring(0, 200)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  // ── Reuse cached transporter for speed ──
  const transporter = getTransporter(user, pass);

  const htmlContent = options.html || buildPremiumEmail(options.subject, options.message);

  try {
    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: htmlContent,
    });
    console.log(`✅ Email sent → ${options.email} (${info.messageId})`);
  } catch (error: any) {
    console.error(`❌ Email FAILED → ${options.email}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'none'}`);
    console.error(`   SMTP_USER: ${user}`);
    console.error(`   SMTP_PASS length: ${pass.length} chars`);
    // Reset transporter so next attempt creates a fresh one
    cachedTransporter = null;
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Premium HTML email template — matches FreshMarket brand.
 */
function buildPremiumEmail(subject: string, textContent: string): string {
  const title = subject
    .replace('FreshMarket - ', '')
    .replace('FreshMarket — ', '')
    .replace('FreshMarket – ', '');

  const year = new Date().getFullYear();

  // Parse content for special elements (codes, URLs)
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
          ${parts[1] ? `<p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">${parts[1].trim()}</p>` : ''}
        `;
      }

      // URL → clickable button
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const textBefore = line.substring(0, line.indexOf(url)).trim();
        const isReset = subject.toLowerCase().includes('reset');
        return `
          ${textBefore ? `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">${textBefore}</p>` : ''}
          <div style="text-align:center;margin:28px 0;">
            <a href="${url}" 
               style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#ffffff;padding:16px 40px;border-radius:14px;text-decoration:none;font-weight:800;font-size:16px;box-shadow:0 6px 20px rgba(34,197,94,0.35);letter-spacing:0.3px;">
              ${isReset ? '🔑 Reset My Password' : '✅ Verify Now'}
            </a>
          </div>
          <p style="margin:0;text-align:center;color:#94a3b8;font-size:11px;word-break:break-all;">
            Or copy: <span style="color:#64748b;">${url}</span>
          </p>
        `;
      }

      // Regular paragraph
      return `<p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.7;">${line.trim()}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer wrapper -->
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#059669 0%,#16a34a 50%,#22c55e 100%);padding:40px 32px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:16px;padding:12px 16px;margin-bottom:12px;">
        <span style="font-size:32px;">🥬</span>
      </div>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">FreshMarket</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;">Fresh groceries, delivered fast</p>
    </div>

    <!-- Content -->
    <div style="padding:36px 32px 28px;">
      <h2 style="margin:0 0 24px;color:#0f172a;font-size:22px;font-weight:800;letter-spacing:-0.3px;">${title}</h2>
      ${bodyHtml}
    </div>

    <!-- Security Notice -->
    <div style="padding:0 32px 24px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
          🔒 <strong>Security Notice:</strong> FreshMarket will never ask for your password via email. If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;">FreshMarket</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        Your local grocery marketplace • Fresh food delivered daily
      </p>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#cbd5e1;font-size:10px;">
          © ${year} FreshMarket. All rights reserved.
        </p>
      </div>
    </div>
  </div>

  <!-- Anti-spam text -->
  <div style="max-width:560px;margin:16px auto;text-align:center;">
    <p style="color:#94a3b8;font-size:10px;">
      This email was sent to you because you have an account on FreshMarket.
    </p>
  </div>
</body>
</html>`;
}

export default sendEmail;
