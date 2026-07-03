/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShopConfig {
  shopName: string;
  secondaryLicenseName: string;
  proprietorName: string;
  address: string;
  phoneNumbers: string[];
  emails: string[];
  adminPassword?: string;
  googleMapsUrl: string;
  logoText: string;
  bannerUrl: string;
  socialLinks: {
    facebook?: string;
    youtube?: string;
    whatsapp?: string;
    linkedin?: string;
  };
  lovelyProprietor?: string;
  lovelyLicenseNo?: string;
  lovelyPhone?: string;
  mahiProprietor?: string;
  mahiLicenseNo?: string;
  mahiPhone?: string;
  
  // Custom Branding
  siteTitle?: string;
  faviconUrl?: string;
  themeColor?: string; // e.g. "Green" or hex code
  
  // Dynamic top banner
  bannerShow?: boolean;
  bannerText?: string;
  
  // Hero section CMS
  heroTitle?: string;
  heroDesc?: string;
  heroBtnText?: string;
  heroBtnLink?: string;
  
  // About Us section CMS
  aboutTitle?: string;
  aboutDesc?: string;
  aboutOwnerImage?: string;
  aboutOwnerName?: string;
  
  // Section show/hide toggles
  showEntities?: boolean;
  showAbout?: boolean;
  showProducts?: boolean;
  showAchievements?: boolean;
  showGallery?: boolean;
  showContact?: boolean;
  showFooter?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  companyName: string;
  brand: string;
  price: number;
  costPrice: number;
  stock: number;
  minStockAlert: number;
  unit: string;
  sku: string;
  image?: string;
  description?: string;
  active?: boolean;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: "PURCHASE" | "PAYMENT" | "DUE_CARRY_FORWARD";
  description: string;
  amount: number; // For PURCHASE, positive. For PAYMENT, positive.
  runningBalance: number; // Balance owed by customer after this transaction
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  address: string;
  nidNumber?: string;
  area?: 'Area 1' | 'Area 2' | 'Area 3';
  serialNumber?: string;
  dueAmount: number; // Derived/cached running balance
  notes?: string;
  status: "ACTIVE" | "INACTIVE";
  documents: {
    id: string;
    name: string;
    uploadedAt: string;
    fileSize: string;
  }[];
}

export interface QueueItem {
  id: string;
  recipient: string;
  customerName: string;
  dueAmount: number;
  status: "Queued" | "Sent" | "Failed";
  attempts: number;
  message: string;
  timestamp: string;
  retryCount: number;
  deliveryRate?: string;
  retriedAt?: string;
}

export interface HalKhataCustomerRecord {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  dueAmount: number;
  pdfUrl: string; // Dynamic path for invoices
  verificationStatus: "Pending" | "Sent" | "Delivered" | "Paid";
  remindersSent: string[]; // ['30_DAYS', '15_DAYS', '7_DAYS', '3_DAYS', '1_DAY', 'MORNING', 'AFTERNOON', 'EVENING']
  callsQueued: boolean;
  whatsAppQueued: boolean;
  emailQueued: boolean;
  smsQueued: boolean;
}

export interface HalKhataEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  invitationTemplate: string;
  reminderSchedule: string; // 'Standard' | 'Custom'
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
  customerRecords: HalKhataCustomerRecord[];
  queues: {
    emails: QueueItem[];
    sms: QueueItem[];
    whatsApp: QueueItem[];
    calls: CallLog[];
  };
}

export interface StaffMember {
  id: string;
  name: string;
  role: "Admin" | "Sales Executive" | "Accountant" | "Inventory Manager";
  phone: string;
  email: string;
  password?: string;
  status: "Present" | "Absent" | "On Leave";
  attendance: { [date: string]: "Present" | "Absent" | "Leave" };
  permissions: string[];
}

export interface PaymentTransaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: "bKash" | "Nagad" | "Upay" | "Bank Transfer";
  accountNo: string;
  transactionId: string;
  timestamp: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  auditLogId?: string;
  screenshotUrl?: string;
}

export interface NotificationLog {
  id: string;
  type: "SMS" | "Email" | "WhatsApp";
  recipient: string;
  message: string;
  timestamp: string;
  status: "SENT" | "FAILED";
  triggerEvent: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
}

export interface Achievement {
  id: string;
  title: string;
  year: string;
  organization: string;
  description: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  imageUrl: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
}

export interface CommunicationSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword?: string;
  smtpEncryption: "SSL" | "TLS" | "None";
  smtpFromName: string;
  smtpFromEmail: string;

  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;

  waProvider: string;
  waApiKey: string;
  waAccessToken: string;
  waPhoneNumberId: string;
  waBusinessAccountId: string;

  sipProvider: string;
  sipUsername: string;
  sipPassword?: string;
  sipServer: string;
  sipVoiceTemplates: { id: string; name: string; text: string }[];
}

export interface PaymentGatewaySettings {
  bkashPersonalNumber: string;
  bkashMerchantApi: string;
  bkashEnabled: boolean;
  nagadNumber: string;
  nagadMerchantApi: string;
  nagadEnabled: boolean;
  upayNumber: string;
  upayEnabled: boolean;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranchName: string;
  bankRoutingNumber: string;
  bankEnabled: boolean;
}

export interface PBXSettings {
  providerName: string;
  pbxNumber: string;
  apiBaseUrl: string;
  apiUsername: string;
  apiPassword?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl: string;
}

