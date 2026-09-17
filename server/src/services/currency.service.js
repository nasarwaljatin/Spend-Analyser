const env = require('../config/env');

let cachedRates = null;
let lastFetch = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const fetchExchangeRates = async (baseCurrency = 'USD') => {
  // Use cached rates if still fresh
  if (cachedRates && lastFetch && Date.now() - lastFetch < CACHE_TTL) {
    return cachedRates;
  }

  try {
    const response = await fetch(`${env.EXCHANGE_RATE_API_URL}/${baseCurrency}`);
    const data = await response.json();
    if (data.result === 'success') {
      cachedRates = data.rates;
      lastFetch = Date.now();
      return data.rates;
    }
    throw new Error('Failed to fetch exchange rates');
  } catch (err) {
    console.error('Exchange rate fetch error:', err.message);
    // Return fallback rates if API fails
    return cachedRates || { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095 };
  }
};

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;

  const rates = await fetchExchangeRates('USD');
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  // Convert to USD first, then to target
  const usdAmount = amount / fromRate;
  return Number((usdAmount * toRate).toFixed(2));
};

const getSupportedCurrencies = () => {
  return [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ];
};

module.exports = { fetchExchangeRates, convertCurrency, getSupportedCurrencies };
