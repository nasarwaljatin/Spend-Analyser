const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, updateProfileSchema } = require('../schemas/auth.schema');
const { authLimiter } = require('../middleware/rateLimiter');
const env = require('../config/env');

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Helper to extract and sanitize target client URL from OAuth state
const getTargetClientUrl = (req) => {
  const defaultClientUrl = (env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const state = req.query.state;
  if (!state) return defaultClientUrl;

  try {
    let decoded = state;
    // Handle base64 encoded state or plain URL
    if (!state.startsWith('http://') && !state.startsWith('https://')) {
      decoded = Buffer.from(state, 'base64').toString('utf8');
    }
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      const url = new URL(decoded);
      return url.origin.replace(/\/+$/, '');
    }
  } catch (err) {
    console.warn('Failed to parse OAuth state URL:', err.message);
  }
  return defaultClientUrl;
};

// OAuth routes (guarded with friendly messages if credentials not provided)
router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'Google OAuth is not configured. Please use Email/Password or Demo Login, or add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.',
    });
  }
  const state = req.query.state || req.headers.referer || '';
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: state ? Buffer.from(state).toString('base64') : undefined,
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const targetClientUrl = getTargetClientUrl(req);

  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${targetClientUrl}/login?error=${encodeURIComponent(err.message || 'Google authentication error')}`);
    }
    if (!user) {
      const msg = info?.message || 'Google authentication failed';
      return res.redirect(`${targetClientUrl}/login?error=${encodeURIComponent(msg)}`);
    }
    req.user = user;
    req.targetClientUrl = targetClientUrl;
    return authController.oauthCallback(req, res);
  })(req, res, next);
});

router.get('/github', (req, res, next) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'GitHub OAuth is not configured. Please use Email/Password or Demo Login, or add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to environment variables.',
    });
  }
  const state = req.query.state || req.headers.referer || '';
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
    state: state ? Buffer.from(state).toString('base64') : undefined,
  })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  const targetClientUrl = getTargetClientUrl(req);

  passport.authenticate('github', { session: false }, (err, user, info) => {
    if (err) {
      console.error('GitHub OAuth error:', err);
      return res.redirect(`${targetClientUrl}/login?error=${encodeURIComponent(err.message || 'GitHub authentication error')}`);
    }
    if (!user) {
      const msg = info?.message || 'GitHub authentication failed';
      return res.redirect(`${targetClientUrl}/login?error=${encodeURIComponent(msg)}`);
    }
    req.user = user;
    req.targetClientUrl = targetClientUrl;
    return authController.oauthCallback(req, res);
  })(req, res, next);
});

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, validate(updateProfileSchema), authController.updateMe);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateMe);

module.exports = router;
