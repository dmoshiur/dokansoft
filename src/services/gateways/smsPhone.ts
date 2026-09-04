/**
 * Bangladeshi phone-number normalisation for the sms.net.bd gateway.
 *
 * sms.net.bd requires every recipient to be either the international form
 * (880XXXXXXXXXX) or the standard local form (01XXXXXXXXX). Anything else is
 * rejected with `error: 416 — No valid number found`, which used to surface as
 * a silent failure because we never inspected the `error` field.
 *
 * These helpers strip spaces, dashes, brackets, unicode digits and leading
 * `+`/`00`, then convert whatever remains into the canonical `880…` form.
 */

const BN_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

export interface NormalizedNumber {
  /** Canonical 880XXXXXXXXXX value to send to the gateway ("" when invalid). */
  value: string;
  valid: boolean;
  /** Human readable reason when `valid` is false. */
  reason?: string;
  /** The raw input, for logging. */
  input: string;
}

/** Strip formatting characters and convert Bangla digits to ASCII. */
export function cleanNumber(raw: string): string {
  return String(raw ?? "")
    .replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d)
    .replace(/[\s\-().\u00a0\u200b]/g, "")
    .trim();
}

/**
 * Normalise a single recipient to the `880XXXXXXXXXX` format expected by
 * sms.net.bd. Accepts `01XXXXXXXXX`, `8801XXXXXXXXX`, `+8801XXXXXXXXX`,
 * `008801XXXXXXXXX` and `1XXXXXXXXX`.
 */
export function normalizeBdNumber(raw: string): NormalizedNumber {
  const input = String(raw ?? "");
  let n = cleanNumber(input);

  if (!n) return { value: "", valid: false, reason: "নম্বর খালি / empty number", input };

  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("00")) n = n.slice(2);

  if (/\D/.test(n)) {
    return { value: "", valid: false, reason: `অবৈধ অক্ষর আছে / non-digit characters in "${input}"`, input };
  }

  // 1XXXXXXXXX (10 digits, no leading zero) -> 8801XXXXXXXXX
  if (n.length === 10 && n.startsWith("1")) n = `880${n}`;
  // 01XXXXXXXXX (11 digits) -> 8801XXXXXXXXX
  else if (n.length === 11 && n.startsWith("01")) n = `88${n}`;

  if (!/^8801[3-9]\d{8}$/.test(n)) {
    return {
      value: "",
      valid: false,
      reason: `বাংলাদেশি মোবাইল নম্বর নয় / not a valid BD mobile number: "${input}"`,
      input,
    };
  }

  return { value: n, valid: true, input };
}

/**
 * Normalise a comma separated recipient list (sms.net.bd campaign format).
 * Returns the joined valid numbers plus the list of rejected inputs.
 */
export function normalizeRecipients(raw: string): {
  to: string;
  valid: string[];
  invalid: NormalizedNumber[];
} {
  const parts = String(raw ?? "")
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: NormalizedNumber[] = [];
  for (const p of parts) {
    const n = normalizeBdNumber(p);
    if (n.valid) {
      if (!valid.includes(n.value)) valid.push(n.value);
    } else {
      invalid.push(n);
    }
  }
  return { to: valid.join(","), valid, invalid };
}

/**
 * Human readable meaning for the documented sms.net.bd error codes, so the SMS
 * Log page shows the real cause instead of a blank failure.
 */
export const SMS_ERROR_CODES: Record<string, string> = {
  "0": "Success",
  "400": "Missing or invalid parameter (ভুল/অনুপস্থিত প্যারামিটার)",
  "403": "Permission denied for this request (অনুমতি নেই)",
  "404": "Requested resource not found",
  "405": "Authorization required — API key ভুল বা অনুপস্থিত",
  "409": "Unknown server error at sms.net.bd",
  "410": "Account expired (অ্যাকাউন্টের মেয়াদ শেষ)",
  "411": "Reseller account expired or suspended",
  "412": "Invalid schedule value",
  "413": "Invalid Sender ID (অনুমোদিত sender ID ব্যবহার করুন)",
  "414": "Message is empty",
  "415": "Message is too long",
  "416": "No valid number found (নাম্বার ফরম্যাট ভুল)",
  "417": "Insufficient balance (ব্যালেন্স শেষ)",
  "420": "Content blocked (content_id অনুমোদিত নয়)",
};

export function describeSmsError(code: string | number | undefined, msg?: string): string {
  const key = String(code ?? "").trim();
  const known = SMS_ERROR_CODES[key];
  if (known && key !== "0") return `[${key}] ${known}${msg ? ` — ${msg}` : ""}`;
  if (msg) return key ? `[${key}] ${msg}` : msg;
  return key ? `[${key}] Unknown gateway error` : "Unknown gateway error";
}
