/**
 * Accounting store — persistent (localStorage) state + actions for the Hisab module.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  AccountingState,
  ActivityLog,
  BankAccount,
  BankTxn,
  Category,
  Employee,
  MoneyTxn,
  Party,
  Payment,
  Product,
  Purchase,
  Reminder,
  Sale,
  SystemUser,
  UserRole,
  rolePresets,
} from './types';
import { round2, todayISO, uid, nowDateTime } from './format';

const STORAGE_KEY = 'dokan_hisab_accounting_v1';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function seedState(): AccountingState {
  const categories: Category[] = [
    { id: 'cat-rice', name: 'Rice / চাল', description: 'ধানের চাল' },
    { id: 'cat-oil', name: 'Oil / তেল', description: 'সয়াবিন তেল' },
    { id: 'cat-grocery', name: 'Grocery / নিত্যপণ্য', description: '' },
    { id: 'cat-stationery', name: 'Stationery', description: '' },
  ];

  const products: Product[] = [
    { id: 'prd-1', name: 'Miniket Rice 25kg', categoryId: 'cat-rice', barcode: '8800000001', unit: 'bag', purchasePrice: 1550, salePrice: 1680, stock: 40, minStock: 10, createdAt: daysAgo(30) },
    { id: 'prd-2', name: 'Soybean Oil 5L', categoryId: 'cat-oil', barcode: '8800000002', unit: 'bottle', purchasePrice: 720, salePrice: 800, stock: 6, minStock: 12, createdAt: daysAgo(25) },
    { id: 'prd-3', name: 'Sugar 1kg', categoryId: 'cat-grocery', barcode: '8800000003', unit: 'pkt', purchasePrice: 118, salePrice: 132, stock: 120, minStock: 50, createdAt: daysAgo(20) },
    { id: 'prd-4', name: 'A4 Paper Rim', categoryId: 'cat-stationery', barcode: '8800000004', unit: 'rim', purchasePrice: 320, salePrice: 380, stock: 0, minStock: 5, createdAt: daysAgo(15) },
  ];

  const parties: Party[] = [
    { id: 'cust-1', type: 'customer', name: 'Rahim Uddin', phone: '01711001122', address: 'Punot Bazar', openingBalance: 2500, createdAt: daysAgo(40) },
    { id: 'cust-2', type: 'customer', name: 'Karim Store', phone: '01822003344', address: 'Kalai', openingBalance: 0, createdAt: daysAgo(35) },
    { id: 'cust-3', type: 'customer', name: 'Salma Begum', phone: '01933004455', address: 'Rajshahi', openingBalance: 800, createdAt: daysAgo(20) },
    { id: 'sup-1', type: 'supplier', name: 'City Group Distributors', phone: '01555006677', address: 'Dhaka', openingBalance: 5000, createdAt: daysAgo(50) },
    { id: 'sup-2', type: 'supplier', name: 'Meghna Oil Mill', phone: '01666007788', address: 'Narayanganj', openingBalance: 1200, createdAt: daysAgo(45) },
  ];

  const sales: Sale[] = [
    {
      id: 'sale-1', invoiceNo: 'INV-1001', customerId: 'cust-1', customerName: 'Rahim Uddin',
      date: daysAgo(2), items: [
        { productId: 'prd-1', productName: 'Miniket Rice 25kg', quantity: 2, unitPrice: 1680, total: 3360 },
        { productId: 'prd-3', productName: 'Sugar 1kg', quantity: 5, unitPrice: 132, total: 660 },
      ], subtotal: 4020, discount: 0, vat: 0, total: 4020, paid: 2000, due: 2020,
      paymentMethod: 'Cash', status: 'Partial',
    },
    {
      id: 'sale-2', invoiceNo: 'INV-1002', customerId: 'cust-2', customerName: 'Karim Store',
      date: daysAgo(1), items: [
        { productId: 'prd-2', productName: 'Soybean Oil 5L', quantity: 4, unitPrice: 800, total: 3200 },
      ], subtotal: 3200, discount: 100, vat: 0, total: 3100, paid: 3100, due: 0,
      paymentMethod: 'bKash', status: 'Paid',
    },
    {
      id: 'sale-3', invoiceNo: 'INV-1003', customerId: 'cust-3', customerName: 'Salma Begum',
      date: todayISO(), items: [
        { productId: 'prd-3', productName: 'Sugar 1kg', quantity: 10, unitPrice: 132, total: 1320 },
      ], subtotal: 1320, discount: 0, vat: 0, total: 1320, paid: 0, due: 1320,
      paymentMethod: 'Cash', status: 'Due',
    },
  ];

  const purchases: Purchase[] = [
    {
      id: 'pur-1', supplierId: 'sup-1', supplierName: 'City Group Distributors',
      date: daysAgo(3), items: [
        { productId: 'prd-1', productName: 'Miniket Rice 25kg', quantity: 20, unitPrice: 1550, total: 31000 },
      ], subtotal: 31000, discount: 0, total: 31000, paid: 20000, due: 11000,
      paymentMethod: 'Bank', status: 'Partial',
    },
    {
      id: 'pur-2', supplierId: 'sup-2', supplierName: 'Meghna Oil Mill',
      date: daysAgo(1), items: [
        { productId: 'prd-2', productName: 'Soybean Oil 5L', quantity: 30, unitPrice: 720, total: 21600 },
      ], subtotal: 21600, discount: 0, total: 21600, paid: 21600, due: 0,
      paymentMethod: 'Cash', status: 'Paid',
    },
  ];

  const moneyTxns: MoneyTxn[] = [
    { id: 'inc-1', type: 'income', category: 'Other Income / অন্যান্য আয়', amount: 500, date: daysAgo(2), party: 'Scrap sale', method: 'Cash', note: 'পুরাতন বক্স বিক্রি' },
    { id: 'exp-1', type: 'expense', category: 'Shop Rent / দোকান ভাড়া', amount: 8000, date: daysAgo(5), party: 'Landlord', method: 'Cash' },
    { id: 'exp-2', type: 'expense', category: 'Electricity Bill / বিদ্যুৎ বিল', amount: 1450, date: daysAgo(3), method: 'bKash', note: 'মাসিক বিল' },
    { id: 'exp-3', type: 'expense', category: 'Transport / পরিবহন', amount: 600, date: todayISO(), method: 'Cash' },
  ];

  const payments: Payment[] = [
    { id: 'pay-1', direction: 'receive', partyId: 'cust-1', partyName: 'Rahim Uddin', partyType: 'customer', amount: 3000, date: daysAgo(1), method: 'Cash' },
    { id: 'pay-2', direction: 'pay', partyId: 'sup-1', partyName: 'City Group Distributors', partyType: 'supplier', amount: 10000, date: daysAgo(2), method: 'Bank' },
  ];

  const bankAccounts: BankAccount[] = [
    { id: 'acc-cash', name: 'Cash in Hand', type: 'Cash', openingBalance: 25000 },
    { id: 'acc-bank', name: 'Dutch-Bangla Bank', type: 'Bank', accountNo: '123456789012', openingBalance: 80000 },
    { id: 'acc-bkash', name: 'bKash Merchant', type: 'bKash', accountNo: '01711001122', openingBalance: 15000 },
  ];

  const bankTxns: BankTxn[] = [
    { id: 'bt-1', accountId: 'acc-bkash', accountName: 'bKash Merchant', type: 'deposit', amount: 3100, date: daysAgo(1), note: 'Karim Store sale' },
    { id: 'bt-2', accountId: 'acc-bank', accountName: 'Dutch-Bangla Bank', type: 'withdraw', amount: 20000, date: daysAgo(3), note: 'Purchase payment' },
  ];

  const employees: Employee[] = [
    { id: 'emp-1', name: 'Hasan Ali', role: 'Salesman', phone: '01700001111', salary: 12000, joinDate: daysAgo(180), status: 'Active', attendance: [{ date: todayISO(), status: 'Present' }] },
    { id: 'emp-2', name: 'Rina Akter', role: 'Cashier', phone: '01700002222', salary: 10000, joinDate: daysAgo(90), status: 'Active', attendance: [{ date: todayISO(), status: 'Present' }] },
  ];

  const users: SystemUser[] = [
    { id: 'usr-1', name: 'Md Abu Masum', username: 'admin', password: 'admin123', role: 'Admin', email: 'abumasumpunot@gmail.com', permissions: [...rolePresets.Admin], status: 'Active', createdAt: daysAgo(365) },
    { id: 'usr-2', name: 'Hasan Ali', username: 'hasan', password: '1234', role: 'Salesman', permissions: [...rolePresets.Salesman], status: 'Active', createdAt: daysAgo(180) },
  ];

  const reminders: Reminder[] = [
    { id: 'rem-1', type: 'customer_due', title: 'Rahim Uddin এর বাকি ৳4,520', message: 'Rahim Uddin এর কাছে বাকি আছে ৳4,520 — মনে করিয়ে দিন।', status: 'pending', relatedId: 'cust-1', createdAt: nowDateTime() },
    { id: 'rem-2', type: 'low_stock', title: 'Soybean Oil 5L stock কম', message: 'Soybean Oil 5L এর stock 6, minimum 12 এর নিচে।', status: 'pending', relatedId: 'prd-2', createdAt: nowDateTime() },
    { id: 'rem-3', type: 'supplier_payment', title: 'City Group Distributors payment due', message: 'সরবরাহকারীকে ৳11,000 বাকি পরিশোধ করুন।', status: 'pending', relatedId: 'sup-1', createdAt: nowDateTime() },
  ];

  return {
    profile: {
      name: 'M/S Mahi and Muhi Traders',
      ownerName: 'Md Abu Masum',
      phone: '+8801712-345678',
      address: 'Punot Bazar, Kalai, Rajshahi, Bangladesh',
      email: 'abumasumpunot@gmail.com',
      currency: '৳',
      invoiceNote: 'ধন্যবাদ! আবার আসুন।',
    },
    settings: {
      currency: '৳',
      taxRate: 0,
      vatRate: 5,
      lowStockAlert: true,
      dueReminder: true,
      dailySummary: true,
      language: 'bn',
      theme: 'emerald',
      invoicePrefix: 'INV',
      invoiceFooter: 'ধন্যবাদ! আবার আসুন।',
    },
    categories,
    products,
    parties,
    sales,
    purchases,
    moneyTxns,
    payments,
    bankAccounts,
    bankTxns,
    employees,
    users,
    reminders,
    trash: [],
    activity: [],
    openingBalance: 25000,
  };
}

function currentUserName(): string {
  if (typeof window === 'undefined') return 'System';
  try {
    const raw = localStorage.getItem('erp_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.name) return u.name;
    }
  } catch (e) { /* ignore */ }
  return 'Admin';
}

