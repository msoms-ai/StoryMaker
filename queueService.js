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
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 3600, count: 500 }, // Keep in Redis so returnvalue and status are queryable
    removeOnFail: { age: 7 * 24 * 3600 }
  });
  jobStatusStore.set(storyId, { status: 'queued', progress: 0 });
  return job;
}

export function startWorker(generateLogicCallback) {
  const worker = new Worker('story-generation', async (job) => {
    const { storyId, planData, settings } = job.data;
    console.log(`[Worker] Started processing story: ${storyId}`);
    
    try {
      jobStatusStore.set(storyId, { status: 'processing', progress: 0, stage: 'Starting...' });
      
      // We inject the generation logic so we don't cause circular dependencies
      const createdStory = await generateLogicCallback(job, storyId, planData, settings, (progressData) => {
        job.updateProgress(progressData);
        jobStatusStore.set(storyId, { status: 'processing', ...progressData });
      });
      
      jobStatusStore.set(storyId, { status: 'completed', progress: 100, story: createdStory });
      console.log(`[Worker] Completed story: ${storyId}`);
      return createdStory;
    } catch (err) {
      console.error(`[Worker] Failed story: ${storyId}`, err);
      jobStatusStore.set(storyId, { status: 'failed', error: err.message });
      throw err;
    }
  }, { 
    connection,
    concurrency: 2, // Max 2 stories generated simultaneously to save RAM
    lockDuration: 300000, // 5 min lock duration for long-running story generations
    stalledInterval: 30000, // Check for stalled jobs every 30s (e.g. after server restart)
    maxStalledCount: 3
  });

  worker.on('completed', (job, returnvalue) => {
    console.log(`[Worker] Job ${job?.id} completed successfully.`);
    if (job?.data?.storyId) {
      jobStatusStore.set(job.data.storyId, { status: 'completed', progress: 100, story: returnvalue });
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} has failed: ${err.message}`);
    if (job?.data?.storyId) {
      jobStatusStore.set(job.data.storyId, { status: 'failed', error: err.message });
    }
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} was detected stalled after restart and will be reprocessed.`);
  });

  worker.on('error', (err) => {
    console.error(`[Worker] Worker error:`, err);
  });

  // Re-sync pending or active jobs from Redis into jobStatusStore on restart
  storyQueue.getJobs(['active', 'waiting', 'delayed']).then(jobs => {
    if (jobs && jobs.length > 0) {
      console.log(`[Queue Recovery] Recovered ${jobs.length} active/pending jobs from Redis.`);
      for (const j of jobs) {
        const sId = j.data?.storyId || j.id;
        if (sId && !jobStatusStore.has(sId)) {
          const progressVal = typeof j.progress === 'number' ? j.progress : (j.progress?.progress || 0);
          jobStatusStore.set(sId, {
            status: 'processing',
            progress: progressVal,
            stage: 'Processing in Queue (Recovered)...'
          });
        }
      }
    }
  }).catch(err => {
    console.warn('[Queue Recovery] Could not query existing jobs on worker startup:', err?.message || err);
  });

  return worker;
}

export async function getStoryJobStatus(storyId) {
  // 1. First check in-memory jobStatusStore
  const inMemoryStatus = jobStatusStore.get(storyId);
  if (inMemoryStatus) {
    return { success: true, ...inMemoryStatus };
  }

  // 2. If not found or if the server restarted, query BullMQ from Redis
  try {
    let job = await storyQueue.getJob(storyId);
    if (!job) {
      // Check if job exists in Redis by searching matching ID
      const jobs = await storyQueue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed']);
      job = jobs.find(j => j.id === storyId || j.data?.storyId === storyId || (typeof j.id === 'string' && j.id.includes(storyId)));
    }

    if (job) {
      const state = await job.getState();
      if (state === 'completed') {
        const result = { success: true, status: 'completed', progress: 100, story: job.returnvalue };
        jobStatusStore.set(storyId, { status: 'completed', progress: 100, story: job.returnvalue });
        return result;
      }
      if (state === 'failed') {
        const result = { success: true, status: 'failed', error: job.failedReason };
        jobStatusStore.set(storyId, { status: 'failed', error: job.failedReason });
        return result;
      }
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        const progressVal = typeof job.progress === 'number' ? job.progress : (job.progress?.progress || 0);
        const stageVal = (job.progress && typeof job.progress === 'object' && job.progress.stage) ? job.progress.stage : 'Processing in Queue...';
        const extra = (job.progress && typeof job.progress === 'object') ? job.progress : {};
        const result = {
          success: true,
          status: 'processing',
          ...extra,
          progress: progressVal,
          stage: stageVal
        };
        jobStatusStore.set(storyId, result);
        return result;
      }
    }
  } catch (err) {
    console.error(`[Queue] Error querying job ${storyId} from Redis:`, err);
  }

  // 3. If neither exists, check the database (database.json) to see if the story already finished and was saved!
  try {
    const dbFile = path.join(process.cwd(), 'STORIES', 'database.json');
    if (fs.existsSync(dbFile)) {
      const raw = fs.readFileSync(dbFile, 'utf-8');
      const db = JSON.parse(raw);
      const dbStory = (db.stories || []).find(s => 
        s.folderName === storyId || 
        s.id === storyId || 
        (s.folderName && s.folderName.includes(storyId)) ||
        (typeof storyId === 'string' && storyId.includes(s.folderName))
      );
      if (dbStory) {
        jobStatusStore.set(storyId, { status: 'completed', progress: 100, story: dbStory });
        return { success: true, status: 'completed', progress: 100, story: dbStory };
      }
    }
  } catch (err) {
    console.error(`[Queue] Error reading database for story ${storyId}:`, err);
  }

  return { success: false, message: 'Job not found' };
}
