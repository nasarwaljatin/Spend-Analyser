/**
 * Minimal RFC-4180 CSV parser: handles quoted fields, escaped quotes ("")
 * and newlines inside quotes. Returns an array of string arrays.
 */
export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, ''); // strip BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};

const COLUMN_PATTERNS = {
  date: /date/i,
  time: /^time$/i,
  description: /desc|narration|particular|details|remark|merchant|payee|title/i,
  amount: /^(amount|amt)/i,
  debit: /debit|withdraw|^dr\.?$/i,
  credit: /credit|deposit|^cr\.?$/i,
  type: /^type$|txn type|transaction type/i,
  category: /categor/i,
  notes: /note|memo|comment/i,
};

/** Guess which column index holds each field based on header names. */
export const detectColumns = (headers) => {
  const mapping = {};
  Object.entries(COLUMN_PATTERNS).forEach(([field, pattern]) => {
    const idx = headers.findIndex(
      (h, i) => pattern.test(h.trim()) && !Object.values(mapping).includes(i)
    );
    mapping[field] = idx >= 0 ? idx : -1;
  });
  return mapping;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Parse common bank-statement date formats into a Date (local time).
 * `dayFirst` controls whether 03/04/2026 is 3 April (true) or 4 March.
 */
export const parseFlexibleDate = (value, timeValue = '', dayFirst = true) => {
  const raw = (value || '').trim();
  if (!raw) return null;

  let y;
  let m;
  let d;
  let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    [, y, m, d] = match.map(Number);
  } else if ((match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    y = Number(match[3]);
    [d, m] = dayFirst ? [a, b] : [b, a];
  } else if ((match = raw.match(/^(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s-,]*(\d{2,4})/i))) {
    d = Number(match[1]);
    m = MONTHS.indexOf(match[2].toLowerCase()) + 1;
    y = Number(match[3]);
  } else {
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (y < 100) y += 2000;
  if (!m || m > 12 || !d || d > 31) return null;

  const timeMatch = `${timeValue} ${raw}`.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  let hours = 12;
  let minutes = 0;
  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
    const meridiem = (timeMatch[4] || '').toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  }

  const date = new Date(y, m - 1, d, hours, minutes);
  return isNaN(date.getTime()) ? null : date;
};

/** Parse "₹1,234.50", "(500)", "-200", "1,000 Dr" into a signed number. */
export const parseAmount = (value) => {
  const raw = (value || '').toString().trim();
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw) || /^-/.test(raw) || /\bdr\.?$/i.test(raw);
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  return negative ? -num : num;
};
