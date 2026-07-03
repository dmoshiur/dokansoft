import nodemailer from "nodemailer";
import { repository } from "./db/repository.ts";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Premium responsive HTML template generator
export function getResponsiveTemplate(title: string, bodyContent: string, ctaHtml = ""): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f6f9;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f9;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #eef2f6;
    }
    .header {
      background-color: #111827;
      padding: 30px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #3b82f6;
      letter-spacing: -0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .subtitle {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 5px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .content {
      padding: 40px 30px;
      color: #374151;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      font-size: 15px;
      margin-bottom: 20px;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      font-weight: 600;
      font-size: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #eef2f6;
    }
    .footer p {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 10px 0;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    .otp-code {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #111827;
      background-color: #f3f4f6;
      padding: 12px 24px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #e5e7eb;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 12px;
      background-color: #fee2e2;
      color: #ef4444;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo">M/S Lovely Enterprise</h1>
        <div class="subtitle">PREMIUM CLOUD PLATFORM</div>
      </div>
      <div class="content">
        ${bodyContent}
        ${ctaHtml}
      </div>
      <div class="footer">
        <p>This is an automated security system notification.</p>
        <p>If you have any questions, contact our support desk at <a href="mailto:mdmoshiurrahmanmohi1@gmail.com">mdmoshiurrahmanmohi1@gmail.com</a></p>
        <p>&copy; 2026 M/S Lovely Enterprise. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Specific Mail Generator helper
export class Mailer {
  private static async getTransporter() {
    // 1. Fetch system SMTP config from settings DB
    const settings = await repository.getSettings() as any;
    
    // 2. Fallback to Env if DB settings are empty
    const host = settings.smtpHost || process.env.SMTP_HOST || "";
    const port = parseInt(settings.smtpPort || process.env.SMTP_PORT || "587");
    const user = settings.smtpUsername || process.env.SMTP_USER || "";
    const pass = settings.smtpPassword || process.env.SMTP_PASS || "";
    const fromName = settings.smtpFromName || process.env.SMTP_FROM_NAME || "Lovely Enterprise";
    const fromEmail = settings.smtpFromEmail || process.env.SMTP_FROM_EMAIL || user;

    if (!host || !user || !pass) {
      console.warn("[Mailer] SMTP credentials incomplete, logging mail to console.");
      return {
        sendMail: async (options: any) => {
          console.log("=========================================");
          console.log(`[SMTP DEV MODE] To: ${options.to}`);
          console.log(`[SMTP DEV MODE] Subject: ${options.subject}`);
          console.log(`[SMTP DEV MODE] Body preview: ${options.text || "HTML only"}`);
          console.log("=========================================");
          return { messageId: "dev-mode-mock-id-" + Date.now() };
        },
        fromInfo: `"${fromName}" <${fromEmail || "no-reply@lovelyenterprise.com"}>`
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for port 465, false for other ports
      auth: { user, pass },
    });

    return {
      sendMail: transporter.sendMail.bind(transporter),
      fromInfo: `"${fromName}" <${fromEmail || user}>`
    };
  }

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const { sendMail, fromInfo } = await this.getTransporter();
      await sendMail({
        from: fromInfo,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || "",
      });
      console.log(`[Mailer] Email sent successfully to ${options.to}`);
      return true;
    } catch (e) {
      console.error("[Mailer] Email sending failed:", e);
      return false;
    }
  }

  // Admin Login OTP template
  static async sendAdminLoginOTP(email: string, otpCode: string): Promise<boolean> {
    const title = "Admin Login Verification Code";
    const bodyContent = `
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px;">Admin Verification Request</h2>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
        A security verification procedure was initiated for your administrator account on <strong>M/S Lovely Enterprise ERP</strong>. Please use the verification code below to complete your login.
      </p>
      
      <p style="font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; text-align: center;">
        Your verification code is:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        <span class="otp-code" style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #111827; background-color: #f3f4f6; padding: 16px 32px; border-radius: 12px; border: 2px solid #e5e7eb; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">${otpCode}</span>
      </div>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-top: 28px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; font-weight: 600; line-height: 1.5;">
          ⏱️ This code expires in 5 minutes.
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #b91c1c; line-height: 1.5;">
          <strong>Security Note:</strong> Never share this code with anyone. Our support team will never ask for your verification code. If you did not request this code, please immediately update your administrative credentials.
        </p>
      </div>
    `;
    const html = getResponsiveTemplate(title, bodyContent);
    return this.sendEmail({
      to: email,
      subject: "Admin Login Verification Code",
      html,
      text: `Your verification code is:\n${otpCode}\n\nThis code expires in 5 minutes.\n\nSecurity note:\nNever share this code with anyone.`
    });
  }

  // Forgot Password Reset Link template
  static async sendForgotPasswordEmail(email: string, resetLink: string): Promise<boolean> {
    const title = "Password Reset Request";
    const bodyContent = `
      <h2>Password Reset Instructions</h2>
      <p>Hello,</p>
      <p>We received a request to reset the password for your account on <strong>M/S Lovely Enterprise ERP</strong>.</p>
      <p>You can reset your password by clicking the secure button below. This link will be active for 1 hour.</p>
    `;
    const ctaHtml = `
      <div class="cta-container">
        <a href="${resetLink}" class="cta-button" target="_blank">Reset My Password</a>
      </div>
    `;
    const html = getResponsiveTemplate(title, bodyContent, ctaHtml);
    return this.sendEmail({
      to: email,
      subject: "[Security] Password Reset Request - M/S Lovely Enterprise",
      html,
      text: `To reset your password, please visit: ${resetLink}`
    });
  }

  // Password Reset Success template
  static async sendPasswordResetSuccess(email: string): Promise<boolean> {
    const title = "Password Changed Successfully";
    const bodyContent = `
      <h2>Security Alert: Password Changed</h2>
      <p>Hello,</p>
      <p>This is a confirmation that the password for your admin account has been <strong>successfully changed</strong>.</p>
      <p>If you did this, you can safely ignore this email. If you did not authorize this change, please contact support immediately to lock your account.</p>
    `;
    const html = getResponsiveTemplate(title, bodyContent);
    return this.sendEmail({
      to: email,
      subject: "[Security Alert] Your password was changed successfully",
      html,
      text: "The password for your admin account was successfully changed."
    });
  }

  // Account Notifications
  static async sendAccountNotification(email: string, subject: string, header: string, message: string): Promise<boolean> {
    const title = "Account Notification";
    const bodyContent = `
      <h2>${header}</h2>
      <p>Hello,</p>
      <p>${message}</p>
    `;
    const html = getResponsiveTemplate(title, bodyContent);
    return this.sendEmail({
      to: email,
      subject: `[Notification] ${subject}`,
      html,
      text: message
    });
  }

  // System Alerts
  static async sendSystemAlert(email: string, alertName: string, severity: "LOW" | "MEDIUM" | "HIGH", alertDetails: string): Promise<boolean> {
    const title = `System Alert: ${alertName}`;
    const badgeColor = severity === "HIGH" ? "#fee2e2" : severity === "MEDIUM" ? "#fef3c7" : "#e0f2fe";
    const badgeTextColor = severity === "HIGH" ? "#ef4444" : severity === "MEDIUM" ? "#d97706" : "#0284c7";
    
    const bodyContent = `
      <div class="badge" style="background-color: ${badgeColor}; color: ${badgeTextColor};">${severity} SEVERITY</div>
      <h2>System Alert: ${alertName}</h2>
      <p>An automated health check or security scan has triggered a system alert:</p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #374151;">
        ${alertDetails}
      </div>
      <p style="margin-top: 15px;">Please check your server dashboard or audit logs for complete information.</p>
    `;
    const html = getResponsiveTemplate(title, bodyContent);
    return this.sendEmail({
      to: email,
      subject: `[SYSTEM ALERT] ${alertName} (${severity})`,
      html,
      text: `System alert triggered: ${alertName}. Severity: ${severity}. Details: ${alertDetails}`
    });
  }
}
