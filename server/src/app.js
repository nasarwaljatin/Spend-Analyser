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

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/budgets', require('./routes/budget.routes'));
app.use('/api/recurring', require('./routes/recurring.routes'));
app.use('/api/export', require('./routes/export.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
