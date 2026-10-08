import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import fs from 'fs';
import path from 'path';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    console.warn(`[Redis] Retrying connection (attempt ${times})...`);
    return Math.min(times * 50, 2000);
  }
});

connection.on('error', (err) => {
  console.error('[Redis Error] Connection failed. Is Redis running?');
});

export const storyQueue = new Queue('story-generation', { connection });

// Initialize queue progress tracking in memory (persisted via job progress)
export const jobStatusStore = new Map();

export async function addStoryJob(storyId, planData, settings) {
  const job = await storyQueue.add('generate-story', {
    storyId,
    planData,
    settings
  }, {
    jobId: storyId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
  jobStatusStore.set(storyId, { status: 'queued', progress: 0 });
  return job;
}

export function startWorker(generateLogicCallback) {
  const worker = new Worker('story-generation', async (job) => {
    const { storyId, planData, settings } = job.data;
    console.log(`[Worker] Started processing story: ${storyId}`);
    
    try {
      jobStatusStore.set(storyId, { status: 'processing', progress: 0 });
      
      // We inject the generation logic so we don't cause circular dependencies
      await generateLogicCallback(job, storyId, planData, settings, (progressData) => {
        job.updateProgress(progressData);
        jobStatusStore.set(storyId, { status: 'processing', ...progressData });
      });
      
      jobStatusStore.set(storyId, { status: 'completed', progress: 100 });
      console.log(`[Worker] Completed story: ${storyId}`);
    } catch (err) {
      console.error(`[Worker] Failed story: ${storyId}`, err);
      jobStatusStore.set(storyId, { status: 'failed', error: err.message });
      throw err;
    }
  }, { 
    connection,
    concurrency: 2 // Max 2 stories generated simultaneously to save RAM
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} has failed: ${err.message}`);
  });

  return worker;
}
