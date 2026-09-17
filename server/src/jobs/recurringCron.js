const cron = require('node-cron');
const { processDueTransactions } = require('../services/recurring.service');

const startRecurringCron = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Processing recurring transactions...');
    try {
      const count = await processDueTransactions();
      console.log(`[CRON] Processed ${count} recurring transaction(s)`);
    } catch (err) {
      console.error('[CRON] Error processing recurring transactions:', err.message);
    }
  });

  console.log('[CRON] Recurring transactions cron job scheduled (daily at midnight)');
};

module.exports = startRecurringCron;
