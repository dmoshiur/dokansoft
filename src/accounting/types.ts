/**
 * Accounting ("Hisab" / হিসাব) domain types — self-contained module.
 */

export type PartyType = 'customer' | 'supplier';

export interface Party {
  id: string;
  type: PartyType;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  openingBalance: number; // customer: + means they owe us; supplier: + means we owe them
  notes?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  barcode?: string;
  image?: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  createdAt: string;
}

export interface TxnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type PaymentStatus = 'Paid' | 'Partial' | 'Due';

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  date: string; // yyyy-mm-dd
  items: TxnItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod: string;
  status: PaymentStatus;
  note?: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: TxnItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod: string;
  status: PaymentStatus;
  note?: string;
}

export interface MoneyTxn {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  party?: string;
  method: string;
  note?: string;
}

export interface Payment {
  id: string;
  direction: 'receive' | 'pay';
  partyId: string;
  partyName: string;
  partyType: PartyType;
  amount: number;
  date: string;
  method: string;
  reference?: string;
  note?: string;
}

export type BankAccountType = 'Cash' | 'Bank' | 'bKash' | 'Nagad' | 'Rocket';

export interface BankAccount {
  id: string;
  name: string;
  type: BankAccountType;
  accountNo?: string;
  openingBalance: number;
}

export interface BankTxn {
  id: string;
  accountId: string;
  accountName: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  date: string;
  toAccountId?: string;
  toAccountName?: string;
  note?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  salary: number;
  joinDate: string;
  status: 'Active' | 'Inactive';
  attendance: { date: string; status: 'Present' | 'Absent' | 'Leave' }[];
}

export type UserRole = 'Admin' | 'Manager' | 'Cashier' | 'Salesman' | 'Staff';

export const PERMISSIONS = [
  'dashboard.view',
  'customers.view',
  'customers.manage',
  'suppliers.view',
  'suppliers.manage',
  'products.view',
  'products.manage',
  'sales.view',
  'sales.manage',
  'purchases.view',
  'purchases.manage',
  'income.view',
  'income.manage',
  'expense.view',
  'expense.manage',
  'payments.view',
  'payments.manage',
  'cashbook.view',
  'bank.view',
  'reports.view',
  'employees.view',
  'employees.manage',
  'users.manage',
  'settings.manage',
  'backup.manage',
  'trash.delete',
  'reports.delete',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  email?: string;
  phone?: string;
  permissions: Permission[];
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export type ReminderType =
  | 'customer_due'
  | 'supplier_payment'
  | 'due_date'
  | 'low_stock'
  | 'payment'
  | 'daily_summary';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  dueDate?: string;
  status: 'pending' | 'done';
  relatedId?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
}

export interface TrashItem {
  id: string;
  entityType: string;
  entityName: string;
  deletedAt: string;
  data: any;
}

export interface BusinessProfile {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  email?: string;
  logo?: string;
  currency: string;
  invoiceNote?: string;
}

export interface AccountingSettings {
  currency: string;
  taxRate: number;
  vatRate: number;
  lowStockAlert: boolean;
  dueReminder: boolean;
  dailySummary: boolean;
  language: 'bn' | 'en';
  theme: string;
  invoicePrefix: string;
  invoiceFooter: string;
}

export interface AccountingState {
  profile: BusinessProfile;
  settings: AccountingSettings;
  categories: Category[];
  products: Product[];
  parties: Party[];
  sales: Sale[];
  purchases: Purchase[];
  moneyTxns: MoneyTxn[];
  payments: Payment[];
  bankAccounts: BankAccount[];
  bankTxns: BankTxn[];
  employees: Employee[];
  users: SystemUser[];
  reminders: Reminder[];
  trash: TrashItem[];
  activity: ActivityLog[];
  openingBalance: number;
}

export const rolePresets: Record<UserRole, Permission[]> = {
  Admin: [...PERMISSIONS],
  Manager: [
    'dashboard.view', 'customers.view', 'customers.manage', 'suppliers.view',
    'suppliers.manage', 'products.view', 'products.manage', 'sales.view',
    'sales.manage', 'purchases.view', 'purchases.manage', 'income.view',
    'income.manage', 'expense.view', 'expense.manage', 'payments.view',
    'payments.manage', 'cashbook.view', 'bank.view', 'reports.view',
    'employees.view', 'employees.manage',
  ],
  Cashier: [
    'dashboard.view', 'customers.view', 'products.view', 'sales.view',
    'sales.manage', 'payments.view', 'payments.manage', 'cashbook.view',
  ],
  Salesman: [
    'dashboard.view', 'customers.view', 'products.view', 'sales.view', 'sales.manage',
  ],
  Staff: [
    'dashboard.view', 'customers.view', 'products.view', 'sales.view',
  ],
};
