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

// OAuth routes (guarded with friendly messages if credentials not provided)
router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'Google OAuth is not configured. Please use Email/Password or Demo Login, or add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.',
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      return res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(err.message || 'Google authentication error')}`);
    }
    if (!user) {
      const msg = info?.message || 'Google authentication failed';
      return res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(msg)}`);
    }
    req.user = user;
    return authController.oauthCallback(req, res);
  })(req, res, next);
});

router.get('/github', (req, res, next) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'GitHub OAuth is not configured. Please use Email/Password or Demo Login, or add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to environment variables.',
    });
  }
  passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, user, info) => {
    if (err) {
      return res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(err.message || 'GitHub authentication error')}`);
    }
    if (!user) {
      const msg = info?.message || 'GitHub authentication failed';
      return res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(msg)}`);
    }
    req.user = user;
    return authController.oauthCallback(req, res);
  })(req, res, next);
});

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, validate(updateProfileSchema), authController.updateMe);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateMe);

module.exports = router;
