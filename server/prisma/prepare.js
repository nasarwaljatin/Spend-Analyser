const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const prismaDir = __dirname;
const targetSchema = path.join(prismaDir, 'schema.prisma');

let sourceSchema = 'schema.sqlite.prisma';

if (dbUrl.startsWith('mongodb://') || dbUrl.startsWith('mongodb+srv://')) {
  sourceSchema = 'schema.mongodb.prisma';
  console.log('📦 Detected MongoDB DATABASE_URL -> Using schema.mongodb.prisma');
} else if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  sourceSchema = 'schema.postgresql.prisma';
  console.log('🐘 Detected PostgreSQL DATABASE_URL -> Using schema.postgresql.prisma');
} else {
  sourceSchema = 'schema.sqlite.prisma';
  console.log('📁 Detected SQLite/Local DATABASE_URL -> Using schema.sqlite.prisma');
}

const sourcePath = path.join(prismaDir, sourceSchema);
if (fs.existsSync(sourcePath)) {
  fs.copyFileSync(sourcePath, targetSchema);
  console.log(`✅ Synced active schema to ${sourceSchema}`);
} else {
  console.warn(`⚠️ Source schema ${sourceSchema} not found, keeping existing schema.prisma`);
}