function load(): AccountingState {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // merge with defaults to survive schema additions
        const base = seedState();
        return {
          ...base,
          ...parsed,
          profile: { ...base.profile, ...(parsed.profile || {}) },
          settings: { ...base.settings, ...(parsed.settings || {}) },
        };
      }
    } catch (e) {
      console.error('Failed to load accounting state', e);
    }
  }
  return seedState();
}

export const useAccountingStore = () => {
  const [state, setState] = useState<AccountingState>(load);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const mutate = useCallback((fn: (s: AccountingState) => AccountingState) => {
    setState((prev) => fn(prev));
  }, []);

  const logActivity = useCallback((action: string) => {
    const entry: ActivityLog = { id: uid('act'), timestamp: nowDateTime(), user: currentUserName(), action };
    setState((prev) => ({ ...prev, activity: [entry, ...prev.activity].slice(0, 200) }));
  }, []);

  // --- Categories ---
  const addCategory = (c: Omit<Category, 'id'>) =>
    mutate((s) => ({ ...s, categories: [...s.categories, { ...c, id: uid('cat') }] }));
  const updateCategory = (id: string, patch: Partial<Category>) =>
    mutate((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const deleteCategory = (id: string) =>
    mutate((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));

  // --- Products ---
  const addProduct = (p: Omit<Product, 'id' | 'createdAt'>) => {
    mutate((s) => ({ ...s, products: [{ ...p, id: uid('prd'), createdAt: nowDateTime() }, ...s.products] }));
    logActivity(`নতুন পণ্য — ${p.name}`);
  };
  const updateProduct = (id: string, patch: Partial<Product>) =>
    mutate((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const deleteProduct = (id: string) =>
    mutate((s) => {
      const p = s.products.find((x) => x.id === id);
      return {
        ...s,
        products: s.products.filter((x) => x.id !== id),
        trash: p ? [{ id: uid('tr'), entityType: 'product', entityName: p.name, deletedAt: nowDateTime(), data: p }, ...s.trash] : s.trash,
      };
    });
  const adjustStock = (id: string, delta: number) =>
    mutate((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
    }));

  // --- Parties (customers & suppliers) ---
  const addParty = (p: Omit<Party, 'id' | 'createdAt'>) => {
    mutate((s) => ({ ...s, parties: [{ ...p, id: uid(p.type === 'customer' ? 'cust' : 'sup'), createdAt: nowDateTime() }, ...s.parties] }));
    logActivity(`${p.type === 'customer' ? 'নতুন কাস্টমার' : 'নতুন সরবরাহকারী'} — ${p.name}`);
  };
  const updateParty = (id: string, patch: Partial<Party>) =>
    mutate((s) => ({ ...s, parties: s.parties.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const deleteParty = (id: string) =>
    mutate((s) => {
      const p = s.parties.find((x) => x.id === id);
      return {
        ...s,
        parties: s.parties.filter((x) => x.id !== id),
        trash: p ? [{ id: uid('tr'), entityType: p.type, entityName: p.name, deletedAt: nowDateTime(), data: p }, ...s.trash] : s.trash,
      };
    });

  // --- Sales ---
  const addSale = (sale: Omit<Sale, 'id'>) => {
    mutate((s) => ({ ...s, sales: [{ ...sale, id: uid('sale') }, ...s.sales] }));
    logActivity(`নতুন বিক্রি ${sale.invoiceNo} — ৳${sale.total.toLocaleString()}`);
  };
  const updateSale = (id: string, patch: Partial<Sale>) =>
    mutate((s) => ({ ...s, sales: s.sales.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const deleteSale = (id: string) =>
    mutate((s) => {
      const x = s.sales.find((i) => i.id === id);
      return {
        ...s,
        sales: s.sales.filter((i) => i.id !== id),
        trash: x ? [{ id: uid('tr'), entityType: 'sale', entityName: x.invoiceNo, deletedAt: nowDateTime(), data: x }, ...s.trash] : s.trash,
      };
    });

  // --- Purchases ---
  const addPurchase = (p: Omit<Purchase, 'id'>) => {
    mutate((s) => ({ ...s, purchases: [{ ...p, id: uid('pur') }, ...s.purchases] }));
    logActivity(`নতুন কেনাকাটা — ৳${p.total.toLocaleString()}`);
  };
  const updatePurchase = (id: string, patch: Partial<Purchase>) =>
    mutate((s) => ({ ...s, purchases: s.purchases.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const deletePurchase = (id: string) =>
    mutate((s) => {
      const x = s.purchases.find((i) => i.id === id);
      return {
        ...s,
        purchases: s.purchases.filter((i) => i.id !== id),
        trash: x ? [{ id: uid('tr'), entityType: 'purchase', entityName: x.id, deletedAt: nowDateTime(), data: x }, ...s.trash] : s.trash,
      };
    });

  // --- Income / Expense ---
  const addMoneyTxn = (t: Omit<MoneyTxn, 'id'>) => {
    mutate((s) => ({ ...s, moneyTxns: [{ ...t, id: uid(t.type === 'income' ? 'inc' : 'exp') }, ...s.moneyTxns] }));
    logActivity(`${t.type === 'income' ? 'আয়' : 'খরচ'} যোগ — ${t.category} ৳${t.amount.toLocaleString()}`);
  };
  const deleteMoneyTxn = (id: string) =>
    mutate((s) => {
      const x = s.moneyTxns.find((i) => i.id === id);
      return {
        ...s,
        moneyTxns: s.moneyTxns.filter((i) => i.id !== id),
        trash: x ? [{ id: uid('tr'), entityType: x.type, entityName: x.category, deletedAt: nowDateTime(), data: x }, ...s.trash] : s.trash,
      };
    });

  // --- Payments ---
  const addPayment = (p: Omit<Payment, 'id'>) => {
    mutate((s) => ({ ...s, payments: [{ ...p, id: uid('pay') }, ...s.payments] }));
    logActivity(`${p.direction === 'receive' ? 'টাকা গ্রহণ' : 'টাকা প্রদান'} — ${p.partyName} ৳${p.amount.toLocaleString()}`);
  };
  const deletePayment = (id: string) =>
    mutate((s) => {
      const x = s.payments.find((i) => i.id === id);
      return {
        ...s,
        payments: s.payments.filter((i) => i.id !== id),
        trash: x ? [{ id: uid('tr'), entityType: 'payment', entityName: `${x.direction} ${x.partyName}`, deletedAt: nowDateTime(), data: x }, ...s.trash] : s.trash,
      };
    });

  // --- Bank ---
  const addBankAccount = (a: Omit<BankAccount, 'id'>) =>
    mutate((s) => ({ ...s, bankAccounts: [...s.bankAccounts, { ...a, id: uid('acc') }] }));
  const updateBankAccount = (id: string, patch: Partial<BankAccount>) =>
    mutate((s) => ({ ...s, bankAccounts: s.bankAccounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const deleteBankAccount = (id: string) =>
    mutate((s) => ({ ...s, bankAccounts: s.bankAccounts.filter((a) => a.id !== id) }));
  const addBankTxn = (t: Omit<BankTxn, 'id'>) =>
    mutate((s) => ({ ...s, bankTxns: [{ ...t, id: uid('bt') }, ...s.bankTxns] }));
  const deleteBankTxn = (id: string) =>
    mutate((s) => ({ ...s, bankTxns: s.bankTxns.filter((t) => t.id !== id) }));

  // --- Employees ---
  const addEmployee = (e: Omit<Employee, 'id' | 'attendance'>) =>
    mutate((s) => ({ ...s, employees: [...s.employees, { ...e, id: uid('emp'), attendance: [] }] }));
  const updateEmployee = (id: string, patch: Partial<Employee>) =>
    mutate((s) => ({ ...s, employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const deleteEmployee = (id: string) =>
    mutate((s) => ({ ...s, employees: s.employees.filter((e) => e.id !== id) }));
  const markAttendance = (id: string, date: string, status: 'Present' | 'Absent' | 'Leave') =>
    mutate((s) => ({
      ...s,
      employees: s.employees.map((e) => {
        if (e.id !== id) return e;
        const rest = e.attendance.filter((a) => a.date !== date);
        return { ...e, attendance: [...rest, { date, status }] };
      }),
    }));

  // --- Users ---
  const addUser = (u: Omit<SystemUser, 'id' | 'createdAt' | 'permissions'> & { role: UserRole; permissions?: SystemUser['permissions'] }) =>
    mutate((s) => ({
      ...s,
      users: [
        ...s.users,
        { ...u, id: uid('usr'), createdAt: nowDateTime(), permissions: u.permissions || [...rolePresets[u.role]] },
      ],
    }));
  const updateUser = (id: string, patch: Partial<SystemUser>) =>
    mutate((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
  const deleteUser = (id: string) =>
    mutate((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));

  // --- Reminders ---
  const addReminder = (r: Omit<Reminder, 'id' | 'createdAt'>) =>
    mutate((s) => ({ ...s, reminders: [{ ...r, id: uid('rem'), createdAt: nowDateTime() }, ...s.reminders] }));
  const updateReminder = (id: string, patch: Partial<Reminder>) =>
    mutate((s) => ({ ...s, reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const deleteReminder = (id: string) =>
    mutate((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));

  // --- Trash ---
  const restoreTrash = (id: string) =>
    mutate((s) => {
      const item = s.trash.find((t) => t.id === id);
      if (!item) return s;
      const rest = s.trash.filter((t) => t.id !== id);
      const data = item.data;
      switch (item.entityType) {
        case 'customer':
          return { ...s, trash: rest, parties: [{ ...data, type: 'customer' }, ...s.parties] };
        case 'supplier':
          return { ...s, trash: rest, parties: [{ ...data, type: 'supplier' }, ...s.parties] };
        case 'product':
          return { ...s, trash: rest, products: [...s.products, data] };
        case 'sale':
          return { ...s, trash: rest, sales: [...s.sales, data] };
        case 'purchase':
          return { ...s, trash: rest, purchases: [...s.purchases, data] };
        case 'income':
          return { ...s, trash: rest, moneyTxns: [{ ...data, type: 'income' }, ...s.moneyTxns] };
        case 'expense':
          return { ...s, trash: rest, moneyTxns: [{ ...data, type: 'expense' }, ...s.moneyTxns] };
        case 'payment':
          return { ...s, trash: rest, payments: [...s.payments, data] };
        default:
          return { ...s, trash: rest };
      }
    });
  const purgeTrash = (id: string) =>
    mutate((s) => ({ ...s, trash: s.trash.filter((t) => t.id !== id) }));
  const emptyTrash = () => mutate((s) => ({ ...s, trash: [] }));

  // --- Settings / Profile ---
  const saveProfile = (patch: Partial<AccountingState['profile']>) =>
    mutate((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const saveSettings = (patch: Partial<AccountingState['settings']>) =>
    mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const setOpeningBalance = (n: number) => mutate((s) => ({ ...s, openingBalance: n }));

  // --- Reset demo / full reset ---
  const resetAll = () => setState(seedState());

  return {
    state,
    addCategory, updateCategory, deleteCategory,
    addProduct, updateProduct, deleteProduct, adjustStock,
    addParty, updateParty, deleteParty,
    addSale, updateSale, deleteSale,
    addPurchase, updatePurchase, deletePurchase,
    addMoneyTxn, deleteMoneyTxn,
    addPayment, deletePayment,
    addBankAccount, updateBankAccount, deleteBankAccount, addBankTxn, deleteBankTxn,
    addEmployee, updateEmployee, deleteEmployee, markAttendance,
    addUser, updateUser, deleteUser,
    addReminder, updateReminder, deleteReminder,
    restoreTrash, purgeTrash, emptyTrash,
    saveProfile, saveSettings, setOpeningBalance,
    logActivity, resetAll,
  };
};

// Derived helpers used across components
export const customerBalance = (s: AccountingState, partyId: string): number => {
  const p = s.parties.find((x) => x.id === partyId);
  if (!p) return 0;
  const salesTotal = s.sales.filter((x) => x.customerId === partyId).reduce((a, x) => a + x.total, 0);
  const paid = s.payments.filter((x) => x.partyId === partyId && x.direction === 'receive').reduce((a, x) => a + x.amount, 0);
  // Refunds (direction 'pay') put money back into the customer's hands, so they
  // increase the outstanding balance again.
  const refunded = s.payments.filter((x) => x.partyId === partyId && x.direction === 'pay').reduce((a, x) => a + x.amount, 0);
  return round2((p.openingBalance || 0) + salesTotal + refunded - paid);
};

export const supplierBalance = (s: AccountingState, partyId: string): number => {
  const p = s.parties.find((x) => x.id === partyId);
  if (!p) return 0;
  const purchaseTotal = s.purchases.filter((x) => x.supplierId === partyId).reduce((a, x) => a + x.total, 0);
  const paid = s.payments.filter((x) => x.partyId === partyId && x.direction === 'pay').reduce((a, x) => a + x.amount, 0);
  return round2((p.openingBalance || 0) + purchaseTotal - paid);
};

export const accountBalance = (s: AccountingState, accountId: string): number => {
  const a = s.bankAccounts.find((x) => x.id === accountId);
  if (!a) return 0;
  let bal = a.openingBalance || 0;
  for (const t of s.bankTxns.filter((x) => x.accountId === accountId)) {
    if (t.type === 'deposit') bal += t.amount;
    else if (t.type === 'withdraw') bal -= t.amount;
    else if (t.type === 'transfer') {
      if (t.toAccountId === accountId) bal += t.amount;
      else bal -= t.amount;
    }
  }
  return round2(bal);
};

export const cashBalance = (s: AccountingState): number => {
  const cash = s.bankAccounts.find((a) => a.type === 'Cash');
  const base = cash ? accountBalance(s, cash.id) : s.openingBalance || 0;
  return round2(base);
};
