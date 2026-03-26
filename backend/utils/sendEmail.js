const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const templates = {
  verification: ({ name, verifyUrl }) => ({
    subject: 'Verify your PlateDetect AI account',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#e0e0e0;padding:40px;border-radius:12px">
        <h1 style="color:#00ff88;margin-bottom:8px">PlateDetect AI</h1>
        <h2 style="color:#fff">Welcome, ${name}!</h2>
        <p>Please verify your email address to get started.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#00ff88,#00b4d8);color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  }),
  resetPassword: ({ name, resetUrl }) => ({
    subject: 'Reset your PlateDetect AI password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#e0e0e0;padding:40px;border-radius:12px">
        <h1 style="color:#00ff88">PlateDetect AI</h1>
        <h2 style="color:#fff">Password Reset Request</h2>
        <p>Hi ${name}, click below to reset your password.</p>
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#ff6b6b,#ee5a24);color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px">Link expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),
};

const sendEmail = async ({ email, subject, template, data, html, text }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for SSL on port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let emailContent = { html, text };
  if (template && templates[template]) {
    const rendered = templates[template](data);
    emailContent = { html: rendered.html };
    subject = rendered.subject;
  }

  const mailOptions = {
    from: `${process.env.FROM_NAME || 'PlateDetect AI'} <${process.env.FROM_EMAIL}>`,
    to: email,
    subject,
    ...emailContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error('Email send error:', err.message);
    throw err;
  }
};

module.exports = sendEmail;
