import { Queue } from 'bullmq';
import connection from '../config/redis.js';

const websiteQueue = new Queue('website-generation', { connection });

export async function addGenerationJob(data) {
  const job = await websiteQueue.add('generate', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  });
  return job;
}

export default websiteQueue;
