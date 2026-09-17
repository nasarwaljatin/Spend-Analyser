require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  OAUTH_CALLBACK_URL: z.string().url().default('http://localhost:5000'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  EXCHANGE_RATE_API_URL: z.string().url().default('https://open.er-api.com/v6/latest'),
});

const env = envSchema.parse(process.env);

module.exports = env;
