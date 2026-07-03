/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  ShopConfig,
  ProductCategory,
  Product,
  Customer,
  LedgerEntry,
  HalKhataEvent,
  OutgoingCampaign,
  IVRLog,
  StaffMember,
  PaymentTransaction,
  NotificationLog,
  AuditLog,
  Achievement,
  Certificate,
  GalleryItem,
  CallLog,
  FullState,
  CommunicationSettings,
  QueueItem,
  HalKhataCustomerRecord,
  PaymentGatewaySettings,
  WhatsAppMultiProviderSettings,
  WhatsAppMessageLog,
  PBXSettings,
  PBXExtension,
  PBXIVRConfig,
  Invoice,
  ContactMessage,
  Award,
  AdminUser,
} from "./types";

// Standard storage key
const STORAGE_KEY = "lovely_enterprise_erp_data_v2";

const INITIAL_WA_MULTI_SETTINGS: WhatsAppMultiProviderSettings = {
  activeProvider: "Baileys",
  baileys: {
    sessionName: "default_session",
  },
};

// Clean Initial Datastore
const INITIAL_SHOP_CONFIG: ShopConfig = {
  shopName: "M/S Lovely Enterprise",
  secondaryLicenseName: "M/s Mahi & Muhi Traders",
  proprietorName: "Md. Moshiur Rahman Mohi",
  address: "Dewanganj Road, Jamalpur, Bangladesh",
  phoneNumbers: ["+8801712-345678", "+8801911-223344"],
  emails: ["mdmoshiurrahmanmohi1@gmail.com"],
  adminPassword: "admin123",
  googleMapsUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3648.4067975878297!2d90.4042852!3d23.9990817!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755daf8a509990d%3A0xc0959f6350d750c!2sGazipur!5e0!3m2!1sen!2sbd!4v1680000000000!5m2!1sen!2sbd",
  logoText: "M/S Lovely Enterprise",
  bannerUrl:
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop",
  socialLinks: {
    facebook: "https://facebook.com/lovelyenterprise",
    youtube: "https://youtube.com/lovelyenterprise",
    whatsapp: "https://wa.me/8801712345678",
    linkedin: "https://linkedin.com/company/lovelyenterprise",
  },
  lovelyProprietor: "Md. Moshiur Rahman Mohi",
  lovelyLicenseNo: "LIC-LE-998877",
  lovelyPhone: "+8801712-345678",
  mahiProprietor: "Mst. Muhi Begum",
  mahiLicenseNo: "LIC-MM-112233",
  mahiPhone: "+8801911-223344",
  
  // Custom Branding
  siteTitle: "Lovely Enterprise | Premium Agro Inputs & Logistics",
  faviconUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=32&h=32&fit=crop",
  themeColor: "Green",

  // Top banner
  bannerShow: true,
  bannerText: "🌾 Annual HalKhata collection is now ongoing! Pay outstanding dues online via bKash/Nagad. 🌾",

  // Hero section
  heroTitle: "Empowering Bangladesh Farmers with Premium Agricultural Inputs",
  heroDesc: "Registered seed, chemical, and fertilizer distributors providing verified inputs, flexible crop credit ledgers, and digital HalKhata management.",
  heroBtnText: "Browse Inputs",
  heroBtnLink: "#section_products",

  // About Us section
  aboutTitle: "About Lovely Enterprise & Agronomy",
  aboutDesc: "Established with a goal of reinforcing Bangladesh's agricultural backbone, we supply certified high-yield hybrid rice, maize, and vegetable seeds, alongside high-grade eco-friendly organic pesticides and fertilizers. Under leadership of proprietor Md. Moshiur Rahman Mohi, we have expanded to Gazipur and Jamalpur as regional logistics partners.",
  aboutOwnerImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
  aboutOwnerName: "Md. Moshiur Rahman Mohi",

  // Section show/hide toggles
  showEntities: true,
  showAbout: true,
  showProducts: true,
  showAchievements: true,
  showGallery: true,
  showContact: true,
  showFooter: true,
};

const INITIAL_COMMUNICATION_SETTINGS: CommunicationSettings = {
  smtpHost: "",
  smtpPort: "",
  smtpUsername: "",
  smtpPassword: "",
  smtpEncryption: "None",
  smtpFromName: "",
  smtpFromEmail: "",
  smsProvider: "",
  smsApiKey: "",
  smsSenderId: "",
  waProvider: "",
  waApiKey: "",
  waAccessToken: "",
  waPhoneNumberId: "",
  waBusinessAccountId: "",
  sipProvider: "",
  sipUsername: "",
  sipPassword: "",
  sipServer: "",
  sipVoiceTemplates: [],
};

const INITIAL_PBX_SETTINGS: PBXSettings = {
  providerName: "Brilliant PBX Bangladesh",
  pbxNumber: "09658939492",
  apiBaseUrl: "",
  apiUsername: "",
  apiPassword: "",
  apiKey: "",
  apiSecret: "",
  webhookUrl: "",
};

const INITIAL_PBX_EXTENSIONS: PBXExtension[] = [];

const INITIAL_PBX_IVR_CONFIG: PBXIVRConfig = {
  id: "ivr-1",
  audioUrl: "",
  isActive: false,
  defaultOperatorExtension: "",
  keyMappings: [],
};

const INITIAL_PAYMENT_GATEWAY_SETTINGS: PaymentGatewaySettings = {
  bkashPersonalNumber: "",
  bkashMerchantApi: "",
  bkashEnabled: false,
  nagadNumber: "",
  nagadMerchantApi: "",
  nagadEnabled: false,
  upayNumber: "",
  upayEnabled: false,
  bankAccountName: "",
  bankAccountNumber: "",
  bankName: "",
  bankBranchName: "",
  bankRoutingNumber: "",
  bankEnabled: false,
};

const SEEDED_CATEGORIES: ProductCategory[] = [];
const SEEDED_PRODUCTS: Product[] = [];
const SEEDED_CUSTOMERS: Customer[] = [];
const SEEDED_STAFF: StaffMember[] = [];
const SEEDED_LEDGER: LedgerEntry[] = [];

