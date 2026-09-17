const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const defaultSpendCategories = [
  { name: 'Food & Dining', icon: '🍕', color: '#ef4444' },
  { name: 'Rent / Housing', icon: '🏠', color: '#8b5cf6' },
  { name: 'Transportation', icon: '🚗', color: '#f97316' },
  { name: 'Groceries', icon: '🛒', color: '#22c55e' },
  { name: 'Healthcare', icon: '💊', color: '#ec4899' },
  { name: 'Entertainment', icon: '🎬', color: '#a855f7' },
  { name: 'Shopping / Clothing', icon: '👕', color: '#06b6d4' },
  { name: 'Phone & Internet', icon: '📱', color: '#3b82f6' },
  { name: 'Utilities', icon: '⚡', color: '#eab308' },
  { name: 'Education', icon: '📚', color: '#14b8a6' },
  { name: 'Travel', icon: '✈️', color: '#6366f1' },
  { name: 'Subscriptions', icon: '📦', color: '#0ea5e9' },
  { name: 'Miscellaneous', icon: '❓', color: '#64748b' },
];

const defaultEarningCategories = [
  { name: 'Salary', icon: '💼', color: '#10b981' },
  { name: 'Freelance / Side Income', icon: '💻', color: '#22d3ee' },
  { name: 'Investments', icon: '📈', color: '#34d399' },
  { name: 'Interest', icon: '🏦', color: '#a3e635' },
  { name: 'Bonus', icon: '🎯', color: '#fbbf24' },
  { name: 'Refunds', icon: '🤝', color: '#818cf8' },
];

