const cors = require('cors');

const configureCors = (clientUrl) => {
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Match configured CLIENT_URL
      if (clientUrl && origin === clientUrl) {
        return callback(null, true);
      }

      // Allow all vercel.app domains (production and preview branches)
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Deny other origins
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
};

module.exports = configureCors;
