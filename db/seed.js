import { initDatabase } from './init.js';

console.log('🚀 Initializing database...');
initDatabase()
  .then(() => {
    console.log('✅ Database initialized. Ready to start the app...');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed to initialize:', err.message);
    process.exit(1);
  });
