import Redis from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL;

const redisConnection = new Redis(redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
  console.error('Redis Connection Error:', err);
});

redisConnection.on('connect', () => {
  // Connected
});

export default redisConnection;
