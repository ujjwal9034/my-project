import nodemailer from 'nodemailer';

interface SendEmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

// Log SMTP config on module load (once) so we can see in Render logs
console.log('📧 Email Config Check:', {
  SMTP_HOST: process.env.SMTP_HOST || '❌ NOT SET',
  SMTP_PORT: process.env.SMTP_PORT || '❌ NOT SET',
  SMTP_USER: process.env.SMTP_USER ? '✅ SET' : '❌ NOT SET',
  SMTP_PASS: process.env.SMTP_PASS ? `✅ SET (${process.env.SMTP_PASS.length} chars)` : '❌ NOT SET',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '❌ NOT SET',
  FRONTEND_URL: process.env.FRONTEND_URL || '❌ NOT SET',
});

/**
 * Sends an email using configured SMTP settings.
 * 
 * Supports Gmail (via service or host) and generic SMTP.
 * Falls back to console logging if no SMTP is configured.
 */
const sendEmail = async (options: SendEmailOptions) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || 'noreply@freshmarket.com';
  const fromName = process.env.FROM_NAME || 'FreshMarket';

  // ── Dev fallback: if no SMTP configured, log email to console ─────────────
  if (!user || !pass) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 EMAIL (Console Mode — no SMTP credentials configured)');
    console.log(`   To:      ${options.email}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body:\n${options.message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return; // Don't throw – let the flow continue gracefully
  }

  // ── Build transporter ─────────────────────────────────────────────────────
  let transporter;

  // Use Gmail service mode if host is gmail
  const isGmail = host?.includes('gmail') || user?.includes('gmail');

  if (isGmail) {
    console.log('📧 Using Gmail service mode for:', user);
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  } else {
    // Generic SMTP
    const isSecurePort = port === 465;
    console.log(`📧 Using SMTP host mode: ${host}:${port}`);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecurePort,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    } as any);
  }

  // Build beautiful HTML email
  const htmlContent = options.html || buildEmailHtml(options.subject, options.message);

  const message = {
    from: `${fromName} <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: htmlContent,
  };

  try {
    console.log(`📧 Sending email to ${options.email} | Subject: ${options.subject}`);
    const info = await transporter.sendMail(message);
    console.log(`✅ Email sent successfully to ${options.email} (messageId: ${info.messageId})`);
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    console.error('   SMTP Config:', {
      host: isGmail ? 'gmail-service' : host,
      port,
      user: user ? user.substring(0, 5) + '***' : 'MISSING',
      passLength: pass ? pass.length : 0,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Builds a professional HTML email template.
 */
function buildEmailHtml(subject: string, textContent: string): string {
  // Convert text content to HTML paragraphs
  const bodyHtml = textContent
    .split('\n')
    .map(line => {
      if (!line.trim()) return '';
      // Detect URLs and make them clickable buttons
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const textBefore = line.substring(0, line.indexOf(url)).trim();
        return `
          ${textBefore ? `<p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">${textBefore}</p>` : ''}
          <div style="text-align: center; margin: 24px 0;">
            <a href="${url}" 
               style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(34,197,94,0.3);">
              ${subject.includes('Reset') ? '🔑 Reset My Password' : '✅ Click Here'}
            </a>
          </div>
          <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px; word-break: break-all;">
            Or copy this link: ${url}
          </p>
        `;
      }
      // Detect 6-digit codes and style them prominently
      const codeMatch = line.match(/\b(\d{6})\b/);
      if (codeMatch) {
        const code = codeMatch[1];
        const textParts = line.split(code);
        return `
          ${textParts[0] ? `<p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">${textParts[0]}</p>` : ''}
          <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 16px 40px; border-radius: 16px; border: 2px dashed #22c55e;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #16a34a; font-family: 'Courier New', monospace;">${code}</span>
            </div>
          </div>
          ${textParts[1] ? `<p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 13px;">${textParts[1]}</p>` : ''}
        `;
      }
      return `<p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">${line}</p>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px 24px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 8px;">🥬</div>
          <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 800;">FreshMarket</h1>
        </div>
        <!-- Body -->
        <div style="padding: 32px 28px;">
          <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 700;">${subject.replace('FreshMarket - ', '').replace('FreshMarket — ', '')}</h2>
          ${bodyHtml}
        </div>
        <!-- Footer -->
        <div style="padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
            This email was sent by FreshMarket. If you didn't request this, you can safely ignore it.
          </p>
          <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 11px;">
            © ${new Date().getFullYear()} FreshMarket. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default sendEmail;
