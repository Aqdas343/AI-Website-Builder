import 'dotenv/config';

// Validate critical environment variables (B15, B11)
const requiredEnv = ['JWT_SECRET', 'REDIS_URL', 'OPENAI_API_KEY', 'MONGO_URI'];
requiredEnv.forEach(env => {
  if (!process.env[env]) {
    console.error(`FATAL ERROR: ${env} is not defined in environment variables.`);
    process.exit(1);
  }
});

import app from './app.js';
import connectDB from './config/db.js';
import './workers/aiWorker.js';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    // Server started
  });
  
  // Set global server timeout to 10 minutes (B16)
  server.timeout = 10 * 60 * 1000;
});
