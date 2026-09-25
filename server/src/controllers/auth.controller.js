const passport = require('passport');
const authService = require('../services/auth.service');
const { generateTokens } = require('../utils/jwt');
const { verifyRefreshToken } = require('../utils/jwt');
const { asyncHandler } = require('../utils/helpers');
const env = require('../config/env');

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.cookie('refreshToken', result.refreshToken, getCookieOptions());
  res.status(201).json({
    user: result.user,
    accessToken: result.accessToken,
  });
});

const login = (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });

    const result = await authService.login(user);
    res.cookie('refreshToken', result.refreshToken, getCookieOptions());
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  })(req, res, next);
};

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = verifyRefreshToken(token);
    const tokens = generateTokens(decoded.userId);
    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());
    res.json({ accessToken: tokens.accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', getCookieOptions());
  res.json({ message: 'Logged out successfully' });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.json(user);
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  res.json(user);
});

// OAuth callback handler
const oauthCallback = (req, res) => {
  const tokens = generateTokens(req.user.id);
  res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());
  const clientUrl = (req.targetClientUrl || env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  // Redirect to frontend with access token
  res.redirect(`${clientUrl}/auth/callback?token=${tokens.accessToken}`);
};

module.exports = { register, login, refresh, logout, getMe, updateMe, oauthCallback };
