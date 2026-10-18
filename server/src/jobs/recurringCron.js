const cron = require('node-cron');
const { processDueTransactions } = require('../services/recurring.service');

const run = async (reason) => {
  try {
    const count = await processDueTransactions();
    if (count > 0) console.log(`[CRON] (${reason}) Created ${count} recurring transaction(s)`);
  } catch (err) {
    console.error('[CRON] Error processing recurring transactions:', err.message);
  }
};

const startRecurringCron = () => {
  // Hosts like Render's free tier sleep when idle, so a single midnight run can
  // be missed. Catch up on boot and then check every hour.
  run('startup');
  cron.schedule('5 * * * *', () => run('hourly'));

  console.log('[CRON] Recurring transactions job scheduled (on startup + hourly)');
};

module.exports = startRecurringCron;