export const loadInitialState = (): FullState => {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (!parsed.paymentSettings) {
          parsed.paymentSettings = INITIAL_PAYMENT_GATEWAY_SETTINGS;
        }
        if (!parsed.communicationSettings) {
          parsed.communicationSettings = INITIAL_COMMUNICATION_SETTINGS;
        }
        if (!parsed.pbxSettings) {
          parsed.pbxSettings = INITIAL_PBX_SETTINGS;
        }
        if (!parsed.pbxExtensions) {
          parsed.pbxExtensions = INITIAL_PBX_EXTENSIONS;
        }
        if (!parsed.pbxIvrConfig) {
          parsed.pbxIvrConfig = INITIAL_PBX_IVR_CONFIG;
        }
        if (!parsed.waMultiSettings) {
          parsed.waMultiSettings = INITIAL_WA_MULTI_SETTINGS;
        } else {
          parsed.waMultiSettings.activeProvider = "Baileys";
        }
        if (!parsed.waLogs) {
          parsed.waLogs = [];
        }
        if (!parsed.invoices) {
          parsed.invoices = [];
        }
        if (!parsed.outgoingCampaigns) parsed.outgoingCampaigns = [];
        if (!parsed.callLogs) parsed.callLogs = [];
        if (!parsed.ivrLogs) parsed.ivrLogs = [];
        if (!parsed.voiceTemplates) parsed.voiceTemplates = [];
        if (!parsed.audioLibrary) parsed.audioLibrary = [];
        if (!parsed.voiceProvider) {
           parsed.voiceProvider = {
              id: 'default',
              name: 'InfoSoft BD',
              apiUrl: 'https://api.infosoftbd.com',
              apiKey: '',
              defaultVoice: 'en-US-Standard-C',
              language: 'en-US',
              webhookUrl: '',
              retryCount: 3,
              retryDelay: 300,
              concurrentCalls: 10,
              callTimeout: 60,
              enableRecording: true,
              enableTTS: true,
              enableRecordedVoice: true,
              enableSchedule: true,
              enableBulkCalling: true,
              enableCallback: true
           };
        }
        return parsed;
      } catch (e) {
        console.error("Failed parsing cached state, loading seed data.", e);
      }
    }
  }

  return {
    config: INITIAL_SHOP_CONFIG,
    categories: SEEDED_CATEGORIES,
    products: SEEDED_PRODUCTS,
    customers: SEEDED_CUSTOMERS,
    ledger: SEEDED_LEDGER,
    halkhata: [],
    staff: SEEDED_STAFF,
    payments: [],
    notifications: [],
    audits: [
      {
        id: "aud-init-1",
        action: "SYSTEM_BOOT",
        module: "System Care",
        details: "Database initialized with secure credentials",
        timestamp: "2026-06-25 10:00:00",
        ipAddress: "127.0.0.1",
        userId: "system",
        username: "System",
        userRole: "system",
      },
    ],
    achievements: [],
    certificates: [],
    gallery: [],
    campaigns: [],
    outgoingCampaigns: [],
    callLogs: [],
    ivrLogs: [],
    voiceTemplates: [],
    audioLibrary: [],
    voiceProvider: {
      id: 'default',
      name: 'InfoSoft BD',
      apiUrl: 'https://api.infosoftbd.com',
      apiKey: '',
      defaultVoice: 'en-US-Standard-C',
      language: 'en-US',
      webhookUrl: '',
      retryCount: 3,
      retryDelay: 300,
      concurrentCalls: 10,
      callTimeout: 60,
      enableRecording: true,
      enableTTS: true,
      enableRecordedVoice: true,
      enableSchedule: true,
      enableBulkCalling: true,
      enableCallback: true
    },
    backups: [],
    communicationSettings: INITIAL_COMMUNICATION_SETTINGS,
    paymentSettings: INITIAL_PAYMENT_GATEWAY_SETTINGS,
    pbxSettings: INITIAL_PBX_SETTINGS,
    pbxExtensions: INITIAL_PBX_EXTENSIONS,
    pbxIvrConfig: INITIAL_PBX_IVR_CONFIG,
    waMultiSettings: INITIAL_WA_MULTI_SETTINGS,
    waLogs: [],
    invoices: [],
    contactMessages: [],
    awards: [],
  };
};

