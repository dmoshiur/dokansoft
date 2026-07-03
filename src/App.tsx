/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useERPStore } from "./store";
import PublicWebsite from "./components/PublicWebsite";
import CustomerPortal from "./components/CustomerPortal";
import AdminERP from "./components/AdminERP";
import { ResetPassword } from "./components/Admin/ResetPassword";
import { Login } from "./components/Admin/Login";
import { Error404 } from "./components/Error404";
import { Error500 } from "./components/Error500";
import { Account } from "./components/Account";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";

export default function App() {
  const store = useERPStore();

  const isResetPasswordPath = window.location.pathname.includes('/admin/reset-password') || window.location.href.includes('reset-password');

  useEffect(() => {
    // Sync WhatsApp Provider config to backend on startup
    if (store.state.waMultiSettings) {
      const token = localStorage.getItem('erp_token') || localStorage.getItem('lovely_erp_token') || '';
      fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(store.state.waMultiSettings)
      }).catch(console.error);
    }
  }, [store.state.waMultiSettings]);

  // App routing role state: 'public' | 'user' | 'admin' | 'staff'
  const [sessionRole, setSessionRole] = useState<"public" | "user" | "admin" | "staff">('public');
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const userJson = localStorage.getItem('erp_user');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        setSessionRole(u.role || 'public');
        if (u.role === 'user') {
          setActiveCustomerId(u.customerId || null);
        }
        setCurrentUserEmail(u.email || null);
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
    setIsInitializing(false);
  }, []);

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  // Guard routing checks
  useEffect(() => {
    if (isResetPasswordPath || isInitializing) return;

    const publicPaths = ['/', '/login', '/404', '/500'];

    if (currentPath === '/') {
      // Allow all users to access the home page
    } else if (currentPath === '/login') {
      if (sessionRole === 'admin') {
        navigateTo('/admin');
      } else if (sessionRole === 'user') {
        navigateTo('/dashboard');
      }
    } else if (currentPath === '/admin') {
      if (sessionRole !== 'admin') {
        navigateTo('/login');
      }
    } else if (currentPath === '/dashboard' || currentPath === '/customer/dashboard') {
      if (sessionRole !== 'user') {
        navigateTo('/login');
      }
    } else if (currentPath === '/account') {
      if (sessionRole !== 'user' && sessionRole !== 'admin') {
        navigateTo('/login');
      }
    } else if (!publicPaths.includes(currentPath)) {
      // Direct unknown paths to 404
      navigateTo('/404');
    }
  }, [currentPath, sessionRole, isResetPasswordPath]);

  const handleLogin = (token: string, user: any) => {
    localStorage.setItem('erp_token', token);
    localStorage.setItem('erp_user', JSON.stringify(user));
    
    setSessionRole(user.role);
    setCurrentUserEmail(user.email);
    if (user.role === 'user') {
      setActiveCustomerId(user.customerId);
    } else {
      setActiveCustomerId(null);
    }

    store.addAuditLog(
      "LOGIN_SUCCESS",
      "Auth Gateway",
      `Secure authentication established: ${user.email} (${user.role})`,
    );

    if (user.role === 'admin') {
      navigateTo('/admin');
    } else {
      navigateTo('/dashboard');
    }
  };

  const handleLogout = () => {
    store.addAuditLog(
      "LOGOUT",
      "Auth Gateway",
      `Session ended: ${currentUserEmail || "User"}`
    );

    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    
    setSessionRole("public");
    setActiveCustomerId(null);
    setCurrentUserEmail(null);
    navigateTo("/login");
  };

  if (isResetPasswordPath) {
    return <ResetPassword />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 selection:bg-emerald-700 selection:text-white">
        
        {/* '/' Route: Public Landing page */}
        {currentPath === "/" && (
          <PublicWebsite
            state={store.state}
            onCustomerLoginSuccess={() => {}}
            onAdminLoginSuccess={() => {}}
            onStaffLoginSuccess={() => {}}
            addAuditLog={store.addAuditLog}
            requestPasswordReset={store.requestPasswordReset}
            resetPassword={store.resetPassword}
            sendNotification={store.sendNotification}
            submitContactMessage={store.submitContactMessage}
          />
        )}

        {/* '/login' Route: Unified Login form */}
        {currentPath === "/login" && (
          <Login onLogin={handleLogin} />
        )}

        {/* '/admin' Route: Admin ERP Control Panel */}
        {currentPath === "/admin" && sessionRole === "admin" && (
          <AdminERP 
            onLogout={handleLogout} 
            role={sessionRole}
          />
        )}

        {/* '/dashboard' Route: Customer Portal */}
        {(currentPath === "/dashboard" || currentPath === "/customer/dashboard") && sessionRole === "user" && activeCustomerId && (
          <CustomerPortal
            state={store.state}
            customerId={activeCustomerId}
            onLogout={handleLogout}
            onSubmitPayment={store.submitPortalPayment}
          />
        )}

        {/* '/account' Route: User account details */}
        {currentPath === "/account" && (sessionRole === "user" || sessionRole === "admin") && (
          <Account 
            user={{ email: currentUserEmail || "", role: sessionRole, customerId: activeCustomerId || undefined }}
            state={store.state}
            onLogout={handleLogout}
          />
        )}

        {/* '/404' Route: Not Found page */}
        {currentPath === "/404" && (
          <Error404 />
        )}

        {/* '/500' Route: Internal Server Error page */}
        {currentPath === "/500" && (
          <Error500 />
        )}

        <Toaster position="top-right" richColors />
      </div>
    </ErrorBoundary>
  );
}
