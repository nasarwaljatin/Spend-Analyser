const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SGD: 'S$',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
};

export const formatCurrency = (amount, currency = 'INR') => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const num = Number(amount);

  if (isNaN(num)) return `${symbol}0.00`;

  if (Math.abs(num) >= 10000000) {
    return `${symbol}${(num / 10000000).toFixed(2)}Cr`;
  }
  if (Math.abs(num) >= 100000) {
    return `${symbol}${(num / 100000).toFixed(2)}L`;
  }
  if (Math.abs(num) >= 1000) {
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${symbol}${num.toFixed(2)}`;
};

export const formatCompactCurrency = (amount, currency = 'INR') => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const num = Number(amount);

  if (Math.abs(num) >= 10000000) return `${symbol}${(num / 10000000).toFixed(1)}Cr`;
  if (Math.abs(num) >= 100000) return `${symbol}${(num / 100000).toFixed(1)}L`;
  if (Math.abs(num) >= 1000) return `${symbol}${(num / 1000).toFixed(1)}K`;
  return `${symbol}${num.toFixed(0)}`;
};
