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

      // Allow localhost in development and Capacitor hybrid apps
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || origin === 'capacitor://localhost' || origin === 'ionic://localhost') {
        return callback(null, true);
      }

      // Allow 127.0.0.1 or local network IPs for mobile testing
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) || /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) || /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) {
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