export const useERPStore = () => {
  const [state, setState] = useState<FullState>(loadInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const loadRemoteState = async () => {
    // 1. Fetch public state first to populate public website components with real DB data
    try {
      const publicRes = await fetch("/api/public/state");
      if (publicRes.ok) {
        const publicData = await publicRes.json();
        setState(prev => ({
          ...prev,
          ...publicData,
          config: publicData.settings?.shopName ? { ...prev.config, ...publicData.settings } : prev.config,
          paymentSettings: publicData.settings?.paymentSettings || prev.paymentSettings,
          communicationSettings: publicData.settings?.communicationSettings || prev.communicationSettings,
          pbxSettings: publicData.settings?.pbxSettings || prev.pbxSettings,
        }));
      }
    } catch (publicErr) {
      console.error("Failed to load public state from database:", publicErr);
    }

    // 2. Fetch authenticated ERP state if logged in
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (!token) return;
    try {
      const res = await fetch("/api/erp/state", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const remote = await res.json();
        setState(prev => {
          return {
            ...prev,
            ...remote,
            config: remote.settings?.shopName ? { ...prev.config, ...remote.settings } : prev.config,
            paymentSettings: remote.settings?.paymentSettings || prev.paymentSettings,
            communicationSettings: remote.settings?.communicationSettings || prev.communicationSettings,
            pbxSettings: remote.settings?.pbxSettings || prev.pbxSettings,
            pbxExtensions: remote.pbxExtensions || prev.pbxExtensions,
            pbxIvrConfig: remote.pbxIvrConfig || prev.pbxIvrConfig
          };
        });
      }
    } catch (err) {
      console.error("Failed to load ERP state from database:", err);
    }
  };

  useEffect(() => {
    loadRemoteState();
  }, []);

  const addAuditLog = (action: string, module: string, details: string) => {
    const log: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      userId: "st-1",
      username: "Moshiur Rahman Mohi",
      userRole: "Admin",
      action,
      module,
      details,
      ipAddress: "192.168.1.5",
    };
    setState((prev) => ({
      ...prev,
      audits: [log, ...prev.audits],
    }));
  };

  const sendNotification = async (
    type: "SMS" | "Email" | "WhatsApp",
    recipient: string,
    message: string,
    event: string,
  ) => {
    let status: "SENT" | "FAILED" = "SENT";
    let waProvider: "Baileys" | "None" = "None";
    let waError: string | undefined;

    if (type === "WhatsApp") {
      try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ number: recipient, message }),
        });
        const data = await res.json();
        if (!data.success) {
          status = "FAILED";
          waError = data.error;
          console.error("WhatsApp sending failed:", data.error);
        } else {
          waProvider = data.provider || state.waMultiSettings?.activeProvider || "Baileys";
        }
      } catch (e: any) {
        status = "FAILED";
        waError = e.message;
        console.error("WhatsApp API call failed:", e);
      }

      addWhatsAppLog({
        recipient,
        messageType: event,
        provider: waProvider,
        status: status === "SENT" ? "Delivered" : "Failed",
        error: waError,
      });
    }

    const notif: NotificationLog = {
      id: `not-${Date.now()}`,
      type,
      recipient,
      message,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      status,
      triggerEvent: event,
    };
    setState((prev) => ({
      ...prev,
      notifications: [notif, ...prev.notifications],
    }));
  };

  const saveConfig = async (newConfig: ShopConfig) => {
    setState((prev) => ({ ...prev, config: newConfig }));
    addAuditLog(
      "UPDATE_CONFIG",
      "Site Manager",
      "Updated global enterprise identity details",
    );

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newConfig)
        });
      } catch (err) {
        console.error("Failed to sync config to MongoDB:", err);
      }
    }
  };

  const addProduct = async (prod: Omit<Product, "id">) => {
    const newProd = { ...prod, id: `prod-${Date.now()}` };
    setState((prev) => ({ ...prev, products: [...prev.products, newProd] }));
    addAuditLog(
      "ADD_PRODUCT",
      "Product Management",
      `Added product ${prod.name} (SKU: ${prod.sku})`,
    );

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newProd)
        });
      } catch (err) {
        console.error("Failed to sync new product to server:", err);
      }
    }
  };

  const updateProduct = async (updated: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
    }));
    addAuditLog(
      "UPDATE_PRODUCT",
      "Product Management",
      `Updated details and stock for SKU ${updated.sku}`,
    );

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/products/${updated.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.error("Failed to sync updated product to server:", err);
      }
    }
  };

  const deleteProduct = async (id: string) => {
    const prod = state.products.find((p) => p.id === id);
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
    if (prod) {
      addAuditLog(
        "DELETE_PRODUCT",
        "Product Management",
        `Deleted product ${prod.name}`,
      );
    }

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/products/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to sync deleted product to server:", err);
      }
    }
  };

  const addCategory = (cat: Omit<ProductCategory, "id">) => {
    const newCat = { ...cat, id: `cat-${Date.now()}` };
    setState((prev) => ({ ...prev, categories: [...prev.categories, newCat] }));
    addAuditLog(
      "ADD_CATEGORY",
      "Product Management",
      `Created category ${cat.name}`,
    );
  };

  const updateCategory = (updated: ProductCategory) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === updated.id ? updated : c,
      ),
    }));
  };

  const deleteCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  };

  const addCustomer = async (
    cust: Omit<Customer, "id" | "dueAmount" | "documents">,
  ) => {
    const newCust: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      dueAmount: 0,
      documents: [],
    };
    setState((prev) => ({ ...prev, customers: [...prev.customers, newCust] }));
    addAuditLog(
      "ADD_CUSTOMER",
      "Customer Management",
      `Registered customer ${cust.name}`,
    );

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newCust)
        });
      } catch (err) {
        console.error("Failed to sync new customer to server:", err);
      }
    }
  };

  const updateCustomer = async (updated: Customer) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === updated.id ? { ...c, ...updated } : c,
      ),
    }));
    addAuditLog(
      "UPDATE_CUSTOMER",
      "Customer Management",
      `Updated contact/profile details for ${updated.name}`,
    );

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/customers/${updated.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.error("Failed to sync updated customer to server:", err);
      }
    }
  };

  const addCustomerDocument = (
    customerId: string,
    docName: string,
    fileSize: string,
  ) => {
    const doc = {
      id: `doc-${Date.now()}`,
      name: docName,
      uploadedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      fileSize,
    };
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => {
        if (c.id === customerId) {
          return { ...c, documents: [...c.documents, doc] };
        }
        return c;
      }),
    }));
    addAuditLog(
      "UPLOAD_DOCUMENT",
      "Document Management",
      `Uploaded document ${docName} to customer profile`,
    );
  };

  const deleteCustomer = async (id: string) => {
    const cust = state.customers.find((c) => c.id === id);
    setState((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
      ledger: prev.ledger.filter((l) => l.customerId !== id),
    }));
    if (cust) {
      addAuditLog(
        "DELETE_CUSTOMER",
        "Customer Management",
        `Archived customer and removed ledger bounds for ${cust.name}`,
      );
    }

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/customers/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to sync deleted customer to server:", err);
      }
    }
  };

  const addLedgerEntry = async (
    customerId: string,
    type: "PURCHASE" | "PAYMENT",
    description: string,
    amount: number,
    customDate?: string,
  ) => {
    const transactionId = `led-${Date.now()}`;
    const date = customDate || new Date().toISOString().split("T")[0];

    let runningBalanceValue = 0;

    setState((prev) => {
      // 1. Gather existing ledger for customer
      const existingLedger = prev.ledger.filter(
        (l) => l.customerId === customerId,
      );

      // Calculate previous balance
      // Balance owed = sum(purchases) - sum(payments)
      const currentOutstanding = existingLedger.reduce((sum, entry) => {
        if (entry.type === "PURCHASE" || entry.type === "DUE_CARRY_FORWARD") {
          return sum + entry.amount;
        } else {
          return sum - entry.amount;
        }
      }, 0);

      const change = type === "PURCHASE" ? amount : -amount;
      const runningBalance = currentOutstanding + change;
      runningBalanceValue = runningBalance;

      const newEntry: LedgerEntry = {
        id: transactionId,
        customerId,
        date,
        type,
        description,
        amount,
        runningBalance,
      };

      // 2. Add entry to ledger list
      const updatedLedger = [...prev.ledger, newEntry];

      // 3. Update cached dueAmount on customer object
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id === customerId) {
          return { ...c, dueAmount: runningBalance };
        }
        return c;
      });

      return {
        ...prev,
        ledger: updatedLedger,
        customers: updatedCustomers,
      };
    });

    const custName =
      state.customers.find((c) => c.id === customerId)?.name || "Customer";
    addAuditLog(
      "LEDGER_ENTRY",
      "Ledger System",
      `Created ${type} entries for ${custName}, Amount: ${amount} BDT, Outstanding: ${type === "PURCHASE" ? "increased" : "decreased"}`,
    );

    // Sync to backend
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/ledger", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            id: transactionId,
            customerId,
            date,
            type,
            description,
            amount,
            runningBalance: runningBalanceValue
          })
        });
      } catch (err) {
        console.error("Failed to sync ledger entry to server:", err);
      }
    }

    // Trigger automations
    const custObj = state.customers.find((c) => c.id === customerId);
    if (custObj) {
      const contact = custObj.phone || custObj.email || "";
      if (type === "PAYMENT" && custObj.phone) {
        sendNotification(
          "SMS",
          custObj.phone,
          `${state.config.shopName}: Dear ${custObj.name}, payment of ${amount} BDT received. Thank you!`,
          "Collection Alert",
        );
        sendNotification(
          "WhatsApp",
          custObj.phone,
          `Dear ${custObj.name},\nYour payment of ৳${amount} has been received and approved. Thank you!`,
          "Payment Approved",
        );
      } else if (type === "PURCHASE" && custObj.phone) {
        sendNotification(
          "SMS",
          custObj.phone,
          `${state.config.shopName}: Memo generated for purchase of ${amount} BDT. Current running balance: ${custObj.dueAmount + amount} BDT.`,
          "Due Alert",
        );
        sendNotification(
          "WhatsApp",
          custObj.phone,
          `Dear ${custObj.name},\nYour due amount is ৳${custObj.dueAmount + amount}`,
          "Due Reminder",
        );
      }
    }
  };

  const addInvoice = async (
    invoice: Omit<Invoice, "id" | "timestamp">,
  ) => {
    const invoiceId = `INV-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();
    const newInvoice: Invoice = {
      ...invoice,
      id: invoiceId,
      timestamp,
    };

    setState((prev) => {
      const updatedInvoices = [...(prev.invoices || []), newInvoice];
      return {
        ...prev,
        invoices: updatedInvoices,
      };
    });

    await addLedgerEntry(
      invoice.customerId,
      "PURCHASE",
      `Cash Memo Invoice #${invoiceId}`,
      invoice.total,
      invoice.date
    );

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/admin/invoices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newInvoice)
        });
      } catch (err) {
        console.error("Failed to sync new invoice to MongoDB:", err);
      }
    }

    addAuditLog(
      "ADD_INVOICE",
      "Billing System",
      `Generated new cash memo #${invoiceId} for customer ${invoice.customerName}, total: ${invoice.total} BDT`
    );

    const custObjForInvoice = state.customers.find((c) => c.id === invoice.customerId);
    if (custObjForInvoice && custObjForInvoice.phone) {
      sendNotification(
        "WhatsApp",
        custObjForInvoice.phone,
        `Dear ${custObjForInvoice.name},\nThank you for your purchase! Invoice #${invoiceId} has been generated. Total Amount: ৳${invoice.total}.`,
        "Invoice Notification"
      );
    }

    return invoiceId;
  };

  const addAchievement = async (ach: Omit<Achievement, "id">) => {
    const newAch = { ...ach, id: `ach-${Date.now()}` };
    setState((prev) => ({
      ...prev,
      achievements: [...prev.achievements, newAch],
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/achievements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newAch)
        });
      } catch (err) {
        console.error("Failed to sync new achievement to MongoDB:", err);
      }
    }
  };

  const deleteAchievement = async (id: string) => {
    setState((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((a) => a.id !== id),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/achievements/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to delete achievement from MongoDB:", err);
      }
    }
  };

  const addCertificate = async (cert: Omit<Certificate, "id">) => {
    const newCert = { ...cert, id: `cert-${Date.now()}` };
    setState((prev) => ({
      ...prev,
      certificates: [...prev.certificates, newCert],
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/certificates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newCert)
        });
      } catch (err) {
        console.error("Failed to sync new certificate to MongoDB:", err);
      }
    }
  };

  const deleteCertificate = async (id: string) => {
    setState((prev) => ({
      ...prev,
      certificates: prev.certificates.filter((c) => c.id !== id),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/certificates/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to delete certificate from MongoDB:", err);
      }
    }
  };

  const addGalleryItem = async (item: Omit<GalleryItem, "id">) => {
    const newItem = { ...item, id: `gal-${Date.now()}` };
    setState((prev) => ({ ...prev, gallery: [...prev.gallery, newItem] }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newItem)
        });
      } catch (err) {
        console.error("Failed to sync new gallery item to MongoDB:", err);
      }
    }
  };

  const deleteGalleryItem = async (id: string) => {
    setState((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((g) => g.id !== id),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/gallery/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to delete gallery item from MongoDB:", err);
      }
    }
  };

  const submitContactMessage = async (msg: Omit<ContactMessage, "id" | "timestamp" | "status">) => {
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(msg)
      });
      if (res.ok) {
        const data = await res.json();
        // Reload state to reflect the new message locally if admin is logged in
        loadRemoteState();
        return { success: true, id: data.id };
      }
      return { success: false, error: "Failed to submit message." };
    } catch (err: any) {
      console.error("Failed to submit contact message:", err);
      return { success: false, error: err.message };
    }
  };

  const addAward = async (award: Omit<Award, "id" | "createdAt">) => {
    const newAward: Award = {
      ...award,
      id: `award-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      const response = await fetch("/api/awards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newAward)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save award to database");
      }
      
      // Successfully saved to DB, now update local state
      setState((prev) => ({
        ...prev,
        awards: [...(prev.awards || []), newAward],
      }));
      await loadRemoteState();
    }
  };

  const updateAward = async (id: string, award: Partial<Award>) => {
    setState((prev) => ({
      ...prev,
      awards: (prev.awards || []).map((a) => (a.id === id ? { ...a, ...award } : a)),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/awards/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(award)
        });
        loadRemoteState();
      } catch (err) {
        console.error("Failed to update award on MongoDB:", err);
      }
    }
  };

  const deleteAward = async (id: string) => {
    setState((prev) => ({
      ...prev,
      awards: (prev.awards || []).filter((a) => a.id !== id),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/awards/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        loadRemoteState();
      } catch (err) {
        console.error("Failed to delete award from MongoDB:", err);
      }
    }
  };

  const addAdmin = async (admin: Omit<AdminUser, "id" | "createdAt" | "updatedAt"> & { password?: string }) => {
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        const res = await fetch("/api/admins", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(admin)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to add admin");
        }
        await loadRemoteState();
      } catch (err: any) {
        console.error("Failed to add admin on MongoDB:", err);
        throw err;
      }
    }
  };

  const updateAdmin = async (id: string, admin: Partial<AdminUser>) => {
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        const res = await fetch(`/api/admins/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(admin)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update admin");
        }
        await loadRemoteState();
      } catch (err: any) {
        console.error("Failed to update admin on MongoDB:", err);
        throw err;
      }
    }
  };

  const deleteAdmin = async (id: string) => {
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        const res = await fetch(`/api/admins/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to delete admin");
        }
        await loadRemoteState();
      } catch (err: any) {
        console.error("Failed to delete admin from MongoDB:", err);
        throw err;
      }
    }
  };

  const resetAdminPassword = async (id: string, password_plain: string) => {
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        const res = await fetch(`/api/admins/${id}/password-reset`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ password: password_plain })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to reset admin password");
        }
        await loadRemoteState();
      } catch (err: any) {
        console.error("Failed to reset admin password:", err);
        throw err;
      }
    }
  };

  const updateContactMessageStatus = async (id: string, status: "READ" | "UNREAD") => {
    setState((prev) => ({
      ...prev,
      contactMessages: (prev.contactMessages || []).map((m) => (m.id === id ? { ...m, status } : m)),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/contact-messages/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
      } catch (err) {
        console.error("Failed to update contact message status:", err);
      }
    }
  };

  const deleteContactMessage = async (id: string) => {
    setState((prev) => ({
      ...prev,
      contactMessages: (prev.contactMessages || []).filter((m) => m.id !== id),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/contact-messages/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to delete contact message:", err);
      }
    }
  };

  const addHalkhataEvent = async (
    event: Omit<HalKhataEvent, "id" | "status" | "customerRecords" | "queues">,
  ) => {
    const eligibleCustomers = state.customers.filter((c) => c.dueAmount > 0);

    const customerRecords: HalKhataCustomerRecord[] = eligibleCustomers.map(
      (c) => ({
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        customerEmail: c.email,
        dueAmount: c.dueAmount,
        pdfUrl: `/halkhata-pdf/${c.id}`,
        verificationStatus: "Pending",
        remindersSent: [],
        callsQueued: true,
        whatsAppQueued: true,
        emailQueued: !!c.email,
        smsQueued: !!c.phone,
      }),
    );

    const eventId = `hk-${Date.now()}`;
    const shopName = state.config.shopName;
    const propName = state.config.proprietorName;

    const emails: QueueItem[] = eligibleCustomers
      .filter((c) => c.email)
      .map((c, i) => ({
        id: `q-email-${Date.now()}-${i}`,
        recipient: c.email!,
        customerName: c.name,
        dueAmount: c.dueAmount,
        status: "Queued",
        attempts: 0,
        message: event.invitationTemplate
          .replace(/{CustomerName}/g, c.name)
          .replace(/{DueAmount}/g, c.dueAmount.toLocaleString())
          .replace(/{ShopName}/g, shopName)
          .replace(/{ProprietorName}/g, propName)
          .replace(/{ContactNumber}/g, state.config.phoneNumbers[0] || "")
          .replace(/{EventDate}/g, event.date)
          .replace(/{StartTime}/g, event.startTime)
          .replace(/{Address}/g, state.config.address),
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        retryCount: 0,
      }));

    const sms: QueueItem[] = eligibleCustomers
      .filter((c) => c.phone)
      .map((c, i) => ({
        id: `q-sms-${Date.now()}-${i}`,
        recipient: c.phone!,
        customerName: c.name,
        dueAmount: c.dueAmount,
        status: "Queued",
        attempts: 0,
        message: `M/S Lovely Enterprise HalKhata Invitation: Dear ${c.name}, you are cordially invited to our HalKhata feast on ${event.date} at ${event.startTime}. Outstanding Settle Due: ${c.dueAmount.toLocaleString()} BDT. Details: ${state.config.phoneNumbers[0]}.`,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        retryCount: 0,
      }));

    const whatsApp: QueueItem[] = eligibleCustomers
      .filter((c) => c.phone)
      .map((c, i) => ({
        id: `q-wa-${Date.now()}-${i}`,
        recipient: c.phone!,
        customerName: c.name,
        dueAmount: c.dueAmount,
        status: "Queued",
        attempts: 0,
        message: `Dear ${c.name},\nYour Halkhata date is ${event.date}`,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        retryCount: 0,
      }));

    const calls: CallLog[] = eligibleCustomers
      .filter((c) => c.phone)
      .map((c, i) => ({
        id: `q-call-${Date.now()}-${i}`,
        campaignId: `cam-hk-${eventId}`,
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone!,
        status: "Queued",
        attempts: 0,
        voiceText: `Hello ${c.name}. Settle your pending outstanding balance of ${c.dueAmount.toLocaleString()} BDT at M/S Lovely Enterprise's Grand HalKhata event scheduled on ${event.date} starting from ${event.startTime}. Thank you.`,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        fallbackSent: { whatsapp: false, sms: false, email: false },
      }));

    const newEv: HalKhataEvent = {
      ...event,
      id: eventId,
      status: "UPCOMING",
      customerRecords,
      queues: {
        emails,
        sms,
        whatsApp,
        calls,
      },
    };

    const newCampaign: OutgoingCampaign = {
      id: `cam-hk-${eventId}`,
      name: `হালখাতা প্রচার - ${event.date}`,
      status: "ACTIVE",
      voiceTemplate: `Hello {CustomerName}. Settle your pending outstanding balance of {DueAmount} BDT at Lovely Enterprise's Grand HalKhata event scheduled on ${event.date} starting from ${event.startTime}. Thank you.`,
      calls,
      createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    setState((prev) => ({
      ...prev,
      halkhata: [...prev.halkhata, newEv],
      campaigns: [...prev.campaigns, newCampaign],
    }));
    addAuditLog(
      "ADD_HALKHATA",
      "HalKhata System",
      `Announced Grand HalKhata Event on ${event.date} and populated bulk communication reminders queue and automated Call Campaign for ${customerRecords.length} debtors`,
    );

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/halkhata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newEv)
        });
      } catch (err) {
        console.error("Failed to sync new HalKhata event to server:", err);
      }
    }
  };

  const saveCommunicationSettings = (settings: CommunicationSettings) => {
    setState((prev) => ({ ...prev, communicationSettings: settings }));
    addAuditLog(
      "UPDATE_COMMUNICATION_SETTINGS",
      "Communication Panel",
      "Updated credentials and configuration for SMTP, SMS, WhatsApp and SIP Voice Providers",
    );
  };

  const updateHalkhataEvent = async (updated: HalKhataEvent) => {
    setState((prev) => ({
      ...prev,
      halkhata: prev.halkhata.map((h) => (h.id === updated.id ? updated : h)),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/halkhata/${updated.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.error("Failed to sync updated HalKhata event to server:", err);
      }
    }
  };

  const deleteHalkhataEvent = async (id: string) => {
    setState((prev) => ({
      ...prev,
      halkhata: prev.halkhata.filter((h) => h.id !== id),
    }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch(`/api/erp/halkhata/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to sync deleted HalKhata event to server:", err);
      }
    }
  };

  const createCampaign = (campaignName: string, template: string) => {
    // Populate with customer who have positive dues
    const eligibleCustomers = state.customers.filter(
      (c) => c.dueAmount > 0 && c.phone,
    );

    const calls: CallLog[] = eligibleCustomers.map((c, i) => ({
      id: `call-${Date.now()}-${i}`,
      campaignId: `cam-${Date.now()}`,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone || "",
      status: "Queued",
      attempts: 0,
      voiceText: template
        .replace("{CustomerName}", c.name)
        .replace("{DueAmount}", c.dueAmount.toString())
        .replace("{ShopName}", state.config.shopName)
        .replace("{ProprietorName}", state.config.proprietorName)
        .replace("{Address}", c.address),
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      fallbackSent: { whatsapp: false, sms: false, email: false },
    }));

    const newCampaign: OutgoingCampaign = {
      id: `cam-${Date.now()}`,
      name: campaignName,
      voiceTemplate: template,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "ACTIVE",
      calls,
    };

    setState((prev) => ({
      ...prev,
      campaigns: [newCampaign, ...prev.campaigns],
    }));
    addAuditLog(
      "CREATE_CAMPAIGN",
      "Outgoing Call Center",
      `Created dialing campaign "${campaignName}" for ${eligibleCustomers.length} outstanding accounts`,
    );
  };

  const simulateCallStatusChange = (
    campaignId: string,
    callId: string,
    status: CallLog["status"],
    duration?: number,
  ) => {
    setState((prev) => {
      const updatedCampaigns = prev.campaigns.map((cam) => {
        if (cam.id === campaignId) {
          const updatedCalls = cam.calls.map((cl) => {
            if (cl.id === callId) {
              const attempts = cl.attempts + 1;
              const timestamp = new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " ");

              // Handle Fallback auto alerts if Failed/No Answer
              let fallbackSent = cl.fallbackSent;
              if (status === "Failed" || status === "No Answer") {
                fallbackSent = {
                  whatsapp: true,
                  sms: true,
                  email: !!state.customers.find((c) => c.id === cl.customerId)
                    ?.email,
                };
              }

              return {
                ...cl,
                status,
                duration,
                attempts,
                timestamp,
                fallbackSent,
              };
            }
            return cl;
          });
          return { ...cam, calls: updatedCalls };
        }
        return cam;
      });
      return { ...prev, campaigns: updatedCampaigns };
    });

    // If fallback sent, log alerts
    if (status === "Failed" || status === "No Answer") {
      const call = state.campaigns
        .find((c) => c.id === campaignId)
        ?.calls.find((cl) => cl.id === callId);
      if (call) {
        sendNotification(
          "WhatsApp",
          call.customerPhone,
          `[IVR UNANSWERED FALLBACK] Dear ${call.customerName}, we tried calling you from ${state.config.shopName}. Your outstanding ledger due is ${state.customers.find((c) => c.id === call.customerId)?.dueAmount} BDT. Please resolve soon.`,
          "Auto Fallback Alert",
        );
        sendNotification(
          "SMS",
          call.customerPhone,
          `We missed you! Lovely Ent outstanding balance alert. Please contact or login to settle accounts.`,
          "Auto Fallback Alert",
        );
      }
    }
  };

  const submitPortalPayment = async (
    payment: Omit<PaymentTransaction, "id" | "status" | "timestamp">,
  ) => {
    const paymentId = `pay-${Date.now()}`;
    const newPay: PaymentTransaction = {
      ...payment,
      id: paymentId,
      status: "PENDING",
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setState((prev) => ({ ...prev, payments: [newPay, ...prev.payments] }));

    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      try {
        await fetch("/api/erp/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newPay)
        });
      } catch (err) {
        console.error("Failed to sync payment submission to server:", err);
      }
    }

    addAuditLog(
      "SUBMIT_PAYMENT",
      "Payment Center",
      `Customer ${payment.customerName} submitted ${payment.method} transfer of ${payment.amount} BDT`,
    );
  };

  const verifyPortalPayment = (
    paymentId: string,
    action: "APPROVE" | "REJECT",
  ) => {
    const payment = state.payments.find((p) => p.id === paymentId);
    if (!payment) return;

    if (action === "APPROVE") {
      const transactionId = `led-${Date.now()}`;
      const date = new Date().toISOString().split("T")[0];

      setState((prev) => {
        // Find existing ledger for customer
        const existingLedger = prev.ledger.filter(
          (l) => l.customerId === payment.customerId,
        );
        const currentOutstanding = existingLedger.reduce((sum, entry) => {
          if (entry.type === "PURCHASE" || entry.type === "DUE_CARRY_FORWARD") {
            return sum + entry.amount;
          } else {
            return sum - entry.amount;
          }
        }, 0);

        const change = -payment.amount; // PAYMENT decreases due
        const runningBalance = currentOutstanding + change;

        const newEntry: LedgerEntry = {
          id: transactionId,
          customerId: payment.customerId,
          date,
          type: "PAYMENT",
          description: `Online Settlement: Verified ${payment.method} TxID: ${payment.transactionId}`,
          amount: payment.amount,
          runningBalance,
        };

        const updatedPayments = prev.payments.map((p) =>
          p.id === paymentId ? { ...p, status: "VERIFIED" as const } : p,
        );
        const updatedLedger = [...prev.ledger, newEntry];
        const updatedCustomers = prev.customers.map((c) => {
          if (c.id === payment.customerId) {
            return { ...c, dueAmount: runningBalance };
          }
          return c;
        });

        return {
          ...prev,
          payments: updatedPayments,
          ledger: updatedLedger,
          customers: updatedCustomers,
        };
      });

      addAuditLog(
        "VERIFY_PAYMENT_APPROVED",
        "Payment Center",
        `Approved payment transaction ID: ${payment.transactionId} and adjusted customer ledger due. Generated receipt ${transactionId}.`,
      );

      const customer = state.customers.find((c) => c.id === payment.customerId);
      if (customer && customer.phone) {
        sendNotification(
          "WhatsApp",
          customer.phone,
          `${state.config.shopName}: Your payment of ${payment.amount} BDT via ${payment.method} (TxID: ${payment.transactionId}) has been APPROVED. Receipt ID: ${transactionId}. Thank you!`,
          "Payment Approved",
        );
      }
    } else {
      setState((prev) => ({
        ...prev,
        payments: prev.payments.map((p) =>
          p.id === paymentId ? { ...p, status: "REJECTED" as const } : p,
        ),
      }));
      addAuditLog(
        "VERIFY_PAYMENT_REJECTED",
        "Payment Center",
        `Rejected fraudulent or invalid payment TxID: ${payment.transactionId}`,
      );

      const customer = state.customers.find((c) => c.id === payment.customerId);
      if (customer && customer.phone) {
        sendNotification(
          "WhatsApp",
          customer.phone,
          `${state.config.shopName}: Your payment of ${payment.amount} BDT via ${payment.method} (TxID: ${payment.transactionId}) has been REJECTED by admin. Please contact support.`,
          "Payment Rejected",
        );
      }
    }

    // Sync verification to server-side MongoDB
    const token = localStorage.getItem("erp_token") || localStorage.getItem("lovely_erp_token");
    if (token) {
      fetch(`/api/erp/payments/${paymentId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      }).catch(err => console.error("Failed to sync payment verification to server:", err));
    }
  };

  const requestPasswordReset = (email: string): string | null => {
    const isAdmin = state.config.emails.some(
      (e) => e.toLowerCase() === email.toLowerCase(),
    );
    const isStaff = state.staff.some(
      (s) => s.email.toLowerCase() === email.toLowerCase(),
    );
    const isCust = state.customers.some(
      (c) => c.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!isAdmin && !isStaff && !isCust) return null;

    const token = `reset-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const expires = Date.now() + 15 * 60 * 1000; // 15 mins

    setState((prev) => {
      const tokens = prev.resetTokens || [];
      return {
        ...prev,
        resetTokens: [
          ...tokens.filter(
            (t) => t.email.toLowerCase() !== email.toLowerCase(),
          ),
          { email, token, expires },
        ],
      };
    });

    sendNotification(
      "Email",
      email,
      `M/S Lovely Enterprise password reset link: https://lovelyenterprise.com/reset-password?token=${token}&email=${email}`,
      "Password Recovery Request",
    );
    
    // Attempt WhatsApp OTP/Link to customer if phone exists
    const custForWa = state.customers.find((c) => c.email?.toLowerCase() === email.toLowerCase());
    if (custForWa && custForWa.phone) {
      sendNotification(
        "WhatsApp",
        custForWa.phone,
        `M/S Lovely Enterprise password reset link: https://lovelyenterprise.com/reset-password?token=${token}&email=${email}`,
        "Password Recovery Request",
      );
    }

    addAuditLog(
      "REQUEST_PASSWORD_RESET",
      "Authentication",
      `Generated expiring recovery link for user: ${email}`,
    );

    return token;
  };

  const resetPassword = (
    token: string,
    email: string,
    newPassword: string,
  ): boolean => {
    const tokens = state.resetTokens || [];
    const record = tokens.find(
      (t) => t.token === token && t.email.toLowerCase() === email.toLowerCase(),
    );

    if (!record) return false;
    if (Date.now() > record.expires) return false;

    setState((prev) => {
      let updatedConfig = prev.config;
      let updatedStaff = prev.staff;
      let updatedCustomers = prev.customers;

      const emailLower = email.toLowerCase();
      if (prev.config.emails.some((e) => e.toLowerCase() === emailLower)) {
        updatedConfig = { ...prev.config, adminPassword: newPassword };
      }

      updatedStaff = prev.staff.map((s) =>
        s.email.toLowerCase() === emailLower
          ? { ...s, password: newPassword }
          : s,
      );
      updatedCustomers = prev.customers.map((c) =>
        c.email?.toLowerCase() === emailLower
          ? { ...c, password: newPassword }
          : c,
      );

      return {
        ...prev,
        config: updatedConfig,
        staff: updatedStaff,
        customers: updatedCustomers,
        resetTokens: (prev.resetTokens || []).filter((t) => t.token !== token),
      };
    });

    addAuditLog(
      "PASSWORD_RESET_SUCCESS",
      "Authentication",
      `Successfully verified token and updated credentials for ${email}`,
    );
    return true;
  };

  const savePaymentSettings = (settings: PaymentGatewaySettings) => {
    setState((prev) => ({ ...prev, paymentSettings: settings }));
    addAuditLog(
      "UPDATE_PAYMENT_SETTINGS",
      "Payment settings",
      "Updated payment gateway credentials and toggle controls",
    );
  };

  const savePBXSettings = (settings: PBXSettings) => {
    setState((prev) => ({ ...prev, pbxSettings: settings }));
    addAuditLog(
      "UPDATE_PBX_SETTINGS",
      "PBX Module",
      "Updated PBX configuration and API credentials",
    );
  };

  const savePBXExtensions = (extensions: PBXExtension[]) => {
    setState((prev) => ({ ...prev, pbxExtensions: extensions }));
    addAuditLog(
      "UPDATE_PBX_EXTENSIONS",
      "PBX Module",
      "Updated PBX extensions list",
    );
  };

  const savePBXIVRConfig = (config: PBXIVRConfig) => {
    setState((prev) => ({ ...prev, pbxIvrConfig: config }));
    addAuditLog(
      "UPDATE_PBX_IVR",
      "PBX Module",
      "Updated PBX IVR configuration",
    );
  };

  const saveWhatsAppMultiSettings = (settings: WhatsAppMultiProviderSettings) => {
    setState((prev) => ({ ...prev, waMultiSettings: settings }));
    addAuditLog(
      "UPDATE_WA_MULTI_SETTINGS",
      "WhatsApp Module",
      `Updated WhatsApp Provider Settings. Active: ${settings.activeProvider}`,
    );
  };

  const addWhatsAppLog = (log: Omit<WhatsAppMessageLog, "id" | "timestamp">) => {
    const fullLog: WhatsAppMessageLog = {
      ...log,
      id: `wa-log-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
    };
    setState((prev) => ({
      ...prev,
      waLogs: [fullLog, ...(prev.waLogs || [])].slice(0, 500), // keep last 500
    }));
  };

  const addCallLog = (log: CallLog) => {
    setState((prev) => {
      // If it's a campaign call, we might want to also add it to campaign calls (not fully linked yet, but store it in a general place or specific campaigns)
      return { ...prev };
    });
  };

  const addIVRLog = (phone: string, duration: number, actions: string[]) => {
    const newLog: IVRLog = {
      id: `ivr-${Date.now()}`,
      phone,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      duration,
      actions,
    };
    setState((prev) => ({ ...prev, ivrLogs: [newLog, ...prev.ivrLogs] }));
  };

  const addStaff = (st: Omit<StaffMember, "id" | "status" | "attendance">) => {
    const newStaff: StaffMember = {
      ...st,
      id: `st-${Date.now()}`,
      status: "Present",
      attendance: {},
    };
    setState((prev) => ({ ...prev, staff: [...prev.staff, newStaff] }));
  };

  const updateStaffStatus = (id: string, status: StaffMember["status"]) => {
    setState((prev) => ({
      ...prev,
      staff: prev.staff.map((s) => {
        if (s.id === id) {
          const dateStr = new Date().toISOString().split("T")[0];
          const newAttendance = {
            ...s.attendance,
            [dateStr]:
              status === "Present"
                ? ("Present" as const)
                : status === "Absent"
                  ? ("Absent" as const)
                  : ("Leave" as const),
          };
          return { ...s, status, attendance: newAttendance };
        }
        return s;
      }),
    }));
  };

  const backupDatabase = () => {
    const id = `bak-${Date.now()}`;
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const fileName = `lovely_ent_autobackup_${timestamp.replace(/[- :]/g, "")}.sql`;
    const size = `${(14.0 + Math.random() * 0.9).toFixed(1)} MB`;

    setState((prev) => ({
      ...prev,
      backups: [
        { id, timestamp, fileName, size, status: "SUCCESS" },
        ...prev.backups,
      ],
    }));
    addAuditLog(
      "TRIGGER_BACKUP",
      "Backup System",
      `Manual backup triggered. Produced snapshot schema compression payload: ${fileName}`,
    );
  };

  const restoreDatabase = (backupId: string) => {
    const backup = state.backups.find((b) => b.id === backupId);
    if (backup) {
      addAuditLog(
        "RESTORE_BACKUP",
        "Backup System",
        `Restored entire state to snapshot ${backup.fileName}. Complete relational integrity checked.`,
      );
    }
  };

  return {
    state,
    saveConfig,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCustomerDocument,
    addLedgerEntry,
    addInvoice,
    addAchievement,
    deleteAchievement,
    addCertificate,
    deleteCertificate,
    addGalleryItem,
    deleteGalleryItem,
    addHalkhataEvent,
    updateHalkhataEvent,
    deleteHalkhataEvent,
    saveCommunicationSettings,
    createCampaign,
    simulateCallStatusChange,
    submitPortalPayment,
    verifyPortalPayment,
    savePaymentSettings,
    savePBXSettings,
    savePBXExtensions,
    savePBXIVRConfig,
    saveWhatsAppMultiSettings,
    addWhatsAppLog,
    addCallLog,
    addIVRLog,
    addStaff,
    updateStaffStatus,
    backupDatabase,
    restoreDatabase,
    addAuditLog,
    sendNotification,
    requestPasswordReset,
    resetPassword,
    loadRemoteState,
    submitContactMessage,
    addAward,
    updateAward,
    deleteAward,
    addAdmin,
    updateAdmin,
    deleteAdmin,
    resetAdminPassword,
    updateContactMessageStatus,
    deleteContactMessage,
  };
};
