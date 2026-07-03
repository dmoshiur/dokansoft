import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { connectToWhatsApp, getStatus, sendMessage, disconnectWhatsApp, getWhatsAppConfig, setWhatsAppConfig } from "./src/whatsapp.ts";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { repository } from "./src/services/db/repository.ts";
import { connectMongoDB, getDb } from "./src/services/db/mongodb.ts";
import { OTPStore } from "./src/services/db/otpStore.ts";
import { Mailer, getResponsiveTemplate } from "./src/services/mailer.ts";
import { BackupService, convertToCSV } from "./src/services/db/backup.ts";
import { voiceManager } from "./src/services/voice/manager.ts";
import { callQueue, startWorker } from "./src/services/queue/queue.ts";
import { authenticateToken, isAdmin } from "./src/middleware/auth.ts";

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_jwt_key_2026';

// Global Rate Limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests. Please try again later." }
});

// Stricter Rate Limit for Auth/OTP endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many login/OTP attempts. Please wait 15 minutes before retrying." }
});

async function startServer() {
  const app = express();
  
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));
  // app.use(limiter);

  // Initialize MongoDB and run automatic migrations. Exit immediately if connection fails.
  const mongoResult = await connectMongoDB();
  if (!mongoResult.success) {
    console.error("[CRITICAL] MongoDB connection failed! Stopping server startup immediately.");
    console.error(`Details: ${mongoResult.error}`);
    process.exit(1);
  }

  console.log("[MongoDB] Database connection verified successfully. Initializing repository...");

  // Start automated backups once a day
  BackupService.startAutoBackupScheduler();

  // Initialize services
  connectToWhatsApp().catch(console.error);
  startWorker();
  
  // Load settings and init voice provider
  const settings = await repository.getSettings();
  try {
    const apiConfigs = await repository.getApiConfigs();
    const config = apiConfigs.find(c => c.id === "infosoft_config");
    if (config && config.apiKey) {
      console.log("[Voice] Initializing voice provider from api_configs...");
      voiceManager.setProvider(config);
    } else if (settings.voiceProvider) {
      voiceManager.setProvider(settings.voiceProvider);
    }
  } catch (err: any) {
    console.error("[Voice Init Error] Failed loading config:", err.message);
  }

  // --- Auth Routes ---
  
  // Step 1: Login Credentials Check & OTP dispatch
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const emailLower = email.trim().toLowerCase();
      console.log(`[Auth - Login] Login request received for email: ${emailLower}`);

      // Case A: Administrative Account
      if (emailLower === "mdmoshiurrahmanmohi1@gmail.com") {
        const settingsObj: any = await repository.getSettings();
        const adminPass = settingsObj.adminPasswordOverride || process.env.ADMIN_PASSWORD || 'admin123';
        if (password === adminPass) {
          try {
            console.log(`[Admin Auth] Credentials verified. Generating secure 6-digit OTP...`);
            const otpRecord = await OTPStore.generateOTP(emailLower);
            
            console.log(`[Admin Auth] OTP generated successfully. Attempting SMTP delivery to ${emailLower}...`);
            try {
              await Mailer.sendAdminLoginOTP(emailLower, otpRecord.code);
            } catch (smtpErr) {
              console.warn(`[Admin Auth] SMTP delivery failed, falling back:`, smtpErr);
            }
            
            console.log(`[Admin Auth] Login OTP successfully handled.`);
            return res.json({ 
              otpRequired: true, 
              email: emailLower,
              message: "Verification code sent." 
            });
          } catch (err: any) {
            console.error(`[Admin Auth Error] OTP generation failed:`, err);
            return res.status(500).json({ error: "Failed to generate OTP." });
          }
        } else {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      }

      // Custom Administrators Check
      try {
        const db = getDb();
        const customAdmin = await db.collection("admins").findOne({ email: emailLower });
        if (customAdmin) {
          if (customAdmin.status !== "ACTIVE") {
            return res.status(403).json({ error: "Your account has been disabled. Contact Super Admin." });
          }
          if (customAdmin.password === password) {
            console.log(`[Custom Admin Auth] Credentials verified for ${emailLower}. Generating secure OTP...`);
            const otpRecord = await OTPStore.generateOTP(emailLower);
            
            try {
              await Mailer.sendAdminLoginOTP(emailLower, otpRecord.code);
            } catch (smtpErr) {
              console.warn(`[Custom Admin Auth] SMTP delivery failed, falling back:`, smtpErr);
            }
            
            return res.json({ 
              otpRequired: true, 
              email: emailLower,
              message: "Verification code sent." 
            });
          } else {
            return res.status(401).json({ error: "Invalid credentials" });
          }
        }
      } catch (err: any) {
        console.error(`[Custom Admin Auth Query Error] Failed to verify custom admin:`, err);
      }

      // Case B: Customer / User Account
      try {
        const customers = await repository.getCustomers();
        const customer = customers.find((c: any) => c.email && c.email.trim().toLowerCase() === emailLower);
        if (customer) {
          if (customer.password === password) {
            console.log(`[Customer Auth] Credentials verified for ${emailLower}. Generating secure OTP...`);
            const otpRecord = await OTPStore.generateOTP(emailLower);
            
            console.log(`[Customer Auth] OTP generated successfully. Attempting SMTP delivery to ${emailLower}...`);
            try {
              await Mailer.sendAdminLoginOTP(emailLower, otpRecord.code);
            } catch (smtpErr) {
              console.warn(`[Customer Auth] SMTP delivery failed, falling back:`, smtpErr);
            }
            
            console.log(`[Customer Auth] Login OTP successfully handled.`);
            return res.json({
              otpRequired: true,
              email: emailLower,
              message: "Verification code sent."
            });
          } else {
            return res.status(401).json({ error: "Invalid credentials" });
          }
        }
      } catch (err: any) {
        console.error(`[Customer Auth Query Error] Failed to verify customer:`, err);
        return res.status(500).json({ error: "An internal error occurred during authentication." });
      }

      console.warn(`[Auth Warning] Invalid credentials entered for email: ${emailLower}`);
      return res.status(401).json({ error: "No matching account found with those credentials." });
    } catch (globalErr: any) {
      console.error(`[Global Auth Login Error] Unhandled exception occurred:`, globalErr);
      return res.status(500).json({ error: globalErr.message || "An unexpected error occurred during login." });
    }
  });

  // Step 2: Verification of OTP & JWT token issuance
  app.post("/api/auth/verify-otp", authLimiter, async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }
    
    const emailLower = email.trim().toLowerCase();
    console.log(`[Auth - Verify] Received OTP verification request for ${emailLower}. Submitting code: [${otp}]`);

    const verification = await OTPStore.verifyOTP(emailLower, otp);
    if (!verification.success) {
      console.warn(`[Auth - Verify Failure] OTP verification failed for ${emailLower}: ${verification.message}`);
      return res.status(401).json({ error: verification.message });
    }

    console.log(`[Auth - Verify Success] OTP code verified for ${emailLower}. Generating 24-hour JWT token.`);

    // Determine the role and token payload
    if (emailLower === "mdmoshiurrahmanmohi1@gmail.com") {
      const token = jwt.sign({ email: emailLower, role: 'admin', adminRole: 'Super Admin' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, user: { email: emailLower, role: 'admin', adminRole: 'Super Admin' } });
    }

    try {
      const db = getDb();
      const customAdmin = await db.collection("admins").findOne({ email: emailLower });
      if (customAdmin && customAdmin.status === "ACTIVE") {
        const token = jwt.sign({ email: emailLower, role: 'admin', adminRole: customAdmin.role }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { email: emailLower, role: 'admin', adminRole: customAdmin.role } });
      }
    } catch (err: any) {
      console.error(`[Custom Admin Verify OTP Error] Failed to resolve custom admin:`, err);
    }

    try {
      const customers = await repository.getCustomers();
      const customer = customers.find((c: any) => c.email && c.email.trim().toLowerCase() === emailLower);
      if (customer) {
        const token = jwt.sign({ email: emailLower, role: 'user', customerId: customer.id }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { email: emailLower, role: 'user', customerId: customer.id } });
      }
    } catch (err: any) {
      console.error(`[Auth - Verify Database Error] Failed to resolve customer:`, err);
      return res.status(500).json({ error: "Internal server error resolving user details." });
    }

    return res.status(404).json({ error: "User session resolved but database account was not found." });
  });

  // Step 1.5: Customer Phone/OTP Login
  app.post("/api/customer/login", authLimiter, async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    try {
      const customers = await repository.getCustomers();
      const customer = customers.find((c: any) => c.phone && c.phone === phone);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found with this phone number." });
      }

      console.log(`[Customer Auth] OTP request for phone: ${phone}.`);
      const otpRecord = await OTPStore.generateOTP(phone);
      
      // Send OTP via WhatsApp
      try {
        await sendMessage(phone, `Your Lovely ERP OTP is ${otpRecord.code}`);
        console.log(`[Customer Auth] OTP sent successfully via WhatsApp to ${phone}`);
      } catch (waErr: any) {
        console.warn(`[Customer Auth] Failed to send WhatsApp OTP: ${waErr.message}`);
      }
      
      // MOCK SMS - in production use real SMS API
      console.log(`[Customer Auth] OTP ${otpRecord.code} for ${phone} (Mock SMS).`);
      
      return res.json({ 
        success: true, 
        message: "OTP sent to your phone." 
      });
    } catch (err: any) {
      console.error(`[Customer Auth Error]`, err);
      return res.status(500).json({ error: "Internal server error." });
    }
  });

  app.post("/api/customer/verify-otp", authLimiter, async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone and OTP are required." });
    }

    const verification = await OTPStore.verifyOTP(phone, otp);
    if (!verification.success) {
      return res.status(401).json({ error: verification.message });
    }

    try {
      const customers = await repository.getCustomers();
      const customer = customers.find((c: any) => c.phone && c.phone === phone);
      
      if (customer) {
        const token = jwt.sign({ email: customer.email, role: 'user', customerId: customer.id }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { email: customer.email, role: 'user', customerId: customer.id } });
      }
    } catch (err: any) {
      console.error(`[Auth - Verify Database Error]`, err);
      return res.status(500).json({ error: "Internal server error resolving user details." });
    }

    return res.status(404).json({ error: "User session resolved but database account was not found." });
  });

  // Step 3: Resend Verification OTP
  app.post("/api/auth/resend-otp", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    
    const emailLower = email.trim().toLowerCase();
    console.log(`[Auth - Resend] Received resend OTP request for email: ${emailLower}`);
    
    const isAdmin = emailLower === "mdmoshiurrahmanmohi1@gmail.com";
    let isCustomer = false;
    if (!isAdmin) {
      try {
        const customers = await repository.getCustomers();
        isCustomer = customers.some((c: any) => c.email && c.email.trim().toLowerCase() === emailLower);
      } catch (err: any) {
        console.error(`[Auth - Resend Database Error] Failed to search registered users:`, err);
        return res.status(500).json({ error: "Internal database query failure." });
      }
    }

    if (!isAdmin && !isCustomer) {
      console.warn(`[Auth - Resend Warning] Refusing OTP resend for unregistered email: ${emailLower}`);
      return res.status(400).json({ error: "Email address is not registered in our system." });
    }

    const cooldown = await OTPStore.checkCooldown(emailLower);
    if (!cooldown.allowed) {
      console.warn(`[Auth - Resend Rate-limited] Cooldown active for ${emailLower}. Remaining cooldown: ${cooldown.remainingSeconds}s`);
      return res.status(429).json({ 
        error: `Please wait ${cooldown.remainingSeconds} seconds before requesting a new verification code.` 
      });
    }

    try {
      console.log(`[Auth - Resend] Cooldown passed. Regenerating secure OTP for ${emailLower}...`);
      const otpRecord = await OTPStore.generateOTP(emailLower);
      
      console.log(`[Auth - Resend] Attempting SMTP dispatch of regenerated OTP to ${emailLower}...`);
      await Mailer.sendAdminLoginOTP(emailLower, otpRecord.code);
      
      await OTPStore.updateResendTime(emailLower);
      console.log(`[Auth - Resend Success] Regenerated secure OTP dispatched successfully to ${emailLower}.`);
      res.json({ success: true, message: "A new secure verification code was successfully sent." });
    } catch (err: any) {
      console.error(`[Auth - Resend Error] Failed to regenerate or send OTP for ${emailLower}:`, err);
      res.status(500).json({ error: "Failed to send a new code. Please try again." });
    }
  });

  // Step 3.5: Secure password change for logged-in users
  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const emailLower = email.trim().toLowerCase();

    // Guard: Verify token matches requested email
    if ((req as any).user.email !== emailLower) {
      return res.status(403).json({ error: "You are not authorized to change the password for this account." });
    }

    try {
      // Admin account password change
      if (emailLower === "mdmoshiurrahmanmohi1@gmail.com") {
        const settingsObj: any = await repository.getSettings();
        const adminPass = settingsObj.adminPasswordOverride || process.env.ADMIN_PASSWORD || 'admin123';
        if (currentPassword !== adminPass) {
          return res.status(400).json({ error: "Incorrect current password." });
        }
        
        await repository.saveSettings({ ...settingsObj, adminPasswordOverride: newPassword });
        return res.json({ success: true, message: "Admin password updated successfully." });
      }

      // Customer account password change
      const customers = await repository.getCustomers();
      const customer = customers.find((c: any) => c.email && c.email.trim().toLowerCase() === emailLower);
      if (!customer) {
        return res.status(404).json({ error: "Customer account not found." });
      }

      if (customer.password !== currentPassword) {
        return res.status(400).json({ error: "Incorrect current password." });
      }

      await repository.updateDocument("customers", customer.id, { password: newPassword });
      return res.json({ success: true, message: "Your password has been changed successfully." });
    } catch (err: any) {
      console.error(`[Change Password Error] Failed to update password for ${emailLower}:`, err);
      return res.status(500).json({ error: "Internal server error occurred while updating your password." });
    }
  });

  // Step 4: Forgot Password Request
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (email !== "mdmoshiurrahmanmohi1@gmail.com") {
      // Return ambiguous success for security against email harvesting
      return res.json({ success: true, message: "If the email is correct, a recovery link will arrive shortly." });
    }

    try {
      // Issue secure reset token valid for 1 hour
      const resetToken = jwt.sign({ email, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
      const origin = req.headers.referer || req.headers.origin || `https://${req.headers.host}`;
      const cleanOrigin = origin.split("/admin")[0]; // sanitize route path
      const resetLink = `${cleanOrigin}/admin/reset-password?token=${resetToken}`;

      await Mailer.sendForgotPasswordEmail(email, resetLink);
      res.json({ success: true, message: "A recovery link has been successfully dispatched to your inbox." });
    } catch (e: any) {
      res.status(500).json({ error: "Could not deliver recovery email. Please check server settings." });
    }
  });

  // Step 5: Password Reset Finalization
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.type !== 'reset' || decoded.email !== "mdmoshiurrahmanmohi1@gmail.com") {
        return res.status(400).json({ error: "Expired or invalid security token." });
      }

      // Persist the password override in settings
      const settingsObj: any = await repository.getSettings();
      await repository.saveSettings({
        ...settingsObj,
        adminPasswordOverride: newPassword
      });

      // Send a premium alert email about the successful change
      await Mailer.sendPasswordResetSuccess(decoded.email);

      res.json({ success: true, message: "Your password has been changed successfully. You may now log in." });
    } catch (err) {
      res.status(400).json({ error: "Your reset token is expired or invalid." });
    }
  });

  // --- Backup & Data Export Routes ---
  
  app.post("/api/admin/backup/create", authenticateToken, isAdmin, async (req, res) => {
    try {
      const meta = await BackupService.createBackup(false);
      res.json({ success: true, backup: meta });
    } catch (err: any) {
      res.status(500).json({ error: `Backup failed: ${err.message}` });
    }
  });

  app.get("/api/admin/backup/list", authenticateToken, isAdmin, async (req, res) => {
    try {
      const backups = await BackupService.getBackups();
      res.json(backups);
    } catch (err: any) {
      res.status(500).json({ error: `Failed to load backups: ${err.message}` });
    }
  });

  app.post("/api/admin/backup/restore", authenticateToken, isAdmin, async (req, res) => {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename parameter is required." });
    }
    try {
      const result = await BackupService.restoreBackup(filename);
      if (result.success) {
        res.json({ success: true, message: "Database successfully rolled back/restored!" });
      } else {
        res.status(400).json({ error: result.error || "Restore process failed integrity validation." });
      }
    } catch (err: any) {
      res.status(500).json({ error: `Database restoration crashed: ${err.message}` });
    }
  });

  // Dynamic exports in JSON, CSV, and Excel (MIME mapped CSV) formats
  app.get("/api/admin/export/:format", authenticateToken, isAdmin, async (req, res) => {
    const { format } = req.params; 
    const { collection } = req.query; 

    try {
      let data: any = {};
      if (collection && collection !== "all") {
        data = await repository.getCollection(collection as string);
      } else {
        data = {
          customers: await repository.getCollection("customers"),
          campaigns: await repository.getCollection("campaigns"),
          callLogs: await repository.getCollection("callLogs"),
          settings: await repository.getSettings()
        };
      }

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=lovely_erp_export_${Date.now()}.json`);
        return res.send(JSON.stringify(data, null, 2));
      }

      if (format === "csv" || format === "excel") {
        let csvContent = "";
        if (collection && collection !== "all") {
          csvContent = convertToCSV(data as any[]);
        } else {
          csvContent += "=== CUSTOMERS ===\n" + convertToCSV(data.customers) + "\n\n";
          csvContent += "=== CAMPAIGNS ===\n" + convertToCSV(data.campaigns) + "\n\n";
          csvContent += "=== CALL LOGS ===\n" + convertToCSV(data.callLogs) + "\n";
        }

        const mimeType = format === "excel" ? "application/vnd.ms-excel" : "text/csv";
        const fileExt = format === "excel" ? "xls" : "csv";

        res.setHeader("Content-Type", `${mimeType}; charset=utf-8`);
        res.setHeader("Content-Disposition", `attachment; filename=lovely_erp_export_${Date.now()}.${fileExt}`);
        return res.send(csvContent);
      }

      res.status(400).json({ error: "Requested output format not supported." });
    } catch (err: any) {
      res.status(500).json({ error: `Data export engine failed: ${err.message}` });
    }
  });

  // --- Dashboard Routes ---
  app.get("/api/dashboard/stats", authenticateToken, isAdmin, async (req, res) => {
    try {
      const db = getDb();
      const customers = await db.collection("customers").find().toArray();
      const products = await db.collection("products").find().toArray();
      const ledger = await db.collection("ledger").find().toArray();
      
      const totalRevenue = ledger
        .filter(e => e.type === "PAYMENT")
        .reduce((sum, e) => sum + (e.amount || 0), 0);
        
      const activeCustomers = customers.length;
      const totalSales = ledger.filter(e => e.type === "PURCHASE").length;
      const inventoryItems = products.length;

      res.json({ totalRevenue, activeCustomers, totalSales, inventoryItems });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/dashboard/revenue", authenticateToken, isAdmin, async (req, res) => {
    try {
      const db = getDb();
      const ledger = await db.collection("ledger").find({ type: "PAYMENT" }).toArray();
      
      // Aggregate by last 7 days
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const revenue = last7Days.map(date => {
        const dailyRevenue = ledger
          .filter(e => e.date === date)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        return { name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), revenue: dailyRevenue };
      });

      res.json(revenue);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/dashboard/activity", authenticateToken, isAdmin, async (req, res) => {
    try {
      const db = getDb();
      const ledger = await db.collection("ledger").find().sort({ date: -1 }).limit(5).toArray();
      const callLogs = await db.collection("voice_call_logs").find().sort({ timestamp: -1 }).limit(5).toArray();
      
      const activity = [
        ...ledger.map(l => ({ type: 'LEDGER', user: l.description || 'Ledger Entry', amount: l.amount, time: l.date })),
        ...callLogs.map(c => ({ type: 'CALL', user: c.phone, amount: c.status, time: c.timestamp }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
      
      res.json(activity);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Communication Routes ---
  app.get("/api/communication/dashboard", authenticateToken, async (req, res) => {
    try {
      const logs = await repository.getCallLogs();
      const queue = await repository.getVoiceQueue();

      // Filter active calls: CALLING, RINGING, CONNECTED, Ringing, In Progress
      const activeStatuses = ["CALLING", "RINGING", "CONNECTED", "Ringing", "In Progress"];
      const activeCalls = logs.filter(l => activeStatuses.includes(l.status)).length;

      // Filter waiting queue: QUEUED, Queued
      const queuedStatuses = ["QUEUED", "Queued"];
      const waitingQueue = queue.filter(q => queuedStatuses.includes(q.status)).length;

      // Answered Today
      const todayStr = new Date().toDateString();
      const answeredStatuses = ["COMPLETED", "ANSWERED", "Completed", "Answered"];
      const answeredToday = logs.filter(l => 
        answeredStatuses.includes(l.status) && 
        new Date(l.timestamp).toDateString() === todayStr
      ).length;

      // Failed/Busy
      const failedStatuses = ["FAILED", "BUSY", "NO_ANSWER", "Failed", "No Answer"];
      const failedBusy = logs.filter(l => 
        failedStatuses.includes(l.status) && 
        new Date(l.timestamp).toDateString() === todayStr
      ).length;

      // Recent calls
      const recentCalls = logs.slice(-10).reverse();

      // Top 5 live queue
      const liveQueue = queue.filter(q => queuedStatuses.includes(q.status)).slice(0, 5);

      res.json({
        activeCalls,
        waitingQueue,
        answeredToday,
        failedBusy,
        recentCalls,
        liveQueue
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/communication/campaigns", authenticateToken, async (req, res) => {
    try {
      const campaigns = await repository.getCampaigns();
      res.json(campaigns);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/communication/campaigns", authenticateToken, isAdmin, async (req, res) => {
    try {
      const campaignId = await repository.addDocument("voice_campaigns", {
        ...req.body,
        status: "PENDING",
        createdAt: new Date().toISOString()
      });
      res.json({ success: true, campaignId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/communication/campaigns/start", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { campaignId } = req.body;
      const campaign = await repository.getDocument<any>("voice_campaigns", campaignId);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });

      await repository.updateDocument("voice_campaigns", campaignId, { status: "ACTIVE", startedAt: new Date().toISOString() });

      const customers = await repository.getCustomers();
      const targetCustomers = customers.filter(c => campaign.customerIds.includes(c.id));

      for (const customer of targetCustomers) {
        const callLogId = await repository.addDocument("voice_call_logs", {
          campaignId,
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          status: "QUEUED",
          attempts: 0,
          timestamp: new Date().toISOString()
        });

        await callQueue.add('voice-call', { callLogId });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/communication/queue", authenticateToken, async (req, res) => {
    try {
      const queue = await repository.getVoiceQueue();
      res.json(queue);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/communication/queue", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { name, phone, dueAmount, dueDate, status } = req.body;
      const itemId = await repository.addVoiceQueueItem({
        name,
        phone,
        dueAmount: Number(dueAmount || 0),
        dueDate,
        status: status || "Queued",
        timestamp: new Date().toISOString()
      });
      res.json({ success: true, itemId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/communication/logs", authenticateToken, async (req, res) => {
    try {
      const logs = await repository.getCallLogs(req.query.campaignId as string);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/communication/templates", authenticateToken, async (req, res) => {
    try {
      const templates = await repository.getVoiceTemplates();
      res.json(templates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/communication/templates", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { name, text, type } = req.body;
      const templateId = await repository.addVoiceTemplate({
        name,
        text,
        type: type || "TTS",
        createdAt: new Date().toISOString()
      });
      res.json({ success: true, templateId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/communication/config", authenticateToken, async (req, res) => {
    try {
      const configs = await repository.getApiConfigs();
      const config = configs.find(c => c.id === "infosoft_config") || {
        id: "infosoft_config",
        name: "InfoSoft BD Voice Gateway",
        apiUrl: "https://api.infosoftbd.com",
        apiKey: "",
        apiSecret: "",
        callerId: "",
        defaultVoice: "en-US-Standard-C",
        language: "en-US",
        webhookUrl: "",
        retryCount: 3
      };
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/communication/config", authenticateToken, isAdmin, async (req, res) => {
    try {
      const config = req.body;
      await repository.updateApiConfig(config);
      voiceManager.setProvider(config);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Voice Webhook ---
  app.post("/api/voice/webhook", async (req, res) => {
    const { call_id, status, duration, recording_url, dtmf } = req.body;
    console.log(`[Voice Webhook] Call ${call_id} updated to ${status}`);

    const callLogs = await repository.getCollection<any>("voice_call_logs");
    const log = callLogs.find(l => l.apiResponse?.call_id === call_id || l.callId === call_id);
    
    if (log) {
      await repository.updateDocument("voice_call_logs", log.id, {
        status: status.toUpperCase(),
        duration,
        recordingUrl: recording_url,
        dtmf,
        webhookResponse: req.body
      });
    }
    
    res.json({ success: true });
  });

  // --- WhatsApp Routes ---
  app.get("/api/whatsapp/status", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const status = getStatus();
    console.log(`[WhatsApp Debug] GET /api/whatsapp/status hit. Auth header present: ${!!authHeader}. Token length: ${token ? token.length : 0}. Connection Status state: ${status.state}. Provider: ${status.activeProvider}`);
    
    if (!token) {
      console.warn("[WhatsApp Debug] Access to GET /api/whatsapp/status without token. Permitting for display, but user context is empty.");
      return res.json(status);
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.error(`[WhatsApp Debug] Invalid token provided: ${err.message}. Sending status anyway for UI resilience.`);
        return res.json(status);
      }
      console.log(`[WhatsApp Debug] Authenticated user role: ${user?.role}. Email: ${user?.email}`);
      res.json(status);
    });
  });

  app.get("/api/whatsapp/config", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const config = getWhatsAppConfig();
    console.log(`[WhatsApp Debug] GET /api/whatsapp/config hit. Auth header present: ${!!authHeader}. Token length: ${token ? token.length : 0}. Active Provider: ${config.activeProvider}`);
    res.json(config);
  });

  app.post("/api/whatsapp/config", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(`[WhatsApp Debug] POST /api/whatsapp/config hit. Auth header present: ${!!authHeader}. Token length: ${token ? token.length : 0}. Request Body:`, JSON.stringify(req.body));
    
    try {
      setWhatsAppConfig(req.body);
      console.log(`[WhatsApp Debug] Successfully synchronized WhatsApp config.`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[WhatsApp Debug] Error setting WhatsApp config: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/whatsapp/disconnect", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(`[WhatsApp Debug] POST /api/whatsapp/disconnect hit. Auth header present: ${!!authHeader}. Token length: ${token ? token.length : 0}`);
    
    if (!token) {
      console.error("[WhatsApp Debug] Unauthorized disconnect attempt: No token provided.");
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
      if (err) {
        console.error(`[WhatsApp Debug] Unauthorized disconnect attempt: Invalid token: ${err.message}`);
        return res.status(403).json({ error: "Invalid or expired token." });
      }
      
      console.log(`[WhatsApp Debug] Disconnection authorized for user: ${user?.email}. Cleaning up session.`);
      try {
        await disconnectWhatsApp();
        res.json({ success: true });
      } catch (error: any) {
        console.error(`[WhatsApp Debug] Error during disconnect: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });
  });

  app.post("/api/whatsapp/send", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const { number, message } = req.body;
    console.log(`[WhatsApp Debug] POST /api/whatsapp/send hit. Recipient: ${number}. Auth header present: ${!!authHeader}. Token length: ${token ? token.length : 0}`);

    if (!token) {
      console.warn(`[WhatsApp Debug] Access to POST /api/whatsapp/send without token. Falling back to permissive processing for automatic notifications.`);
      sendMessage(number, message)
        .then((result) => {
          console.log(`[WhatsApp Debug] Permissive message sent successfully via ${result.provider}`);
          res.json({ success: true, provider: result.provider });
        })
        .catch((error) => {
          console.error(`[WhatsApp Debug] Permissive message failed: ${error.message}`);
          res.status(500).json({ error: error.message });
        });
      return;
    }

    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
      if (err) {
        console.error(`[WhatsApp Debug] Invalid token verified during send: ${err.message}. Falling back to permissive send.`);
        try {
          const result = await sendMessage(number, message);
          return res.json({ success: true, provider: result.provider });
        } catch (error: any) {
          return res.status(500).json({ error: error.message });
        }
      }

      console.log(`[WhatsApp Debug] Sending authorized message for user: ${user?.email} (${user?.role})`);
      try {
        const result = await sendMessage(number, message);
        console.log(`[WhatsApp Debug] Message sent successfully via ${result.provider}`);
        res.json({ success: true, provider: result.provider });
      } catch (error: any) {
        console.error(`[WhatsApp Debug] Send message failed: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });
  });

  // --- ERP Core API CRUD Routes ---

  // 1. Unified State Endpoint
  app.get("/api/erp/state", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const customers = await db.collection("customers").find().toArray();
      const products = await db.collection("products").find().toArray();
      const categories = await db.collection("categories").find().toArray();
      const ledger = await db.collection("ledger").find().toArray();
      const halkhata = await db.collection("halkhata").find().toArray();
      const payments = await db.collection("payments").find().toArray();
      const paymentMethods = await db.collection("payment_methods").find().toArray();
      const callLogs = await db.collection("callLogs").find().toArray();
      const campaigns = await db.collection("campaigns").find().toArray();
      const waLogs = await db.collection("waLogs").find().toArray();
      const staff = await db.collection("staff").find().toArray();
      const audits = await db.collection("audits").find().toArray();
      const invoices = await db.collection("invoices").find().toArray();
      const achievements = await db.collection("achievements").find().toArray();
      const certificates = await db.collection("certificates").find().toArray();
      const gallery = await db.collection("gallery").find().toArray();
      const awards = await db.collection("awards").find().toArray();
      const contactMessages = await db.collection("contact_messages").find().toArray();
      const admins = await db.collection("admins").find().toArray();

      const globalSettingsDoc = await db.collection("settings").findOne({ key: "global" });
      const globalSettings = globalSettingsDoc ? globalSettingsDoc.value : {};

      // Map _id to id helper
      const mapId = (arr: any[]) => arr.map(item => {
        const { _id, ...rest } = item;
        return { id: item.id || _id, ...rest };
      });

      res.json({
        customers: mapId(customers),
        products: mapId(products),
        categories: mapId(categories),
        ledger: mapId(ledger),
        halkhata: mapId(halkhata),
        payments: mapId(payments),
        paymentMethods: mapId(paymentMethods),
        callLogs: mapId(callLogs),
        campaigns: mapId(campaigns),
        waLogs: mapId(waLogs),
        staff: mapId(staff),
        audits: mapId(audits),
        invoices: mapId(invoices),
        achievements: mapId(achievements),
        certificates: mapId(certificates),
        gallery: mapId(gallery),
        awards: mapId(awards),
        contactMessages: mapId(contactMessages),
        admins: mapId(admins),
        settings: globalSettings
      });
    } catch (err: any) {
      console.error("[GET /api/erp/state] Error:", err);
      res.status(500).json({ error: "Failed to load complete ERP state from database." });
    }
  });

  // 2. Customers Endpoints
  app.get("/api/erp/customers", authenticateToken, async (req, res) => {
    try {
      const customers = await repository.getCustomers();
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/customers", authenticateToken, async (req, res) => {
    try {
      const customerData = req.body;
      const id = await repository.addDocument("customers", {
        ...customerData,
        dueAmount: customerData.dueAmount || 0,
        documents: customerData.documents || []
      });
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/erp/customers/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      await repository.updateDocument("customers", id, updateData);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/customers/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("customers").deleteOne({ id });
      await db.collection("ledger").deleteMany({ customerId: id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Products Endpoints
  app.get("/api/erp/products", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const products = await db.collection("products").find().toArray();
      res.json(products.map(p => ({ id: p.id || p._id, ...p })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/products", authenticateToken, async (req, res) => {
    try {
      const id = await repository.addDocument("products", req.body);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/erp/products/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      await repository.updateDocument("products", id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/products/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("products").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Categories Endpoints
  app.get("/api/erp/categories", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const categories = await db.collection("categories").find().toArray();
      res.json(categories.map(c => ({ id: c.id || c._id, ...c })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/categories", authenticateToken, async (req, res) => {
    try {
      const id = await repository.addDocument("categories", req.body);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/erp/categories/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      await repository.updateDocument("categories", id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/categories/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("categories").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Ledger & Invoices Endpoints
  app.get("/api/erp/ledger", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const ledger = await db.collection("ledger").find().toArray();
      res.json(ledger.map(l => ({ id: l.id || l._id, ...l })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/ledger", authenticateToken, async (req, res) => {
    try {
      const entry = req.body;
      const id = await repository.addDocument("ledger", entry);

      const db = getDb();
      const entries = await db.collection("ledger").find({ customerId: entry.customerId }).toArray();
      const balance = entries.reduce((sum, item) => {
        if (item.type === "PURCHASE" || item.type === "DUE_CARRY_FORWARD") {
          return sum + item.amount;
        } else {
          return sum - item.amount;
        }
      }, 0);

      await db.collection("customers").updateOne(
        { id: entry.customerId },
        { $set: { dueAmount: balance } }
      );

      res.json({ success: true, id, runningBalance: balance });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/ledger/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const entry = await db.collection("ledger").findOne({ id });
      if (!entry) {
        return res.status(404).json({ error: "Ledger entry not found" });
      }

      await db.collection("ledger").deleteOne({ id });

      // Recalculate customer due balance
      const entries = await db.collection("ledger").find({ customerId: entry.customerId }).toArray();
      const balance = entries.reduce((sum, item) => {
        if (item.type === "PURCHASE" || item.type === "DUE_CARRY_FORWARD") {
          return sum + item.amount;
        } else {
          return sum - item.amount;
        }
      }, 0);

      await db.collection("customers").updateOne(
        { id: entry.customerId },
        { $set: { dueAmount: balance } }
      );

      res.json({ success: true, runningBalance: balance });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Payments Endpoints (Online submissions)
  app.get("/api/erp/payments", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const payments = await db.collection("payments").find().toArray();
      res.json(payments.map(p => ({ id: p.id || p._id, ...p })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/payments", authenticateToken, async (req, res) => {
    try {
      const paymentData = req.body;
      const id = await repository.addDocument("payments", {
        ...paymentData,
        status: paymentData.status || "PENDING"
      });
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/erp/payments/:id/verify", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // "APPROVE" or "REJECT"

      const db = getDb();
      const payment = await db.collection("payments").findOne({ id });
      if (!payment) {
        return res.status(404).json({ error: "Payment transaction not found." });
      }

      const status = action === "APPROVE" ? "VERIFIED" : "REJECTED";
      await db.collection("payments").updateOne({ id }, { $set: { status } });

      if (action === "APPROVE") {
        const ledgerId = `led-online-${Date.now()}`;
        const date = new Date().toISOString().split("T")[0];
        const customerId = payment.customerId;

        // Save PAYMENT ledger entry
        await db.collection("ledger").insertOne({
          _id: ledgerId as any,
          id: ledgerId,
          customerId,
          date,
          type: "PAYMENT",
          description: `Online Settlement via ${payment.method} (TxID: ${payment.transactionId})`,
          amount: payment.amount,
          runningBalance: 0 // Will recalculate running balance below
        });

        // Recalculate and update the running balance of customer in real-time
        const entries = await db.collection("ledger").find({ customerId }).toArray();
        const balance = entries.reduce((sum, item) => {
          if (item.type === "PURCHASE" || item.type === "DUE_CARRY_FORWARD") {
            return sum + item.amount;
          } else {
            return sum - item.amount;
          }
        }, 0);

        await db.collection("ledger").updateOne({ id: ledgerId }, { $set: { runningBalance: balance } });
        await db.collection("customers").updateOne(
          { id: customerId },
          { $set: { dueAmount: balance } }
        );
      }

      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.5 Invoices Endpoints
  app.get("/api/erp/invoices", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const invoices = await db.collection("invoices").find().toArray();
      res.json(invoices.map(i => ({ id: i.id || i._id, ...i })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/invoices", authenticateToken, async (req, res) => {
    try {
      const invoiceData = req.body;
      const id = await repository.addDocument("invoices", invoiceData);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Payment Methods Endpoints
  app.get("/api/erp/payment-methods", async (req, res) => {
    try {
      const db = getDb();
      const methods = await db.collection("payment_methods").find().toArray();
      res.json(methods.map(m => ({ id: m.id || m._id, ...m })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/payment-methods", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = await repository.addDocument("payment_methods", req.body);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/erp/payment-methods/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await repository.updateDocument("payment_methods", id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/payment-methods/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("payment_methods").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Halkhata Events Endpoints
  app.get("/api/erp/halkhata", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const events = await db.collection("halkhata").find().toArray();
      res.json(events.map(e => ({ id: e.id || e._id, ...e })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/halkhata", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = await repository.addDocument("halkhata", req.body);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/erp/halkhata/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await repository.updateDocument("halkhata", id, req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/halkhata/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("halkhata").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Settings Endpoints
  app.post("/api/erp/settings", authenticateToken, isAdmin, async (req, res) => {
    try {
      await repository.saveSettings(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Public State Endpoint ---
  app.get("/api/public/state", async (req, res) => {
    try {
      const db = getDb();
      const products = await db.collection("products").find({ active: { $ne: false } }).toArray();
      const categories = await db.collection("categories").find().toArray();
      const achievements = await db.collection("achievements").find().toArray();
      const certificates = await db.collection("certificates").find().toArray();
      const gallery = await db.collection("gallery").find().toArray();
      const awards = await db.collection("awards").find().toArray();
      const globalSettingsDoc = await db.collection("settings").findOne({ key: "global" });
      const globalSettings = globalSettingsDoc ? globalSettingsDoc.value : {};

      const mapId = (arr: any[]) => arr.map(item => {
        const { _id, ...rest } = item;
        return { id: item.id || _id, ...rest };
      });

      res.json({
        products: mapId(products),
        categories: mapId(categories),
        achievements: mapId(achievements),
        certificates: mapId(certificates),
        gallery: mapId(gallery),
        awards: mapId(awards),
        settings: globalSettings
      });
    } catch (err: any) {
      console.error("[GET /api/public/state] Error:", err);
      res.status(500).json({ error: "Failed to load public state." });
    }
  });

  // --- Public Contact Message Endpoint ---
  app.post("/api/public/contact", async (req, res) => {
    try {
      const { name, email, phone, subject, message } = req.body;
      if (!name || !message) {
        return res.status(400).json({ error: "Name and message are required." });
      }

      const db = getDb();
      const msgId = `msg-${Date.now()}`;
      const contactMsg = {
        _id: msgId as any,
        id: msgId,
        name,
        email: email || "",
        phone: phone || "",
        subject: subject || "No Subject",
        message,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        status: "UNREAD"
      };

      await db.collection("contact_messages").insertOne(contactMsg);

      // Find all registered admins to send them email alerts
      const admins = await db.collection("admins").find().toArray();
      const adminEmails = admins.map(a => a.email).filter(Boolean);

      // Fallback/Default email if no admins exist in collection
      const globalSettingsDoc = await db.collection("settings").findOne({ key: "global" });
      const globalSettings = globalSettingsDoc ? globalSettingsDoc.value : {};
      const shopEmail = globalSettings.emails?.[0] || "mdmoshiurrahmanmohi1@gmail.com";

      if (adminEmails.length === 0) {
        adminEmails.push(shopEmail);
      }

      const emailContent = `
        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px;">New Contact Message Received</h2>
        <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
          You have received a new customer inquiry from your website.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #4b5563; width: 120px;">Sender Name:</td>
            <td style="padding: 10px 0; color: #111827;">${name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #4b5563;">Phone Number:</td>
            <td style="padding: 10px 0; color: #111827;">${phone || "N/A"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #4b5563;">Email Address:</td>
            <td style="padding: 10px 0; color: #111827;"><a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email || "N/A"}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 0; font-weight: 600; color: #4b5563;">Subject:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500;">${subject || "No Subject"}</td>
          </tr>
        </table>

        <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #4b5563; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Message Detail:</p>
          <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
      `;

      const htmlTemplate = getResponsiveTemplate("New Contact Message Received", emailContent);

      for (const recipient of adminEmails) {
        try {
          await Mailer.sendEmail({
            to: recipient,
            subject: `[Contact Inquiry] ${subject || "New Customer Message"}`,
            html: htmlTemplate,
            text: `New Contact Message Received:\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
          });
          console.log(`[Contact Message] Dispatched email alert successfully to admin: ${recipient}`);
        } catch (mailErr) {
          console.warn(`[Contact Message] Failed to send email alert to admin: ${recipient}`, mailErr);
        }
      }

      res.json({ success: true, id: msgId });
    } catch (err: any) {
      console.error("[POST /api/public/contact] Error:", err);
      res.status(500).json({ error: "Failed to submit message." });
    }
  });

  // --- Admin Contact Message Endpoints ---
  app.get("/api/erp/contact-messages", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const messages = await db.collection("contact_messages").find().toArray();
      const mapId = (arr: any[]) => arr.map(item => {
        const { _id, ...rest } = item;
        return { id: item.id || _id, ...rest };
      });
      res.json(mapId(messages));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/erp/contact-messages/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const db = getDb();
      await db.collection("contact_messages").updateOne({ id }, { $set: { status } });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/contact-messages/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("contact_messages").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/contact-messages/:id/reply", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { replyText } = req.body;
      const db = getDb();
      const msg = await db.collection("contact_messages").findOne({ id });
      if (!msg) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (!msg.email) {
        return res.status(400).json({ error: "Sender email is missing on this message." });
      }

      await Mailer.sendEmail({
        to: msg.email,
        subject: `Re: ${msg.subject || 'Your inquiry'}`,
        text: replyText,
        html: `<h3>Reply to your message:</h3><p style="white-space: pre-wrap;">${replyText}</p><hr><p>Original Message from ${msg.name}:</p><blockquote style="color: #555;">${msg.message}</blockquote>`
      });

      await db.collection("contact_messages").updateOne(
        { id },
        { 
          $set: { 
            status: "REPLIED",
            repliedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
            replyText 
          } 
        }
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin Multi-Admin Management Endpoints ---
  app.get("/api/erp/admins", authenticateToken, async (req, res) => {
    try {
      const db = getDb();
      const admins = await db.collection("admins").find().toArray();
      const mapId = (arr: any[]) => arr.map(item => {
        const { _id, ...rest } = item;
        return { id: item.id || _id, ...rest };
      });
      res.json(mapId(admins));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp/admins", authenticateToken, async (req: any, res) => {
    try {
      if (req.user?.adminRole !== "Super Admin" && req.user?.email !== "mdmoshiurrahmanmohi1@gmail.com") {
        return res.status(403).json({ error: "Access denied. Only Super Admin can manage administrators." });
      }

      const adminData = req.body;
      const db = getDb();
      
      if (adminData.id) {
        const { id, ...updateFields } = adminData;
        await db.collection("admins").updateOne({ id }, { $set: updateFields });
        res.json({ success: true });
      } else {
        const id = `admin-${Date.now()}`;
        const newAdmin = {
          _id: id as any,
          id,
          ...adminData,
          status: adminData.status || "ACTIVE",
          createdAt: new Date().toISOString().slice(0, 10)
        };
        await db.collection("admins").insertOne(newAdmin);
        res.json({ success: true, id });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/admins/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user?.adminRole !== "Super Admin" && req.user?.email !== "mdmoshiurrahmanmohi1@gmail.com") {
        return res.status(403).json({ error: "Access denied. Only Super Admin can delete administrators." });
      }

      const { id } = req.params;
      const db = getDb();
      await db.collection("admins").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin Achievements & Awards Endpoints ---
  app.post("/api/erp/achievements", authenticateToken, isAdmin, async (req, res) => {
    try {
      const data = req.body;
      const db = getDb();
      if (data.id) {
        const { id, ...rest } = data;
        await db.collection("achievements").updateOne({ id }, { $set: rest });
        res.json({ success: true });
      } else {
        const id = `ach-${Date.now()}`;
        await db.collection("achievements").insertOne({ _id: id as any, id, ...data });
        res.json({ success: true, id });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/achievements/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("achievements").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin Certificates Endpoints ---
  app.post("/api/erp/certificates", authenticateToken, isAdmin, async (req, res) => {
    try {
      const data = req.body;
      const db = getDb();
      if (data.id) {
        const { id, ...rest } = data;
        await db.collection("certificates").updateOne({ id }, { $set: rest });
        res.json({ success: true });
      } else {
        const id = `cert-${Date.now()}`;
        await db.collection("certificates").insertOne({ _id: id as any, id, ...data });
        res.json({ success: true, id });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/certificates/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("certificates").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin Gallery Endpoints ---
  app.post("/api/erp/gallery", authenticateToken, isAdmin, async (req, res) => {
    try {
      const data = req.body;
      const db = getDb();
      if (data.id) {
        const { id, ...rest } = data;
        await db.collection("gallery").updateOne({ id }, { $set: rest });
        res.json({ success: true });
      } else {
        const id = `gal-${Date.now()}`;
        await db.collection("gallery").insertOne({ _id: id as any, id, ...data });
        res.json({ success: true, id });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp/gallery/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("gallery").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Awards Endpoints ---
  app.get("/api/awards", async (req, res) => {
    try {
      const db = getDb();
      const awards = await db.collection("awards").find().toArray();
      const mapId = (arr: any[]) => arr.map(item => {
        const { _id, ...rest } = item;
        return { id: item.id || _id, ...rest };
      });
      res.json(mapId(awards));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/awards", authenticateToken, isAdmin, async (req, res) => {
    try {
      const data = req.body;
      const db = getDb();
      const id = data.id || `award-${Date.now()}`;
      const newAward = {
        _id: id as any,
        id,
        title: data.title,
        year: data.year,
        company: data.company,
        description: data.description,
        image: data.image || "",
        createdAt: data.createdAt || new Date().toISOString()
      };
      await db.collection("awards").insertOne(newAward);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/awards/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const db = getDb();
      const updated = {
        title: data.title,
        year: data.year,
        company: data.company,
        description: data.description,
        image: data.image,
        createdAt: data.createdAt || new Date().toISOString()
      };
      await db.collection("awards").updateOne({ id }, { $set: updated });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/awards/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.collection("awards").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin Management Endpoints ---
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    const userRole = req.user?.adminRole;
    const userEmail = req.user?.email;
    if (userRole === "Super Admin" || userEmail === "mdmoshiurrahmanmohi1@gmail.com") {
      return next();
    }
    return res.status(403).json({ error: "Access denied. Only Super Admin can manage administrator accounts." });
  };

  app.get("/api/admins", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const db = getDb();
      const admins = await db.collection("admins").find().toArray();
      const mapId = (arr: any[]) => arr.map(item => {
        const { _id, password, password_hash, ...rest } = item;
        return { id: item.id || _id, ...rest };
      });
      res.json(mapId(admins));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admins", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const data = req.body;
      const db = getDb();

      if (!data.name || !data.email || !data.role) {
        return res.status(400).json({ error: "Name, email and role are required." });
      }

      const emailLower = data.email.trim().toLowerCase();
      const existing = await db.collection("admins").findOne({ email: emailLower });
      if (existing) {
        return res.status(400).json({ error: "An admin with this email address already exists." });
      }

      const id = `admin-${Date.now()}`;
      const newAdmin = {
        _id: id as any,
        id,
        name: data.name,
        email: emailLower,
        phone: data.phone || "",
        password: data.password || "admin123",
        password_hash: data.password || "admin123",
        role: data.role,
        permissions: data.permissions || {
          dashboard: false,
          products: false,
          awards: false,
          licenses: false,
          crm: false,
          inventory: false,
          billing: false,
          memo: false,
          halkhata: false,
          communication: false,
          whatsapp: false,
          settings: false,
          contactMessages: false,
          adminManagement: false
        },
        profileImage: data.profileImage || "",
        status: data.status || "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.collection("admins").insertOne(newAdmin);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admins/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const db = getDb();

      const existing = await db.collection("admins").findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: "Admin not found." });
      }

      if (existing.email === "mdmoshiurrahmanmohi1@gmail.com") {
        if (data.status === "INACTIVE" || data.status === "DISABLED") {
          return res.status(400).json({ error: "Super Admin account cannot be disabled." });
        }
        if (data.role && data.role !== "Super Admin") {
          return res.status(400).json({ error: "The core Super Admin role cannot be modified." });
        }
      }

      const updatedFields: any = {
        name: data.name ?? existing.name,
        email: data.email ? data.email.trim().toLowerCase() : existing.email,
        phone: data.phone ?? existing.phone,
        role: data.role ?? existing.role,
        permissions: data.permissions ?? existing.permissions,
        profileImage: data.profileImage ?? existing.profileImage,
        status: data.status ?? existing.status,
        updatedAt: new Date().toISOString()
      };

      if (data.password) {
        updatedFields.password = data.password;
        updatedFields.password_hash = data.password;
      }

      await db.collection("admins").updateOne({ id }, { $set: updatedFields });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admins/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();

      const existing = await db.collection("admins").findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: "Admin not found." });
      }

      if (existing.role === "Super Admin" || existing.email === "mdmoshiurrahmanmohi1@gmail.com") {
        return res.status(400).json({ error: "Super Admin accounts cannot be deleted." });
      }

      await db.collection("admins").deleteOne({ id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admins/:id/password-reset", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const db = getDb();

      if (!password) {
        return res.status(400).json({ error: "New password is required." });
      }

      const existing = await db.collection("admins").findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: "Admin not found." });
      }

      await db.collection("admins").updateOne(
        { id },
        { 
          $set: { 
            password, 
            password_hash: password,
            updatedAt: new Date().toISOString()
          } 
        }
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- API 404 Route Handler ---
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route Not Found" });
  });

  // --- Global Exception Middleware ---
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Global Exception Catch]", err);
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || "Internal Server Error",
      statusCode
    });
  });

  // --- Vite / Static ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Lovely Enterprise Server running on port ${PORT}`);
});
}

startServer().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
