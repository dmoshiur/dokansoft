import { getDb } from "./mongodb.ts";

export interface OTPRecord {
  identifier: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  isUsed: boolean;
  lastResendTime?: number;
}

export class OTPStore {
  private static generateSecure6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate and store OTP
  static async generateOTP(identifier: string): Promise<OTPRecord> {
    const db = getDb();
    const now = Date.now();

    // Try to find and reuse an existing, valid, non-expired, unused OTP record
    try {
      const existing = await db.collection("otps").findOne({
        $or: [
          { _id: identifier as any },
          { identifier }
        ]
      }) as unknown as OTPRecord | null;

      if (existing && !existing.isUsed && existing.expiresAt > now && existing.attempts < 3) {
        console.log(`[OTPStore] Reusing existing valid OTP for identifier: ${identifier}`);
        return existing;
      }
    } catch (findErr) {
      console.warn(`[OTPStore] Error looking for existing OTP, proceeding to generate:`, findErr);
    }

    const code = this.generateSecure6DigitCode();
    const duration = 5 * 60 * 1000; // 5 minutes
    
    const otpRecord: OTPRecord = {
      identifier,
      code,
      createdAt: now,
      expiresAt: now + duration,
      attempts: 0,
      isUsed: false,
      lastResendTime: now
    };

    // Use updateOne with upsert to completely avoid duplicate key errors on _id
    await db.collection("otps").updateOne(
      { _id: identifier as any },
      { $set: otpRecord },
      { upsert: true }
    );

    return otpRecord;
  }

  // Retrieve an active OTP record
  static async getActiveOTP(identifier: string): Promise<OTPRecord | null> {
    const db = getDb();
    const record = await db.collection("otps").findOne({
      $or: [
        { _id: identifier as any },
        { identifier }
      ]
    });
    return record as unknown as OTPRecord;
  }

  // Verify OTP
  static async verifyOTP(identifier: string, code: string): Promise<{ success: boolean; message: string }> {
    const record = await this.getActiveOTP(identifier);
    
    if (!record) {
      return { success: false, message: "No active OTP request found. Please request a new one." };
    }

    if (record.isUsed) {
      return { success: false, message: "This OTP has already been used." };
    }

    if (Date.now() > record.expiresAt) {
      await this.invalidateOTP(identifier);
      return { success: false, message: "Your OTP has expired. Please request a new code." };
    }

    if (record.attempts >= 3) {
      await this.invalidateOTP(identifier);
      return { success: false, message: "Too many incorrect attempts. This OTP has been locked. Please request a new code." };
    }

    if (record.code !== code) {
      // Increment attempt
      const updatedAttempts = record.attempts + 1;
      await this.incrementAttempts(identifier, updatedAttempts);
      const remaining = 3 - updatedAttempts;
      return { 
        success: false, 
        message: `Incorrect verification code. ${remaining} attempts remaining before lock.` 
      };
    }

    // Success - invalidate OTP immediately
    await this.markOTPAsUsed(identifier);
    return { success: true, message: "Verification successful!" };
  }

  // Update attempts
  private static async incrementAttempts(identifier: string, attempts: number) {
    const db = getDb();
    await db.collection("otps").updateOne(
      {
        $or: [
          { _id: identifier as any },
          { identifier }
        ]
      },
      { $set: { attempts } }
    );
  }

  // Mark OTP as used
  static async markOTPAsUsed(identifier: string) {
    const db = getDb();
    await db.collection("otps").updateOne(
      {
        $or: [
          { _id: identifier as any },
          { identifier }
        ]
      },
      { $set: { isUsed: true } }
    );
  }

  // Invalidate/delete OTP
  static async invalidateOTP(identifier: string) {
    const db = getDb();
    await db.collection("otps").deleteMany({
      $or: [
        { _id: identifier as any },
        { identifier }
      ]
    });
  }

  // Check resend cooldown
  static async checkCooldown(identifier: string): Promise<{ allowed: boolean; remainingSeconds: number }> {
    const record = await this.getActiveOTP(identifier);
    if (!record || !record.lastResendTime) {
      return { allowed: true, remainingSeconds: 0 };
    }

    const now = Date.now();
    const elapsed = now - record.lastResendTime;
    const cooldown = 60 * 1000; // 60 seconds cooldown

    if (elapsed < cooldown) {
      const remainingSeconds = Math.ceil((cooldown - elapsed) / 1000);
      return { allowed: false, remainingSeconds };
    }

    return { allowed: true, remainingSeconds: 0 };
  }

  // Update last resend time
  static async updateResendTime(identifier: string) {
    const now = Date.now();
    const db = getDb();
    await db.collection("otps").updateOne(
      {
        $or: [
          { _id: identifier as any },
          { identifier }
        ]
      },
      { $set: { lastResendTime: now } }
    );
  }
}
