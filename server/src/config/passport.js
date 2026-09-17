const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcryptjs');
const prisma = require('./db');
const env = require('./env');
const { seedCategoriesForUser } = require('../../prisma/seed');

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.passwordHash) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google Strategy (optional — only if credentials are configured)
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.OAUTH_CALLBACK_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findFirst({
            where: { provider: 'google', providerId: profile.id },
          });
          if (!user) {
            // Check if email already exists
            const existingUser = await prisma.user.findUnique({
              where: { email: profile.emails[0].value },
            });
            if (existingUser) {
              return done(null, false, {
                message: 'Email already registered with another method',
              });
            }
            user = await prisma.user.create({
              data: {
                email: profile.emails[0].value,
                name: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                provider: 'google',
                providerId: profile.id,
              },
            });
            await seedCategoriesForUser(user.id);
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// GitHub Strategy (optional — only if credentials are configured)
if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: `${env.OAUTH_CALLBACK_URL}/api/auth/github/callback`,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findFirst({
            where: { provider: 'github', providerId: profile.id.toString() },
          });
          if (!user) {
            const email =
              profile.emails?.[0]?.value || `${profile.username}@github.noemail`;
            const existingUser = await prisma.user.findUnique({
              where: { email },
            });
            if (existingUser) {
              return done(null, false, {
                message: 'Email already registered with another method',
              });
            }
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || profile.username,
                avatarUrl: profile.photos?.[0]?.value,
                provider: 'github',
                providerId: profile.id.toString(),
              },
            });
            await seedCategoriesForUser(user.id);
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

module.exports = passport;