export interface PBXExtension {
  id: string;
  extensionNumber: string;
  employeeName: string;
  role: string;
  status: "ACTIVE" | "DISABLED";
}

export interface PBXIVRConfig {
  id: string;
  audioUrl: string;
  isActive: boolean;
  defaultOperatorExtension: string;
  keyMappings: { key: string; description: string; targetExtension: string }[];
}

export interface WhatsAppMultiProviderSettings {
  activeProvider: "Baileys" | "Disabled";
  baileys: {
    sessionName: string;
  };
}

export interface WhatsAppMessageLog {
  id: string;
  recipient: string;
  messageType: string;
  provider: "Baileys" | "None";
  status: "Delivered" | "Failed" | "Pending";
  error?: string;
  timestamp: string;
}
export interface VoiceProviderConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  apiSecret?: string;
  callerId?: string;
  defaultVoice: string;
  language: string;
  webhookUrl: string;
  retryCount: number;
  retryDelay: number;
  concurrentCalls: number;
  callTimeout: number;
  enableRecording: boolean;
  enableTTS: boolean;
  enableRecordedVoice: boolean;
  enableSchedule: boolean;
  enableBulkCalling: boolean;
  enableCallback: boolean;
}

export type CallStatus =
  | "PENDING"
  | "QUEUED"
  | "CALLING"
  | "RINGING"
  | "ANSWERED"
  | "CONNECTED"
  | "COMPLETED"
  | "BUSY"
  | "NO_ANSWER"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING"
  | "Queued"
  | "Ringing"
  | "In Progress"
  | "Completed"
  | "No Answer"
  | "Failed";

export interface VoiceTemplate {
  id: string;
  name: string;
  text: string;
  audioUrl?: string;
  type: "TTS" | "RECORDED";
}

export interface AudioAsset {
  id: string;
  name: string;
  url: string;
  duration?: number;
  createdAt: string;
}

export interface CallLog {
  id: string;
  campaignId?: string;
  customerId: string;
  customerName: string;
  phone: string;
  customerPhone?: string; // Legacy compatibility
  status: CallStatus;
  attempts: number;
  duration?: number;
  recordingUrl?: string;
  voiceText?: string;
  dtmf?: string;
  apiResponse?: any;
  webhookResponse?: any;
  timestamp: string;
  nextRetryAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: "HALKHATA" | "PROMOTIONAL" | "REMINDER";
  status: "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  voiceTemplateId: string;
  whatsappTemplateId?: string;
  smsTemplateId?: string;
  emailTemplateId?: string;
  scheduledAt?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  customerIds: string[];
  calls?: CallLog[]; // Legacy compatibility
  metrics: {
    total: number;
    answered: number;
    busy: number;
    failed: number;
    noAnswer: number;
    avgDuration: number;
  };
}

export interface IVRLog {
  id: string;
  phone: string;
  timestamp: string;
  duration: number; // seconds
  actions: string[]; // ['Call Answered', 'Press 1 (Due Inquiry)', 'Check Due ($4,200)', 'Call Terminated']
  recordingUrl?: string;
}

export interface OutgoingCampaign {
  id: string;
  name: string;
  voiceTemplate: string;
  createdAt: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  calls: CallLog[];
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: "READ" | "UNREAD";
  createdAt: string;
}

export interface Award {
  id: string;
  title: string;
  year: string;
  company: string;
  description: string;
  image: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: "Super Admin" | "Admin" | "Manager" | "Staff";
  permissions: {
    dashboard: boolean;
    products: boolean;
    awards: boolean;
    licenses: boolean;
    crm: boolean;
    inventory: boolean;
    billing: boolean;
    memo: boolean;
    halkhata: boolean;
    communication: boolean;
    whatsapp: boolean;
    settings: boolean;
    contactMessages: boolean;
    adminManagement: boolean;
  };
  profileImage?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt?: string;
}

export interface FullState {
  config: ShopConfig;
  categories: ProductCategory[];
  products: Product[];
  customers: Customer[];
  ledger: LedgerEntry[];
  halkhata: HalKhataEvent[];
  staff: StaffMember[];
  payments: PaymentTransaction[];
  notifications: NotificationLog[];
  audits: AuditLog[];
  achievements: Achievement[];
  certificates: Certificate[];
  gallery: GalleryItem[];
  campaigns: Campaign[];
  outgoingCampaigns: OutgoingCampaign[];
  callLogs: CallLog[];
  ivrLogs: IVRLog[];
  voiceTemplates: VoiceTemplate[];
  audioLibrary: AudioAsset[];
  voiceProvider: VoiceProviderConfig;
  backups: {
    id: string;
    timestamp: string;
    fileName: string;
    size: string;
    status: string;
  }[];
  communicationSettings: CommunicationSettings;
  paymentSettings: PaymentGatewaySettings;
  pbxSettings: PBXSettings;
  pbxExtensions: PBXExtension[];
  pbxIvrConfig: PBXIVRConfig;
  waMultiSettings?: WhatsAppMultiProviderSettings;
  waLogs?: WhatsAppMessageLog[];
  resetTokens?: { email: string; token: string; expires: number }[];
  invoices?: Invoice[];
  contactMessages?: ContactMessage[];
  awards?: Award[];
  admins?: AdminUser[];
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  date: string;
  timestamp: string;
}

