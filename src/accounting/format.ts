/**
 * Formatting & misc helpers for the accounting module.
 */

export const fmtMoney = (n: number, currency = '৳'): string => {
  const v = Number.isFinite(n) ? n : 0;
  const sign = v < 0 ? '-' : '';
  return `${sign}${currency}${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const todayISO = (): string => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

export const nowDateTime = (): string => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 19).replace('T', ' ');
};

export const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + (b || 0), 0);

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function shareText(title: string, text: string) {
  const full = `${title}\n\n${text}`;
  if (navigator.share) {
    navigator.share({ title, text: full }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(full).catch(() => {});
  }
}

export const waLink = (phone: string, text: string): string => {
  const p = (phone || '').replace(/[^\d]/g, '');
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};

export const smsLink = (phone: string, text: string): string =>
  `sms:${phone}?body=${encodeURIComponent(text)}`;

export function bengaliDigits(s: string | number): string {
  const map: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  };
  return String(s).replace(/[0-9]/g, (d) => map[d]);
}

export const normalizePhone = (p: string): string =>
  (p || '').replace(/[^\d+]/g, '');
