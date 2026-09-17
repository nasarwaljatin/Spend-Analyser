const prisma = require('../config/db');
const { hashPassword } = require('../utils/hash');
const { generateTokens } = require('../utils/jwt');
const { seedCategoriesForUser } = require('../../prisma/seed');
const { ApiError } = require('../utils/helpers');

const register = async ({ email, password, name }) => {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      provider: 'local',
    },
  });

  // Seed default categories for the new user
  await seedCategoriesForUser(user.id);

  const tokens = generateTokens(user.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      preferredCurrency: user.preferredCurrency,
      theme: user.theme,
    },
    ...tokens,
  };
};

const login = async (user) => {
  const tokens = generateTokens(user.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      preferredCurrency: user.preferredCurrency,
      theme: user.theme,
    },
    ...tokens,
  };
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      preferredCurrency: true,
      theme: true,
      provider: true,
      createdAt: true,
    },
  });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const updateProfile = async (userId, data) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      preferredCurrency: true,
      theme: true,
    },
  });
  return user;
};

module.exports = { register, login, getProfile, updateProfile };
