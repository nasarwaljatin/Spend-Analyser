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
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.cookie('refreshToken', result.refreshToken, getCookieOptions());
  res.status(201).json({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
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
      refreshToken: result.refreshToken,
    });
  })(req, res, next);
};

const refresh = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.headers['x-refresh-token'] || req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = verifyRefreshToken(token);
    const tokens = generateTokens(decoded.userId);
    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());
    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
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
  const clientUrl = (req.targetClientUrl || env.CLIENT_URL || 'https://spend-analyser-six.vercel.app').replace(/\/+$/, '');
  if (clientUrl.startsWith('spendwise://')) {
    return res.redirect(`${clientUrl}?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  }
  // Redirect to frontend with access token and refresh token
  res.redirect(`${clientUrl}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
};

module.exports = { register, login, refresh, logout, getMe, updateMe, oauthCallback };