async function seedCategoriesForUser(userId) {
  const categories = [
    ...defaultSpendCategories.map((c) => ({
      ...c,
      type: 'spend',
      userId,
      isDefault: true,
    })),
    ...defaultEarningCategories.map((c) => ({
      ...c,
      type: 'earning',
      userId,
      isDefault: true,
    })),
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        userId_name_type: {
          userId: cat.userId,
          name: cat.name,
          type: cat.type,
        },
      },
      update: {},
      create: cat,
    });
  }
}

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create or get Demo User
  const demoEmail = 'demo@spendanalyser.com';
  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      passwordHash,
      name: 'Demo Financial User',
      preferredCurrency: 'INR',
      theme: 'dark',
    },
  });

  console.log(`👤 User ready: ${demoUser.email} (${demoUser.id})`);

  // 2. Seed categories for demo user
  await seedCategoriesForUser(demoUser.id);
  console.log('📂 Default categories seeded.');

  const userCategories = await prisma.category.findMany({
    where: { userId: demoUser.id },
  });

  const getCat = (name, type) => userCategories.find((c) => c.name === name && c.type === type)?.id;

  // 3. Create sample transactions for current and previous months
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Check if transactions already exist
  const existingCount = await prisma.transaction.count({ where: { userId: demoUser.id } });

  if (existingCount === 0) {
    console.log('💳 Creating realistic sample transactions...');

    const sampleTxns = [
      // Current Month Transactions
      {
        description: 'Monthly Engineering Salary',
        amount: 85000,
        type: 'earning',
        catName: 'Salary',
        daysAgo: 16,
      },
      {
        description: 'Mobile App Consulting Project',
        amount: 22500,
        type: 'earning',
        catName: 'Freelance / Side Income',
        daysAgo: 8,
      },
      {
        description: 'Mutual Funds SIP Dividend',
        amount: 3400,
        type: 'earning',
        catName: 'Investments',
        daysAgo: 5,
      },
      {
        description: 'Apartment Monthly Rent',
        amount: 24000,
        type: 'spend',
        catName: 'Rent / Housing',
        daysAgo: 16,
      },
      {
        description: 'Weekly Organic Grocery Run',
        amount: 3650,
        type: 'spend',
        catName: 'Groceries',
        daysAgo: 14,
      },
      {
        description: 'Team Dinner & Pizza Party',
        amount: 2100,
        type: 'spend',
        catName: 'Food & Dining',
        daysAgo: 11,
      },
      {
        description: 'Electricity & Water Utility Bill',
        amount: 1850,
        type: 'spend',
        catName: 'Utilities',
        daysAgo: 9,
      },
      {
        description: 'Netflix & Spotify Subscriptions',
        amount: 999,
        type: 'spend',
        catName: 'Subscriptions',
        daysAgo: 7,
      },
      {
        description: 'Fuel & Cab Commutes',
        amount: 2800,
        type: 'spend',
        catName: 'Transportation',
        daysAgo: 4,
      },
      {
        description: 'Weekend Movie & Popcorn',
        amount: 1200,
        type: 'spend',
        catName: 'Entertainment',
        daysAgo: 2,
      },
      {
        description: 'Pharmacy & Wellness Vitamins',
        amount: 850,
        type: 'spend',
        catName: 'Healthcare',
        daysAgo: 1,
      },

      // Previous Month Transactions
      {
        description: 'Previous Month Salary',
        amount: 85000,
        type: 'earning',
        catName: 'Salary',
        daysAgo: 45,
      },
      {
        description: 'Quarterly Performance Bonus',
        amount: 15000,
        type: 'earning',
        catName: 'Bonus',
        daysAgo: 44,
      },
      {
        description: 'Apartment Monthly Rent',
        amount: 24000,
        type: 'spend',
        catName: 'Rent / Housing',
        daysAgo: 45,
      },
      {
        description: 'Supermarket Grocery Stock',
        amount: 6200,
        type: 'spend',
        catName: 'Groceries',
        daysAgo: 40,
      },
      {
        description: 'Weekend Dining & Cafes',
        amount: 4500,
        type: 'spend',
        catName: 'Food & Dining',
        daysAgo: 38,
      },
      {
        description: 'Flight tickets for conference',
        amount: 7800,
        type: 'spend',
        catName: 'Travel',
        daysAgo: 35,
      },
    ];

    for (const tx of sampleTxns) {
      const catId = getCat(tx.catName, tx.type) || userCategories[0].id;
      const txDate = new Date();
      txDate.setDate(txDate.getDate() - tx.daysAgo);

      await prisma.transaction.create({
        data: {
          userId: demoUser.id,
          categoryId: catId,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          transactionDate: txDate,
          currency: 'INR',
        },
      });
    }

    console.log('✅ Sample transactions created.');
  }

  // 4. Create sample budgets
  const foodCatId = getCat('Food & Dining', 'spend');
  const groceryCatId = getCat('Groceries', 'spend');
  const rentCatId = getCat('Rent / Housing', 'spend');

  if (foodCatId) {
    await prisma.budget.upsert({
      where: {
        userId_categoryId_period_month_year: {
          userId: demoUser.id,
          categoryId: foodCatId,
          period: 'monthly',
          month: currentMonth + 1,
          year: currentYear,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        categoryId: foodCatId,
        limitAmount: 6000,
        period: 'monthly',
        month: currentMonth + 1,
        year: currentYear,
        alertThreshold: 0.8,
      },
    });
  }

  if (groceryCatId) {
    await prisma.budget.upsert({
      where: {
        userId_categoryId_period_month_year: {
          userId: demoUser.id,
          categoryId: groceryCatId,
          period: 'monthly',
          month: currentMonth + 1,
          year: currentYear,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        categoryId: groceryCatId,
        limitAmount: 8000,
        period: 'monthly',
        month: currentMonth + 1,
        year: currentYear,
        alertThreshold: 0.8,
      },
    });
  }

  // 5. Create sample recurring rules
  if (rentCatId) {
    const existingRec = await prisma.recurringTransaction.findFirst({
      where: { userId: demoUser.id, description: 'Apartment Monthly Rent' },
    });
    if (!existingRec) {
      await prisma.recurringTransaction.create({
        data: {
          userId: demoUser.id,
          categoryId: rentCatId,
          type: 'spend',
          amount: 24000,
          description: 'Apartment Monthly Rent',
          frequency: 'monthly',
          startDate: new Date(),
          nextDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
    }
  }

  console.log('🎯 Database seed completed successfully!');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedCategoriesForUser, defaultSpendCategories, defaultEarningCategories };
