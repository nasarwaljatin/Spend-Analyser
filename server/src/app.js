const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const configureCors = require('./config/cors');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Initialize passport strategies
require('./config/passport');

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(configureCors(env.CLIENT_URL));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Route modules
const authRoutes = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transaction.routes');
const categoryRoutes = require('./routes/category.routes');
const reportRoutes = require('./routes/report.routes');
const budgetRoutes = require('./routes/budget.routes');
const recurringRoutes = require('./routes/recurring.routes');
const exportRoutes = require('./routes/export.routes');

// Mount on both /api/path and /path to gracefully support VITE_API_URL with or without /api suffix
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/transactions', transactionRoutes);
app.use('/transactions', transactionRoutes);

app.use('/api/categories', categoryRoutes);
app.use('/categories', categoryRoutes);

app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes);

app.use('/api/budgets', budgetRoutes);
app.use('/budgets', budgetRoutes);

app.use('/api/recurring', recurringRoutes);
app.use('/recurring', recurringRoutes);

app.use('/api/export', exportRoutes);
app.use('/export', exportRoutes);

// Health check (available at /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
