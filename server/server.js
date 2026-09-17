const app = require('./src/app');
const env = require('./src/config/env');
const startRecurringCron = require('./src/jobs/recurringCron');

const PORT = parseInt(env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Spend Analyser API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Client URL: ${env.CLIENT_URL}\n`);

  // Start background jobs
  startRecurringCron();
});
