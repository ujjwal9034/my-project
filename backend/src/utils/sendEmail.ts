import nodemailer from 'nodemailer';

interface SendEmailOptions {
  email: string;
  subject: string;
  message: string;
}

const sendEmail = async (options: SendEmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER || 'user',
      pass: process.env.SMTP_PASS || 'password',
    },
  });

  const message = {
    from: `${process.env.FROM_NAME || 'FreshMarket'} <${process.env.FROM_EMAIL || 'noreply@freshmarket.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(message);
};

export default sendEmail;
