/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Award,
  Landmark,
  Image,
  ArrowRight,
  ShieldCheck,
  User,
  Sparkles,
  LogIn,
  Lock,
  Smartphone,
  RefreshCw,
  Key,
  Package,
  Menu,
  X,
  Trophy,
  Eye,
  Building2,
} from "lucide-react";
import { FullState } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface PublicWebsiteProps {
  state: FullState;
  onCustomerLoginSuccess: (customerId: string) => void;
  onAdminLoginSuccess: (email: string) => void;
  onStaffLoginSuccess: (staffId: string, email: string) => void;
  addAuditLog?: (action: string, module: string, details: string) => void;
  requestPasswordReset: (email: string) => string | null;
  resetPassword: (token: string, email: string, newPass: string) => boolean;
  sendNotification: (
    type: "SMS" | "Email" | "WhatsApp",
    recipient: string,
    message: string,
    event: string,
  ) => void;
  submitContactMessage?: (msg: any) => Promise<{ success: boolean; id?: string; error?: string }>;
}

export default function PublicWebsite({
  state,
  onCustomerLoginSuccess,
  onAdminLoginSuccess,
  onStaffLoginSuccess,
  addAuditLog,
  requestPasswordReset,
  resetPassword,
  sendNotification,
  submitContactMessage,
}: PublicWebsiteProps) {
  const { config, categories, products, gallery, achievements, certificates, awards = [] } =
    state;

  const [activeTab, setActiveTab] = useState<
    "home" | "products" | "achievements" | "gallery" | "contact" | "login"
  >("home");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [zoomedAward, setZoomedAward] = useState<any | null>(null);

  // Unified Login State
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  // Admin OTP Flow
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminOtpInput, setAdminOtpInput] = useState("");
  const [simulatedAdminOtp, setSimulatedAdminOtp] = useState("");
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const [loginError, setLoginError] = useState("");

  // Forgot Password Flow
  const [forgotFlow, setForgotFlow] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");

  // Force Password Change (for initial admin)
  const [showForceChangeModal, setShowForceChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forceChangeError, setForceChangeError] = useState("");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Smooth scroll and navigation update
  const handleNavClick = (id: string) => {
    setIsMobileMenuOpen(false);
    if (id === "login") {
      setActiveTab("login");
      return;
    }
    
    if (activeTab === "login") {
      setActiveTab(id as any);
      setTimeout(() => {
        const el = document.getElementById(`section_${id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    } else {
      const el = document.getElementById(`section_${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Bidirectional scroll highlight
  React.useEffect(() => {
    if (activeTab === "login") return;

    let isScrolling = false;
    const handleScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      requestAnimationFrame(() => {
        const sections = ["home", "products", "achievements", "gallery", "contact"];
        let currentSection = "home";
        let minDistance = Infinity;

        for (const section of sections) {
          const el = document.getElementById(`section_${section}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            // Compare which section is closest to top offset (e.g. 160px)
            const dist = Math.abs(rect.top - 160);
            if (dist < minDistance) {
              minDistance = dist;
              currentSection = section;
            }
          }
        }
        
        setActiveTab(currentSection as any);
        isScrolling = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab]);

  // Dynamic branding updates (Title, Favicon)
  React.useEffect(() => {
    if (config.siteTitle) {
      document.title = config.siteTitle;
    } else if (config.shopName) {
      document.title = config.shopName;
    }

    if (config.faviconUrl) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = config.faviconUrl;
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = config.faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [config.siteTitle, config.shopName, config.faviconUrl]);

  // Contact Form State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactMessage) {
      setContactError("Name and Message are required.");
      return;
    }
    setIsSubmittingContact(true);
    setContactError(null);
    setContactSuccess(null);
    try {
      if (submitContactMessage) {
        const res = await submitContactMessage({
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          subject: contactSubject,
          message: contactMessage,
        });
        if (res.success) {
          setContactSuccess("Your message has been submitted successfully! We will get back to you shortly.");
          setContactName("");
          setContactEmail("");
          setContactPhone("");
          setContactSubject("");
          setContactMessage("");
        } else {
          setContactError(res.error || "Failed to send message. Please try again.");
        }
      } else {
        setContactError("Contact messaging system is currently unavailable.");
      }
    } catch (err: any) {
      setContactError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const navItems = [
    { id: "home", label: "Home", show: true },
    { id: "products", label: "Products", show: config.showProducts !== false },
    { id: "achievements", label: "Certificates & Awards", show: config.showAchievements !== false },
    { id: "gallery", label: "Gallery", show: config.showGallery !== false },
    { id: "contact", label: "Contact", show: config.showContact !== false },
  ].filter(item => item.show);

  const filteredProducts = products.filter((p) => {
    const isActive = p.active !== false;
    const matchesSearch =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.companyName.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;
    return isActive && matchesSearch && matchesCategory;
  });

  const handleRequestLoginOtp = async () => {
    if (loginAttempts >= 5) {
      setLoginError("Too many login attempts. Please try again later.");
      return;
    }

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setLoginError("Please enter your phone number to receive OTP.");
      return;
    }

    // Check if user exists
    const isAdmin = config.phoneNumbers.some(
      (p) => p.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );
    const isStaff = state.staff.some(
      (s) => s.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );
    const isCustomer = state.customers.some(
      (c) => c.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );

    if (!isAdmin && !isStaff && !isCustomer && identifier !== "admin") {
      setLoginError("Phone number not found in the system.");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedAdminOtp(code);
    setAdminOtpSent(true);
    setOtpExpiry(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    setLoginError("");

    // Send WhatsApp OTP
    sendNotification(
      "WhatsApp",
      identifier,
      `${config.shopName}: Your Login Verification Code is ${code}. Do not share this with anyone. Code expires in 5 minutes.`,
      "Login OTP",
    );
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (loginAttempts >= 5) {
      setLoginError("Too many login attempts. Please try again later.");
      return;
    }

    const identifier = loginIdentifier.trim();
    const pass = passwordInput.trim();

    if (!identifier || !pass) {
      setLoginError("Please enter both email/phone and password.");
      return;
    }

    // 1. Check Super Admin
    const isAdminEmail = config.emails.some(
      (em) => em.toLowerCase() === identifier.toLowerCase(),
    );
    const isAdminPhone = config.phoneNumbers.some(
      (p) => p.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );

    // For local dev, also allow 'admin'
    if (identifier.toLowerCase() === "admin" || isAdminEmail || isAdminPhone) {
      const storedPass =
        localStorage.getItem("lovely_enterprise_admin_pass") ||
        config.adminPassword ||
        "admin123";

      if (pass === storedPass) {
        // Admin credentials correct, initiate OTP flow via Email
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setSimulatedAdminOtp(code);
        setAdminOtpSent(true);
        setOtpExpiry(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
        const adminEmail = config.emails[0] || "admin@lovelyenterprise.com";
        sendNotification(
          "Email",
          adminEmail,
          `Admin Login Verification Code: Your verification code is: ${code}. This code expires in 5 minutes. Security note: Never share this code with anyone.`,
          "Admin Login OTP",
        );
        return;
      } else {
        setLoginAttempts((prev) => prev + 1);
      }
    }

    // 2. Check Staff
    const staffMember = state.staff.find(
      (s) =>
        s.email?.toLowerCase() === identifier.toLowerCase() ||
        s.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );

    if (staffMember) {
      if (staffMember.password === pass) {
        onStaffLoginSuccess(
          staffMember.id,
          staffMember.email || staffMember.phone || staffMember.id,
        );
        return;
      } else {
        setLoginAttempts((prev) => prev + 1);
        setLoginError("Incorrect password for Staff account.");
        return;
      }
    }

    // 3. Check Customer
    const customer = state.customers.find(
      (c) =>
        c.email?.toLowerCase() === identifier.toLowerCase() ||
        c.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );

    if (customer) {
      if (customer.password === pass) {
        onCustomerLoginSuccess(customer.id);
        return;
      } else {
        setLoginAttempts((prev) => prev + 1);
        setLoginError("Incorrect password for Customer account.");
        return;
      }
    }

    setLoginAttempts((prev) => prev + 1);
    setLoginError(
      "No account found with these credentials. Please check your spelling.",
    );
  };

  const handleAdminOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (loginAttempts >= 5) {
      setLoginError("Too many login attempts. Please try again later.");
      return;
    }

    if (otpExpiry && Date.now() > otpExpiry) {
      setLoginError("OTP has expired. Please request a new one.");
      return;
    }

    if (adminOtpInput === simulatedAdminOtp) {
      // Determine role from identifier
      const identifier = loginIdentifier.trim();
      const isAdminEmail = config.emails.some(
        (em) => em.toLowerCase() === identifier.toLowerCase(),
      );
      const isAdminPhone = config.phoneNumbers.some(
        (p) => p.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
      );

      if (
        identifier.toLowerCase() === "admin" ||
        isAdminEmail ||
        isAdminPhone
      ) {
        const isChanged =
          localStorage.getItem("lovely_enterprise_admin_pass_changed") ===
          "true";
        if (!isChanged) {
          setShowForceChangeModal(true);
        } else {
          const adminEmail = config.emails[0] || "admin@lovelyenterprise.com";
          onAdminLoginSuccess(adminEmail);
        }
        return;
      }

      const staffMember = state.staff.find(
        (s) =>
          s.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
      );
      if (staffMember) {
        onStaffLoginSuccess(
          staffMember.id,
          staffMember.email || staffMember.phone || staffMember.id,
        );
        return;
      }

      const customer = state.customers.find(
        (c) =>
          c.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
      );
      if (customer) {
        onCustomerLoginSuccess(customer.id);
        return;
      }
    } else {
      setLoginAttempts((prev) => prev + 1);
      setLoginError("Incorrect OTP.");
    }
  };

  const handleForgotSubmit = (
    e: React.FormEvent,
    method: "email" | "whatsapp" = "email",
  ) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    // Check if user exists
    const identifier = recoveryEmail.trim();
    const isAdmin =
      config.emails.some(
        (em) => em.toLowerCase() === identifier.toLowerCase(),
      ) ||
      config.phoneNumbers.some(
        (p) => p.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
      );
    const isStaff = state.staff.some(
      (s) =>
        s.email?.toLowerCase() === identifier.toLowerCase() ||
        s.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );
    const isCustomer = state.customers.some(
      (c) =>
        c.email?.toLowerCase() === identifier.toLowerCase() ||
        c.phone?.replace(/[- ]/g, "") === identifier.replace(/[- ]/g, ""),
    );

    if (!isAdmin && !isStaff && !isCustomer) {
      setLoginError("Email or phone not found in the system.");
      return;
    }

    const token = requestPasswordReset(identifier);
    if (token) {
      setForgotSent(true);
      if (method === "whatsapp") {
        sendNotification(
          "WhatsApp",
          identifier,
          `${config.shopName}: Your password reset OTP is ${token}. Enter this code on the website.`,
          "Forgot Password OTP",
        );
        alert("Password reset OTP sent via WhatsApp.");
      } else {
        alert(
          `Password reset link sent to ${identifier}. Token: ${token} (simulate email receipt)`,
        );
      }
      setTimeout(() => {
        setForgotFlow(false);
        setForgotSent(false);
        setRecoveryEmail("");
      }, 5000);
    } else {
      setLoginError("Could not generate reset token.");
    }
  };

  return (
    <div
      id="public_root"
      className="min-h-screen bg-natural-bg flex flex-col font-sans text-natural-text"
    >
      {/* STICKY HEADER WRAPPER */}
      <div className="sticky top-0 z-50">
        {/* Top Banner Notice */}
        {config.bannerShow !== false && (
          <div
            id="top_notice"
            className="bg-brand-950 text-brand-200 h-[32px] md:h-[40px] px-4 text-[10px] md:text-xs text-center border-b border-brand-800 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-natural-accent animate-pulse shrink-0" />
            <span className="font-medium tracking-wide truncate">
              {config.bannerText || "Official Agricultural Distributor Terminal — Serving Bangladesh Crop Farmers with Supreme High-Yield Outputs"}
            </span>
          </div>
        )}

        {/* Main Enterprise Header */}
        <header
          id="main_header"
          className="bg-white/95 backdrop-blur-sm border-b border-natural-border shadow-sm h-[80px] md:h-[110px] flex items-center"
        >
          <div className="max-w-7xl mx-auto w-full px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-brand-800 flex items-center justify-center text-white shadow-lg shadow-brand-800/20 shrink-0">
                <Landmark className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg md:text-2xl font-extrabold text-natural-text tracking-tight leading-none truncate uppercase">
                  {config.shopName}
                </h1>
                <p className="text-[10px] md:text-sm text-natural-muted mt-1 font-medium italic truncate">
                  <span className="text-brand-800 font-semibold">
                    {config.secondaryLicenseName}
                  </span>
                </p>
              </div>
            </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-natural-light p-1 rounded-lg text-sm font-semibold text-natural-muted">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-4 py-1.5 rounded-md transition-all cursor-pointer ${activeTab === item.id ? "bg-brand-800 text-white shadow-xs" : "hover:bg-natural-sage/20"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                window.history.pushState({}, "", "/login");
                window.dispatchEvent(new Event("popstate"));
              }}
              className="hidden lg:flex items-center gap-2 bg-brand-900 hover:bg-brand-800 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              Portal Gateway
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-natural-text hover:bg-natural-light rounded-lg transition-colors cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>
    </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] bg-white z-[70] shadow-2xl lg:hidden flex flex-col"
            >
              <div className="p-4 border-b border-natural-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-brand-800" />
                  <span className="font-extrabold text-sm truncate max-w-[160px]">
                    {config.shopName}
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-natural-muted hover:text-natural-text transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === item.id ? "bg-brand-800 text-white shadow-md" : "text-natural-muted hover:bg-natural-light"}`}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="pt-4 border-t border-natural-border mt-4">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      window.history.pushState({}, "", "/login");
                      window.dispatchEvent(new Event("popstate"));
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer text-brand-900 bg-brand-50 hover:bg-brand-100"
                  >
                    <User className="w-4 h-4" /> Customer Login
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      window.history.pushState({}, "", "/login");
                      window.dispatchEvent(new Event("popstate"));
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 bg-brand-950 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" /> Portal Gateway
                  </button>
                </div>
              </div>
              <div className="p-4 border-t border-natural-border bg-natural-light/50">
                <p className="text-[10px] text-natural-muted text-center font-medium">
                  © 2026 {config.shopName} • Secure Terminal
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dynamic Tab Body */}
      <main className="flex-1">
        {activeTab === "login" ? (
          <div className="max-w-md mx-auto px-4 py-8 md:py-16 min-h-[60vh] flex items-center">
            <div className="bg-white rounded-2xl shadow-xl border border-natural-border overflow-hidden w-full">
              <div className="bg-gradient-to-r from-brand-900 to-brand-950 text-white px-6 py-8 text-center relative">
                <h3 className="font-black text-xl md:text-2xl tracking-tight">
                  Enterprise Gateway
                </h3>
                <p className="text-[10px] md:text-xs text-brand-200 mt-1.5 leading-relaxed font-sans">
                  Log in to access your ledger profile or administrative panel
                </p>
                <div className="absolute right-4 bottom-4 text-brand-800 opacity-25">
                  <LogIn className="w-12 h-12 md:w-16 md:h-16" />
                </div>
              </div>

              <div className="p-6 font-sans">
                {/* Forgot Flow */}
                {forgotFlow ? (
                  <form
                    onSubmit={(e) => handleForgotSubmit(e, "email")}
                    className="space-y-4"
                  >
                    <h4 className="font-extrabold text-natural-text text-base font-sans">
                      পাসওয়ার্ড পুনরুদ্ধার (Recover)
                    </h4>
                    <p className="text-xs text-natural-muted leading-relaxed font-sans">
                      আপনার ইমেইল অথবা মোবাইল নম্বর প্রদান করুন।
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                        ইমেইল বা ফোন নম্বর (Email or Phone)
                      </label>
                      <input
                        type="text"
                        placeholder="yourname@gmail.com or 8801..."
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text font-medium"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-2 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotFlow(false);
                          setLoginError("");
                        }}
                        className="w-1/3 border border-natural-border text-natural-muted font-bold py-2 rounded-lg text-xs hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        ফিরে যান
                      </button>
                      <button
                        type="submit"
                        className="w-1/3 bg-brand-800 hover:bg-brand-900 text-white font-bold py-2 rounded-lg text-[10px] cursor-pointer transition-all"
                      >
                        Send Email Link
                      </button>
                      <button
                        type="button"
                        onClick={(e) =>
                          handleForgotSubmit(e as any, "whatsapp")
                        }
                        className="w-1/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-[10px] cursor-pointer transition-all"
                      >
                        WhatsApp OTP
                      </button>
                    </div>
                  </form>
                ) : adminOtpSent ? (
                  <form onSubmit={handleAdminOtpSubmit} className="space-y-4">
                    <div className="bg-natural-sage/20 border border-natural-border text-brand-950 rounded-lg p-3 text-xs leading-relaxed font-semibold flex items-start gap-2">
                      <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-brand-800" />
                      <div>
                        <p className="font-extrabold text-brand-950 font-sans">
                          Verification Required
                        </p>
                        <p className="mt-1 font-sans text-natural-muted">
                          A secure 6-digit code has been sent to your registered admin email address. Please enter it below to proceed.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                        Enter 6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-natural-muted" />
                        <input
                          type="text"
                          placeholder="XXXXXX"
                          maxLength={6}
                          value={adminOtpInput}
                          onChange={(e) => setAdminOtpInput(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 font-mono font-extrabold text-base tracking-widest text-center bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/10 focus:border-brand-700 text-natural-text"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminOtpSent(false);
                          setLoginError("");
                        }}
                        className="w-1/3 border border-natural-border hover:bg-natural-light text-natural-muted font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Back
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 bg-brand-800 hover:bg-brand-900 text-white font-bold py-2.5 rounded-lg text-sm cursor-pointer"
                      >
                        Verify OTP & Log In
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-natural-text mb-1.5 font-sans">
                        Email or Phone Number
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-natural-muted" />
                        <input
                          type="text"
                          placeholder="yourname@gmail.com or +8801..."
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-natural-light border border-natural-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 focus:border-brand-700 text-natural-text"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-natural-text">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotFlow(true);
                            setLoginError("");
                          }}
                          className="text-xs text-brand-800 hover:underline font-semibold font-sans cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-natural-muted" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-natural-light border border-natural-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 focus:border-brand-700 text-natural-text"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-6">
                      <button
                        type="submit"
                        className="w-full bg-brand-800 hover:bg-brand-900 text-white font-bold py-2.5 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-sm font-sans"
                      >
                        Log In Securely
                      </button>
                    </div>
                  </form>
                )}

                {loginError && (
                  <p className="text-xs text-natural-red font-semibold bg-natural-red/10 p-2.5 rounded-lg border border-natural-red/20 mt-4 text-center font-sans">
                    ⚠️ {loginError}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="pb-16">
            {/* SECTION 1: HOME/HERO */}
            <div id="section_home" className="scroll-mt-[112px] md:scroll-mt-[150px]">
              {/* Hero Splash banner */}
              <div className="relative bg-brand-950 text-white py-12 md:py-24 px-4 overflow-hidden min-h-[400px] flex items-center">
                <div className="absolute inset-0 opacity-20">
                  <img
                    src={config.bannerUrl}
                    alt="banner"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-natural-accent font-bold uppercase tracking-widest text-[10px] md:text-xs bg-brand-900/80 px-3 py-1.5 rounded-full border border-brand-700 inline-block"
                  >
                    ESTABLISHED BRANDS & QUALITY AGRONOMY
                  </motion.span>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-[clamp(1.8rem,5vw,2.5rem)] md:text-5xl font-black mt-6 leading-[1.2] tracking-tight max-w-[15ch] md:max-w-none mx-auto line-clamp-4"
                  >
                    {config.heroTitle || "Empowering Bangladesh Farmers with Premium Agricultural Inputs"}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-brand-100 mt-6 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed font-sans"
                  >
                    {config.heroDesc || `Welcome to ${config.shopName}. We are registered seed, chemical, and fertilizer distributors providing verified inputs, flexible crop credit ledgers, and digital HalKhata management.`}
                  </motion.p>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-10 flex flex-col items-center justify-center gap-4 font-sans px-4"
                  >
                    <button
                      onClick={() => handleNavClick("products")}
                      className="w-full max-w-[320px] md:w-auto bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer text-sm md:text-base"
                    >
                      Browse Inputs <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-[320px] md:max-w-none justify-center">
                      <button
                        onClick={() => {
                          window.history.pushState({}, "", "/login");
                          window.dispatchEvent(new Event("popstate"));
                        }}
                        className="w-full md:w-auto bg-white/15 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl backdrop-blur-sm flex items-center justify-center gap-2 transition-all border border-white/20 cursor-pointer text-sm md:text-base"
                      >
                        Access Ledger Portal
                      </button>
                      
                      {/* Centered Portal Gateway Button */}
                      <button
                        onClick={() => {
                          window.history.pushState({}, "", "/login");
                          window.dispatchEvent(new Event("popstate"));
                        }}
                        className="w-full md:w-auto bg-natural-accent text-brand-950 hover:bg-white font-black px-8 py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm md:text-base"
                      >
                        <LogIn className="w-4 h-4" />
                        Portal Gateway
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="max-w-7xl mx-auto px-4 py-8 relative z-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-xs border border-natural-border flex items-center gap-4">
                    <div className="p-3 bg-natural-light rounded-lg text-brand-800">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-natural-text text-sm">
                        Govt Approved
                      </h3>
                      <p className="text-xs text-natural-muted">
                        100% Certified Seeds & Chemicals
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-xs border border-natural-border flex items-center gap-4">
                    <div className="p-3 bg-natural-light rounded-lg text-natural-warm">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-natural-text text-sm">
                        Best Dealer Award
                      </h3>
                      <p className="text-xs text-natural-muted">
                        Excellence in Gazipur District
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-xs border border-natural-border flex items-center gap-4">
                    <div className="p-3 bg-natural-light rounded-lg text-brand-850">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-natural-text text-sm">
                        Digital Ledger (ERP)
                      </h3>
                      <p className="text-xs text-natural-muted">
                        Instant SMS receipts & OTP login
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dual Corporate Entities Section */}
              <div className={`max-w-7xl mx-auto px-4 py-8 relative z-20 border-t border-slate-100 ${config.showEntities !== false ? "" : "hidden"}`}>
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <span className="text-[10px] md:text-xs text-brand-900 font-bold tracking-widest uppercase">
                    OUR CORPORATE ENTITIES
                  </span>
                  <h2 className="text-xl md:text-3xl font-black text-natural-text mt-1 leading-tight font-sans">
                    Dual Licensure & Authorizations
                  </h2>
                  <p className="text-xs md:text-sm text-natural-muted mt-2 font-sans">
                    We operate through two fully compliant agricultural enterprises to ensure premium service and seamless distribution of certified inputs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company 1: Lovely Enterprise */}
                  <div className="bg-white border border-slate-200 shadow-md hover:shadow-xl transition-all p-8 flex flex-col justify-between relative overflow-hidden rounded-none">
                    <div className="absolute top-0 left-0 w-2 h-full bg-brand-800" />
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-brand-50 text-brand-800 shrink-0">
                          <Landmark className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">
                            M/S Lovely Enterprise
                          </h3>
                          <p className="text-[10px] text-brand-800 font-bold uppercase tracking-wider">
                            Primary Distributor
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-xs text-slate-600 font-sans border-t border-slate-100 pt-4">
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="font-bold text-slate-400">PROPRIETOR:</span>
                          <span className="font-extrabold text-slate-800 uppercase">{config.lovelyProprietor || config.proprietorName}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="font-bold text-slate-400">LICENSE NO:</span>
                          <span className="font-mono font-bold text-slate-800">{config.lovelyLicenseNo || "Valid Wholesale Seed Permit"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="font-bold text-slate-400">OFFICIAL PHONE:</span>
                          <span className="font-mono font-bold text-slate-800">{config.lovelyPhone || config.phoneNumbers[0]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium italic flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      Verified agricultural logistics & wholesale operations.
                    </div>
                  </div>

                  {/* Company 2: Mahi & Muhi Traders */}
                  <div className="bg-white border border-slate-200 shadow-md hover:shadow-xl transition-all p-8 flex flex-col justify-between relative overflow-hidden rounded-none">
                    <div className="absolute top-0 left-0 w-2 h-full bg-natural-warm" />
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-amber-50 text-amber-700 shrink-0">
                          <Landmark className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">
                            M/S Mahi & Muhi Traders
                          </h3>
                          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                            Allied Agro Agency
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-xs text-slate-600 font-sans border-t border-slate-100 pt-4">
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="font-bold text-slate-400">PROPRIETOR:</span>
                          <span className="font-extrabold text-slate-800 uppercase">{config.mahiProprietor || "Mahi & Muhi proprietor"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="font-bold text-slate-400">LICENSE NO:</span>
                          <span className="font-mono font-bold text-slate-800">{config.mahiLicenseNo || "Govt Retailer & Storage Lic."}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="font-bold text-slate-400">OFFICIAL PHONE:</span>
                          <span className="font-mono font-bold text-slate-800">{config.mahiPhone || "017XXXXXXXX"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium italic flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                      Primary pesticide, fertilizer & organic input dealer.
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic About Us / Leadership Section */}
              <div className={`max-w-7xl mx-auto px-4 mt-12 md:mt-16 font-sans border-t border-slate-100 pt-16 ${config.showAbout !== false ? "" : "hidden"}`}>
                <div className="bg-white rounded-2xl border border-natural-border p-6 md:p-10 shadow-sm flex flex-col md:flex-row items-center gap-8">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shrink-0 border-4 border-brand-100 shadow-inner bg-slate-100">
                    <img 
                      src={config.aboutOwnerImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"} 
                      alt={config.aboutOwnerName || "Md. Moshiur Rahman Mohi"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <span className="text-[10px] md:text-xs text-brand-900 font-bold tracking-widest uppercase">
                      WHO WE ARE
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-natural-text mt-1">
                      {config.aboutTitle || "About Our Leadership"}
                    </h2>
                    <p className="text-sm text-natural-muted mt-3 leading-relaxed">
                      {config.aboutDesc || "Established with a goal of reinforcing Bangladesh's agricultural backbone, we supply certified high-yield hybrid rice, maize, and vegetable seeds, alongside high-grade eco-friendly organic pesticides and fertilizers. Under leadership of proprietor Md. Moshiur Rahman Mohi, we have expanded to Gazipur and Jamalpur as regional logistics partners."}
                    </p>
                    <div className="mt-4 flex items-center justify-center md:justify-start gap-2 text-xs font-semibold text-brand-800">
                      <span>Proprietor & Director:</span>
                      <span className="font-bold text-natural-text uppercase bg-natural-sage/20 px-2 py-0.5 rounded-md">
                        {config.aboutOwnerName || "Md. Moshiur Rahman Mohi"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Categories Preview */}
              <div className="max-w-7xl mx-auto px-4 mt-12 md:mt-16 font-sans border-t border-slate-100 pt-16">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 border-b border-natural-border pb-4 gap-4">
                  <div>
                    <span className="text-[10px] md:text-xs text-brand-900 font-bold tracking-widest uppercase">
                      CATALOG PREVIEW
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-natural-text mt-1">
                      Our Product Categories
                    </h2>
                  </div>
                  <button
                    onClick={() => handleNavClick("products")}
                    className="text-xs md:text-sm font-semibold text-brand-800 hover:text-brand-900 flex items-center gap-1.5 w-fit cursor-pointer"
                  >
                    View full catalog <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {categories.map((cat, idx) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        handleNavClick("products");
                      }}
                      className="group bg-white rounded-xl shadow-xs hover:shadow-md border border-natural-border overflow-hidden cursor-pointer transition-all"
                    >
                      <div className="h-44 overflow-hidden relative bg-natural-light">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-natural-text group-hover:text-brand-800 transition-colors text-base">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-natural-muted mt-1.5 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call to action banners */}
              <div className="max-w-7xl mx-auto px-4 mt-12 md:mt-16 font-sans">
                <div className="bg-gradient-to-r from-brand-900 to-brand-700 rounded-2xl p-6 md:p-12 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 border border-brand-800">
                  <div className="relative z-10 max-w-xl text-center md:text-left">
                    <span className="text-natural-accent text-[10px] md:text-xs font-extrabold uppercase tracking-widest">
                      ANNUAL HARVEST HALKHATA
                    </span>
                    <h2 className="text-xl md:text-3xl font-extrabold mt-2 leading-tight">
                      Check your ledger and attend the next HalKhata festival!
                    </h2>
                    <p className="text-brand-100/95 mt-3 text-xs md:text-sm leading-relaxed">
                      Log in with your phone or email to view your real-time
                      outstanding balance, download formal PDFs, see custom
                      notifications, and confirm your seat at our traditional
                      annual event.
                    </p>
                  </div>
                  <div className="relative z-10 shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => {
                        window.history.pushState({}, "", "/login");
                        window.dispatchEvent(new Event("popstate"));
                      }}
                      className="w-full md:w-auto bg-natural-warm hover:bg-natural-accent text-brand-950 font-bold px-8 py-3.5 rounded-lg shadow-md transition-all cursor-pointer text-center"
                    >
                      Log In to My Account
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: PRODUCTS CATALOG */}
            <div id="section_products" className={`scroll-mt-[112px] md:scroll-mt-[150px] py-16 bg-slate-50 border-t border-slate-200 ${config.showProducts !== false ? "" : "hidden"}`}>
              <div className="max-w-7xl mx-auto px-4 font-sans">
                  <div className="text-center max-w-2xl mx-auto">
                    <span className="text-brand-800 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                      PRODUCT DEPOT
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-natural-text mt-1">
                      Certified Agronomy Inputs
                    </h2>
                    <p className="text-natural-muted mt-2 text-xs md:text-sm leading-relaxed">
                      Search our full stock of fertilizers, hybrid rice/crop seeds,
                      certified insecticides, and organic boosters from BADC, Lal
                      Teer, Syngenta, and others.
                    </p>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="bg-white p-3 md:p-4 rounded-xl shadow-xs border border-natural-border mt-6 md:mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 md:py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-natural-text font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
                    <button
                      onClick={() => setSelectedCategory("All")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${selectedCategory === "All" ? "bg-brand-800 text-white" : "bg-natural-light text-natural-muted hover:bg-natural-sage/20 border border-natural-border"}`}
                    >
                      All Categories
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.name)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${selectedCategory === c.name ? "bg-brand-800 text-white" : "bg-natural-light text-natural-muted hover:bg-natural-sage/20 border border-natural-border"}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white rounded-xl shadow-xs border border-natural-border p-5 flex flex-col justify-between hover:shadow-md transition-all"
                      >
                        <div>
                          {/* Product Image */}
                          <div className="w-full h-40 bg-slate-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center border border-slate-100 relative">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <Package className="w-10 h-10 stroke-1" />
                                <span className="text-[10px] mt-1">No Image</span>
                              </div>
                            )}
                            {/* Status Overlay */}
                            <div className="absolute top-2 right-2">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${prod.stock > 0 ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
                              >
                                {prod.stock > 0 ? "স্টকে আছে" : "স্টক শেষ"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-brand-900 bg-natural-sage/35 border border-natural-border px-2 py-1 rounded-md uppercase tracking-wider">
                              {prod.category}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-1 rounded-md ${prod.stock > prod.minStockAlert ? "text-natural-muted bg-natural-light" : "text-natural-red bg-natural-red/10"}`}
                            >
                              {prod.stock > 0
                                ? `In Stock: ${prod.stock} ${prod.unit}`
                                : "Out Of Stock"}
                            </span>
                          </div>
                          <h3 className="font-bold text-natural-text text-base mt-3 group-hover:text-brand-800 transition-colors leading-snug">
                            {prod.name}
                          </h3>
                          {prod.description && (
                            <p className="text-xs text-natural-muted mt-2 line-clamp-2">
                              {prod.description}
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-natural-muted font-medium">
                              Brand:{" "}
                              <span className="text-natural-text font-semibold">
                                {prod.brand}
                              </span>
                            </p>
                            <p className="text-xs text-natural-muted font-medium">
                              Company:{" "}
                              <span className="text-natural-text font-semibold">
                                {prod.companyName}
                              </span>
                            </p>
                            <p className="text-xs text-natural-muted font-mono mt-1">
                              SKU: {prod.sku}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-natural-border flex items-baseline justify-between">
                          <span className="text-xs text-natural-muted font-medium font-sans">
                            Retail Price
                          </span>
                          <span className="text-lg font-black text-natural-text font-sans">
                            {prod.price} BDT
                            <span className="text-xs font-medium text-natural-muted">
                              /{prod.unit}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-16 text-center">
                      <Landmark className="w-12 h-12 text-natural-muted mx-auto" />
                      <p className="text-sm text-natural-muted font-medium mt-3">
                        No products match your search or filter.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: ACHIEVEMENTS & CERTIFICATES */}
            <div id="section_achievements" className={`scroll-mt-[112px] md:scroll-mt-[150px] py-16 bg-white border-t border-slate-200 ${config.showAchievements !== false ? "" : "hidden"}`}>
              <div className="max-w-7xl mx-auto px-4">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-brand-800 font-bold text-[10px] md:text-xs uppercase tracking-widest font-sans">
                      AUTHORIZATIONS & COMPLIANCE
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-natural-text mt-1">
                      Licensing, Certifications & Achievements
                    </h2>
                    <p className="text-natural-muted mt-2 text-xs md:text-sm leading-relaxed font-sans">
                      Lovely Group maintains pristine standards, verified
                      agricultural licenses, and holds prestigious dealership statuses
                      from public and private sectors.
                    </p>
                  </div>

                {/* Dealer Certificates Row */}
                <div id="dealer_certificates_section" className="mb-16">
                  <h3 className="text-lg md:text-xl font-bold text-natural-text border-b border-natural-border pb-3 flex items-center gap-2 font-sans mb-6">
                    <Award className="w-5 h-5 md:w-5.5 md:h-5.5 text-natural-warm" />
                    Active Distribution Licenses
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="bg-white rounded-xl shadow-xs hover:shadow-md border border-natural-border p-6 flex flex-col md:flex-row gap-6 transition-all"
                      >
                        <div className="w-full md:w-36 h-48 bg-natural-light rounded-lg overflow-hidden shrink-0 border border-natural-border">
                          <img
                            src={cert.imageUrl}
                            alt={cert.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-brand-900 bg-natural-sage/35 px-2 py-0.5 rounded-md uppercase tracking-wider font-sans border border-natural-border">
                              GOVERNMENT VERIFIED
                            </span>
                            <h4 className="font-extrabold text-natural-text text-lg mt-2 leading-snug">
                              {cert.title}
                            </h4>
                            <p className="text-xs text-natural-muted mt-1.5 font-medium font-sans">
                              Issuer:{" "}
                              <strong className="text-natural-text">
                                {cert.issuer}
                              </strong>
                            </p>
                            <p className="text-xs text-natural-muted mt-1 font-mono">
                              Issued On: {cert.issueDate}
                            </p>
                          </div>
                          <div className="mt-4 text-[11px] text-natural-muted bg-natural-light p-2.5 rounded-lg border border-natural-border font-medium font-sans">
                            ✓ Registered under Agricultural Act holding valid
                            wholesale storage permits.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Awards Redesign Section */}
                {awards.length > 0 && (
                  <div className="border-t border-slate-100 pt-16">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                      <span className="text-brand-800 font-bold text-[10px] md:text-xs uppercase tracking-widest font-sans">
                        HONORARY DECORATIONS
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black text-natural-text mt-1 font-sans">
                        Top Professional Achievements
                      </h2>
                      <p className="text-natural-muted mt-2 text-xs md:text-sm font-sans">
                        Official certificates, best seller accolades, and excellence trophies earned across several fiscal years.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center mt-12">
                      {awards.map((award) => (
                        <div
                          key={award.id}
                          className="relative overflow-hidden group rounded-none border border-slate-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl h-[480px] w-full max-w-[360px]"
                        >
                          {/* Image (65-70% height) */}
                          <div className="h-[320px] w-full bg-slate-50 flex items-center justify-center p-6 relative">
                            <img
                              src={award.image || 'https://via.placeholder.com/300?text=No+Image'}
                              alt={award.title}
                              className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            {/* Year Badge */}
                            <span className="absolute top-4 right-4 bg-brand-800 text-white text-[11px] font-black tracking-wider px-3 py-1 rounded-none shadow-sm uppercase">
                              {award.year}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="p-5 flex flex-col justify-between h-[160px] bg-white border-t border-slate-100">
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-base tracking-tight mb-1 line-clamp-2 uppercase min-h-[44px]">
                                {award.title}
                              </h4>
                              <p className="text-brand-800 font-bold text-xs tracking-wider uppercase truncate">
                                {award.company}
                              </p>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold tracking-widest flex items-center gap-1.5 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse"></span>
                              Hover to view description
                            </div>
                          </div>

                          {/* Hover Overlay with Glassmorphism / Elegant Dark */}
                          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col p-8 text-white justify-center rounded-none">
                            <span className="text-brand-400 font-extrabold text-[10px] tracking-widest uppercase mb-1.5 font-mono">
                              {award.year} • {award.company}
                            </span>
                            <h4 className="font-black text-xl mb-4 leading-tight tracking-tight text-white uppercase">
                              {award.title}
                            </h4>
                            <div className="w-12 h-0.5 bg-brand-500 mb-4" />
                            <p className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-8">
                              {award.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: GALLERY */}
            <div id="section_gallery" className={`scroll-mt-[112px] md:scroll-mt-[150px] py-16 bg-slate-50 border-t border-slate-200 ${config.showGallery !== false ? "" : "hidden"}`}>
              <div className="max-w-7xl mx-auto px-4">
                  <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
                    <span className="text-brand-800 font-bold text-[10px] md:text-xs uppercase tracking-widest font-sans">
                      VISUAL ARCHIVE
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-natural-text mt-1">
                      Field Operations & Events
                    </h2>
                    <p className="text-natural-muted mt-2 text-xs md:text-sm leading-relaxed font-sans">
                      Snapshots of our high-yield test plots, annual HalKhata
                      gatherings, and our physical inventory facilities in the heart
                      of the agricultural hub.
                    </p>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {gallery.map((g) => (
                    <div
                      key={g.id}
                      className="group bg-white rounded-2xl border border-natural-border overflow-hidden shadow-xs hover:shadow-md transition-all"
                    >
                      <div className="aspect-video relative overflow-hidden bg-brand-50">
                        <img
                          src={g.imageUrl}
                          alt={g.title}
                          className="w-full h-full object-cover hover:scale-105 transition-all duration-500"
                        />
                        <span className="absolute top-3 left-3 bg-brand-950/70 text-white backdrop-blur-xs text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest font-sans">
                          {g.category}
                        </span>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-natural-text text-sm font-sans">
                          {g.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 5: CONTACT & FORM */}
            <div id="section_contact" className={`scroll-mt-[112px] md:scroll-mt-[150px] py-16 bg-white border-t border-slate-200 ${config.showContact !== false ? "" : "hidden"}`}>
              <div className="max-w-7xl mx-auto px-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 font-sans">
                    <div className="space-y-6">
                      <div>
                        <span className="text-brand-800 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                          CONTACT DEPOT
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-natural-text mt-1 font-sans">
                        Get in touch with us
                      </h2>
                      <p className="text-natural-muted mt-3 text-xs md:text-sm leading-relaxed font-sans">
                        Have questions about seed quality, dealership accounts, bulk
                        fertilizer pricing, or your outstanding credit invoices? Feel
                        free to contact the proprietor or the accounts department.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-natural-light rounded-lg text-brand-800 shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-natural-text text-sm">
                            Enterprise Address
                          </h4>
                          <p className="text-xs text-natural-muted mt-1 leading-relaxed">
                            {config.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-natural-light rounded-lg text-brand-800 shrink-0">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-natural-text text-sm">
                            Official Hotline Phone
                          </h4>
                          <div className="mt-1 space-y-0.5">
                            {config.phoneNumbers.map((ph, idx) => (
                              <p
                                key={idx}
                                className="text-xs text-natural-muted font-mono font-medium"
                              >
                                {ph}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-natural-light rounded-lg text-brand-800 shrink-0">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-natural-text text-sm">
                            Official Email Channels
                          </h4>
                          <div className="mt-1 space-y-0.5">
                            {config.emails.map((em, idx) => (
                              <p
                                key={idx}
                                className="text-xs text-natural-muted font-mono"
                              >
                                {em}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Google Maps Container */}
                    <div className="bg-white rounded-2xl p-2 shadow-sm border border-natural-border h-[260px] overflow-hidden">
                      <iframe
                        src={config.googleMapsUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0, borderRadius: "12px" }}
                        allowFullScreen={false}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Lovely Enterprise Location Map"
                      ></iframe>
                    </div>
                  </div>

                  {/* Interactive Contact Form */}
                  <div className="bg-white rounded-2xl p-6 md:p-8 border border-natural-border shadow-xs">
                    <h3 className="font-extrabold text-natural-text text-lg md:text-xl font-sans mb-1">
                      Send Us a Message
                    </h3>
                    <p className="text-xs text-natural-muted leading-relaxed font-sans mb-6">
                      Fill out the form below and our customer support team will reply to you directly.
                    </p>

                    {contactSuccess && (
                      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs md:text-sm font-medium leading-relaxed">
                        {contactSuccess}
                      </div>
                    )}

                    {contactError && (
                      <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs md:text-sm font-medium leading-relaxed">
                        {contactError}
                      </div>
                    )}

                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-natural-text mb-1 uppercase tracking-wide">
                            Your Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. John Doe"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-natural-text mb-1 uppercase tracking-wide">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            placeholder="017XXXXXXXX"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-natural-text mb-1 uppercase tracking-wide">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-natural-text mb-1 uppercase tracking-wide">
                          Subject
                        </label>
                        <input
                          type="text"
                          placeholder="Inquiry about agricultural dealership"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-natural-text mb-1 uppercase tracking-wide">
                          Your Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Type your inquiry here in detail..."
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-natural-light border border-natural-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text font-medium resize-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingContact}
                        className="w-full bg-brand-800 hover:bg-brand-900 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                      >
                        {isSubmittingContact ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Submitting...
                          </>
                        ) : (
                          "Submit Message"
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer
        id="main_footer"
        className="bg-brand-950 text-brand-100 py-8 md:py-12 px-4 mt-auto border-t border-brand-800 text-[10px] md:text-xs"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-white font-extrabold text-sm mb-3">
              Enterprise Identity
            </h4>
            <p className="leading-relaxed">
              <strong className="text-white">{config.shopName}</strong> is a
              premium distributor of agricultural inputs, offering robust credit
              ledger tools, modern IVR dialers, and transparent ledger auditing.
            </p>
            <p className="mt-2 text-[10px] text-brand-300 font-mono italic">
              Secondary Trade Name: {config.secondaryLicenseName}
            </p>
          </div>
          <div>
            <h4 className="text-white font-extrabold text-sm mb-3">
              Contact Desk
            </h4>
            <div className="space-y-1.5">
              <p className="leading-relaxed">{config.address}</p>
              <p className="font-mono text-brand-300">
                Ph: {config.phoneNumbers[0]}
              </p>
              <p className="font-mono text-brand-300">
                Em: {config.emails[0]}
              </p>
            </div>
          </div>
          <div className="sm:col-span-2 md:col-span-1">
            <h4 className="text-white font-extrabold text-sm mb-3">
              Developer & DevOps Details
            </h4>
            <p className="leading-relaxed">
              This agricultural ERP runs on virtual containers mapped securely
              under port 3000. You can download or view standard Laravel +
              PostgreSQL migration layers inside the administrative vault tab.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-brand-800 mt-8 pt-6 text-center text-brand-400">
          © {new Date().getFullYear()} {config.shopName}. All Rights Reserved
          under Bangladesh Agro Regulations.
        </div>
      </footer>

      {/* Award Zoom Lightbox Modal */}
      {zoomedAward && (
        <div className="fixed inset-0 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-natural-border relative">
            <div className="relative h-72 md:h-96 bg-natural-light flex items-center justify-center border-b border-natural-border">
              {zoomedAward.image ? (
                <img
                  src={zoomedAward.image}
                  alt={zoomedAward.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-natural-muted flex flex-col items-center gap-3 py-12">
                  <Trophy className="w-16 h-16 text-natural-muted/30" />
                  <span className="font-semibold text-sm">No Image Attached</span>
                </div>
              )}
              {/* Close button inside image area */}
              <button
                onClick={() => setZoomedAward(null)}
                className="absolute top-4 right-4 p-2 bg-brand-950/70 hover:bg-brand-950 text-white rounded-full transition-colors shadow"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-4">
              <div>
                <span className="inline-block bg-brand-900 text-white text-[10px] font-extrabold px-2.5 py-1 rounded shadow-sm uppercase tracking-wider font-mono mb-2">
                  Year {zoomedAward.year}
                </span>
                <h3 className="text-xl font-black text-natural-text font-sans">
                  {zoomedAward.title}
                </h3>
                <p className="text-xs text-natural-muted mt-1 font-semibold">
                  Conferred by: <span className="text-brand-900 font-bold">{zoomedAward.company}</span>
                </p>
              </div>

              <p className="text-sm text-natural-muted leading-relaxed font-sans border-t border-natural-border pt-4">
                {zoomedAward.description}
              </p>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setZoomedAward(null)}
                  className="px-5 py-2.5 bg-brand-950 hover:bg-brand-900 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all font-sans"
                >
                  Close Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Force Password Change Modal */}
      {showForceChangeModal && (
        <div className="fixed inset-0 bg-brand-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-brand-100/50 relative">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-brand-800 animate-bounce" />
              </div>
              <h3 className="text-lg font-extrabold text-brand-950 font-sans">
                প্রথম লগইন: পাসওয়ার্ড পরিবর্তন করুন
              </h3>
              <p className="text-xs text-natural-muted mt-2 leading-relaxed font-sans">
                নিরাপত্তার স্বার্থে আপনার পূর্বনির্ধারিত 'admin123' পাসওয়ার্ডটি
                পরিবর্তন করা বাধ্যতামূলক। অনুগ্রহ করে একটি নতুন জটিল পাসওয়ার্ড
                সেট করুন।
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newPassword.length < 6) {
                  setForceChangeError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
                  return;
                }
                if (newPassword === "admin123") {
                  setForceChangeError(
                    "ডিফল্ট পাসওয়ার্ড ব্যবহার করা যাবে না। নতুন পাসওয়ার্ড দিন।",
                  );
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setForceChangeError("দুইটি পাসওয়ার্ড মেলেনি।");
                  return;
                }
                // Save
                localStorage.setItem(
                  "lovely_enterprise_admin_pass",
                  newPassword,
                );
                localStorage.setItem(
                  "lovely_enterprise_admin_pass_changed",
                  "true",
                );
                addAuditLog?.(
                  "PASSWORD_CHANGED",
                  "Admin Auth",
                  "Administrator forced password change on first login completed successfully",
                );
                setShowForceChangeModal(false);
                const adminEmail =
                  config.emails[0] || "admin@lovelyenterprise.com";
                onAdminLoginSuccess(adminEmail);
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-natural-text mb-1 font-sans">
                  নতুন পাসওয়ার্ড (New Password)
                </label>
                <input
                  type="password"
                  placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-natural-light border border-natural-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-text mb-1 font-sans">
                  পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
                </label>
                <input
                  type="password"
                  placeholder="আবারও পাসওয়ার্ডটি লিখুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-natural-light border border-natural-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/10 text-natural-text"
                  required
                />
              </div>

              {forceChangeError && (
                <p className="text-xs text-natural-red font-semibold bg-natural-red/10 p-2 rounded-lg border border-natural-red/20 text-center font-sans">
                  ⚠️ {forceChangeError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-brand-900 hover:bg-brand-800 text-white font-extrabold py-2.5 rounded-lg shadow-md cursor-pointer transition-all text-sm font-sans"
              >
                পাসওয়ার্ড পরিবর্তন ও লগইন করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a
        href={config.socialLinks?.whatsapp || `https://wa.me/${config.phoneNumbers?.[0]?.replace(/\D/g, '') || '8801712345678'}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        title="Chat with M/S Lovely Enterprise on WhatsApp"
      >
        <svg
          className="w-7 h-7 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.263 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.437.002 9.861-4.417 9.864-9.854.002-2.63-1.023-5.101-2.883-6.963C16.388 1.926 13.91 1.9 11.97 1.9c-5.44 0-9.865 4.418-9.867 9.856 0 1.56.417 3.085 1.207 4.418l-1.018 3.717 3.823-.997zM16.94 14.97c-.267-.134-1.583-.78-1.827-.869-.244-.09-.422-.134-.599.134-.178.268-.689.869-.844 1.047-.156.178-.311.201-.578.067-.268-.134-1.13-.417-2.153-1.331-.795-.71-1.332-1.587-1.488-1.854-.156-.268-.017-.413.117-.547.121-.12.268-.312.4-.469.134-.156.178-.268.267-.446.09-.178.044-.335-.022-.469-.067-.134-.599-1.443-.822-1.986-.217-.522-.455-.452-.623-.46-.16-.008-.344-.01-.527-.01-.184 0-.484.068-.737.34-.253.273-.965.945-.965 2.304 0 1.359.987 2.67 1.125 2.855.138.184 1.942 2.967 4.706 4.159.658.284 1.171.453 1.57.58.66.21 1.26.18 1.734.11.53-.08 1.583-.647 1.805-1.242.22-.595.22-1.105.155-1.213-.065-.108-.243-.178-.51-.311z"/>
        </svg>
      </a>
    </div>
  );
}
