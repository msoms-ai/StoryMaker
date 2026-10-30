import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { generateStoryVideo } from './videoService.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let isRedisConnected = false;

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: false,
  enableOfflineQueue: true,
  connectTimeout: 5000,
  retryStrategy(times) {
    if (times > 5) {
      // Don't flood logs if redis isn't running
      return 5000;
    }
    return Math.min(times * 100, 2000);
  }
});

connection.on('ready', () => {
  isRedisConnected = true;
  console.log('[Redis] Connected and ready on', REDIS_URL);
});

connection.on('error', (err) => {
  isRedisConnected = false;
  console.warn('[Redis] Connection warning: Redis unavailable or reconnecting. Fallback worker active.');
});

export const storyQueue = new Queue('story-generation', { connection });
export const videoQueue = new Queue('story-video-generation', { connection });

// Initialize queue progress tracking in memory (persisted via job progress)
export const jobStatusStore = new Map();
export const jobVideoStatusStore = new Map();

let registeredWorkerCallback = null;

// In-process fallback queue if Redis is not running or temporarily down
const localJobQueue = [];
let localWorkerRunning = 0;
const MAX_LOCAL_CONCURRENCY = 2;

async function processLocalQueue() {
  if (localWorkerRunning >= MAX_LOCAL_CONCURRENCY || localJobQueue.length === 0) return;
  if (!registeredWorkerCallback) return;

  const nextJob = localJobQueue.shift();
  if (!nextJob) return;

  localWorkerRunning++;
  const { storyId, folderName, planData, settings } = nextJob;
  console.log(`[Local Fallback Worker] Processing story: ${storyId} (${folderName})`);

  try {
    const updateProgress = (progressData) => {
      const payload = { status: 'processing', ...progressData };
      jobStatusStore.set(storyId, payload);
      jobStatusStore.set(folderName, payload);
    };

    updateProgress({ progress: 5, stage: 'text', slideIndex: 0 });

    const fakeJob = {
      data: { storyId, folderName, planData, settings },
      updateProgress
    };

    const createdStory = await registeredWorkerCallback(fakeJob, folderName, planData, settings, updateProgress);
    
    const completedPayload = { status: 'completed', progress: 100, story: createdStory, stage: 'finalize' };
    jobStatusStore.set(storyId, completedPayload);
    jobStatusStore.set(folderName, completedPayload);
    console.log(`[Local Fallback Worker] Completed story: ${storyId}`);
  } catch (err) {
    console.error(`[Local Fallback Worker] Failed story: ${storyId}:`, err);
    const failedPayload = { status: 'failed', error: err.message };
    jobStatusStore.set(storyId, failedPayload);
    jobStatusStore.set(folderName, failedPayload);
  } finally {
    localWorkerRunning--;
    setImmediate(processLocalQueue);
  }
}

export async function addStoryJob(storyId, folderName, planData, settings) {
  // Store initial queued state under both clean storyId and folderName
  const initialStatus = { status: 'queued', progress: 0, stage: 'text', storyId, folderName };
  jobStatusStore.set(storyId, initialStatus);
  jobStatusStore.set(folderName, initialStatus);

  // If Redis is connected, add to BullMQ queue
  if (isRedisConnected) {
    try {
      // Use clean alphanumeric ID for Redis BullMQ jobId (e.g. storyId '69132')
      const cleanJobId = String(storyId).replace(/[^a-zA-Z0-9_-]/g, '') || `job_${Date.now()}`;
      const job = await storyQueue.add('generate-story', {
        storyId,
        folderName,
        planData,
        settings
      }, {
        jobId: cleanJobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 24 * 3600, count: 500 },
        removeOnFail: { age: 7 * 24 * 3600 }
      });
      return job;
    } catch (err) {
      console.warn('[Queue] BullMQ add failed, falling back to local worker queue:', err?.message || err);
    }
  }

  // Fallback: Queue directly in local in-memory worker
  console.log(`[Queue] Adding ${storyId} to in-process background worker queue.`);
  localJobQueue.push({ storyId, folderName, planData, settings });
  setImmediate(processLocalQueue);
  return { id: storyId };
}

export function startWorker(generateLogicCallback) {
  registeredWorkerCallback = generateLogicCallback;

  // Start BullMQ Worker
  const worker = new Worker('story-generation', async (job) => {
    const { storyId, folderName, planData, settings } = job.data;
    const activeTarget = folderName || storyId;
    console.log(`[Worker] Started processing story: ${storyId} (${activeTarget})`);
    
    try {
      const updateProgress = (progressData) => {
        job.updateProgress(progressData);
        const payload = { status: 'processing', ...progressData };
        jobStatusStore.set(storyId, payload);
        if (folderName) jobStatusStore.set(folderName, payload);
      };

      updateProgress({ progress: 5, stage: 'text', slideIndex: 0 });
      
      const createdStory = await generateLogicCallback(job, activeTarget, planData, settings, updateProgress);
      
      const completedPayload = { status: 'completed', progress: 100, story: createdStory, stage: 'finalize' };
      jobStatusStore.set(storyId, completedPayload);
      if (folderName) jobStatusStore.set(folderName, completedPayload);
      
      console.log(`[Worker] Completed story: ${storyId}`);
      return createdStory;
    } catch (err) {
      console.error(`[Worker] Failed story: ${storyId}`, err);
      const failedPayload = { status: 'failed', error: err.message };
      jobStatusStore.set(storyId, failedPayload);
      if (folderName) jobStatusStore.set(folderName, failedPayload);
      throw err;
    }
  }, { 
    connection,
    concurrency: 2,
    lockDuration: 300000,
    stalledInterval: 30000,
    maxStalledCount: 3
  });

  worker.on('completed', (job, returnvalue) => {
    console.log(`[Worker] Job ${job?.id} completed successfully.`);
    const sId = job?.data?.storyId;
    const fName = job?.data?.folderName;
    const payload = { status: 'completed', progress: 100, story: returnvalue, stage: 'finalize' };
    if (sId) jobStatusStore.set(sId, payload);
    if (fName) jobStatusStore.set(fName, payload);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} has failed: ${err.message}`);
    const sId = job?.data?.storyId;
    const fName = job?.data?.folderName;
    const payload = { status: 'failed', error: err.message };
    if (sId) jobStatusStore.set(sId, payload);
    if (fName) jobStatusStore.set(fName, payload);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} was detected stalled after restart and will be reprocessed.`);
  });

  worker.on('error', (err) => {
    console.warn(`[Worker] Worker redis connection notice:`, err?.message || err);
  });

  // Re-sync pending or active jobs from Redis on startup
  storyQueue.getJobs(['active', 'waiting', 'delayed']).then(jobs => {
    if (jobs && jobs.length > 0) {
      console.log(`[Queue Recovery] Recovered ${jobs.length} active/pending jobs from Redis.`);
      for (const j of jobs) {
        const sId = j.data?.storyId || j.id;
        const fName = j.data?.folderName;
        if (sId && !jobStatusStore.has(sId)) {
          const progressVal = typeof j.progress === 'number' ? j.progress : (j.progress?.progress || 0);
          const stageVal = (j.progress && typeof j.progress === 'object' && j.progress.stage) ? j.progress.stage : 'text';
          const payload = {
            status: 'processing',
            progress: progressVal,
            stage: stageVal
          };
          jobStatusStore.set(sId, payload);
          if (fName) jobStatusStore.set(fName, payload);
        }
      }
    }
  }).catch(err => {
    // Redis might be offline on startup
  });

  // BullMQ Video Generation Worker
  try {
    const videoWorker = new Worker('story-video-generation', async (job) => {
      const { story, storiesDir } = job.data;
      const storyId = story.id || story.folderName;
      console.log(`[BullMQ Video Worker] Rendering story video for: ${storyId}`);

      const updateProgress = (progress, stage) => {
        job.updateProgress({ progress, stage });
        const payload = { status: 'processing', progress, stage, storyId };
        jobVideoStatusStore.set(storyId, payload);
        if (story.folderName) jobVideoStatusStore.set(story.folderName, payload);
      };

      updateProgress(5, 'Starting video rendering...');
      const videoUrl = await generateStoryVideo({ story, storiesDir, onProgress: updateProgress });

      // Save videoUrl to database
      try {
        const dbFile = path.join(storiesDir, 'database.json');
        if (fs.existsSync(dbFile)) {
          const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
          const dbStory = (db.stories || []).find(s => s.id === story.id || s.folderName === story.folderName);
          if (dbStory) {
            dbStory.videoUrl = videoUrl;
            fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
          }
        }
      } catch (e) {}

      return videoUrl;
    }, { connection, concurrency: 1, lockDuration: 600000 });

    videoWorker.on('completed', (job, returnvalue) => {
      const sId = job?.data?.story?.id || job?.data?.story?.folderName;
      const fName = job?.data?.story?.folderName;
      const payload = { status: 'completed', progress: 100, stage: 'done', videoUrl: returnvalue };
      if (sId) jobVideoStatusStore.set(sId, payload);
      if (fName) jobVideoStatusStore.set(fName, payload);
      console.log(`[BullMQ Video Worker] Video completed for ${sId}: ${returnvalue}`);
    });

    videoWorker.on('failed', (job, err) => {
      const sId = job?.data?.story?.id || job?.data?.story?.folderName;
      const fName = job?.data?.story?.folderName;
      const payload = { status: 'failed', error: err.message };
      if (sId) jobVideoStatusStore.set(sId, payload);
      if (fName) jobVideoStatusStore.set(fName, payload);
      console.error(`[BullMQ Video Worker] Video failed for ${sId}:`, err.message);
    });
  } catch (err) {
    console.warn('[Queue] Video worker init notice:', err.message);
  }

  return worker;
}

export async function getStoryJobStatus(queryId) {
  if (!queryId) return { success: false, message: 'Invalid query ID' };

  // 1. Direct check in jobStatusStore
  if (jobStatusStore.has(queryId)) {
    return { success: true, ...jobStatusStore.get(queryId) };
  }

  // 2. Fuzzy match in jobStatusStore (handles ID vs FolderName vs [ID#123] differences)
  for (const [key, val] of jobStatusStore.entries()) {
    if (
      key === queryId || 
      key.includes(queryId) || 
      queryId.includes(key) ||
      (val.storyId && (val.storyId === queryId || queryId.includes(val.storyId))) ||
      (val.folderName && (val.folderName === queryId || queryId.includes(val.folderName)))
    ) {
      return { success: true, ...val };
    }
  }

  // 3. Query Redis BullMQ if available
  if (isRedisConnected) {
    try {
      const cleanJobId = String(queryId).replace(/[^a-zA-Z0-9_-]/g, '');
      let job = await storyQueue.getJob(cleanJobId);
      if (!job) {
        const jobs = await storyQueue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed']);
        job = jobs.find(j => 
          j.id === queryId || 
          j.id === cleanJobId ||
          j.data?.storyId === queryId || 
          j.data?.folderName === queryId ||
          (typeof j.id === 'string' && j.id.includes(queryId))
        );
      }

      if (job) {
        const state = await job.getState();
        if (state === 'completed') {
          const result = { success: true, status: 'completed', progress: 100, story: job.returnvalue, stage: 'finalize' };
          jobStatusStore.set(queryId, result);
          return result;
        }
        if (state === 'failed') {
          const result = { success: true, status: 'failed', error: job.failedReason };
          jobStatusStore.set(queryId, result);
          return result;
        }
        if (state === 'active' || state === 'waiting' || state === 'delayed') {
          const progressVal = typeof job.progress === 'number' ? job.progress : (job.progress?.progress || 0);
          const stageVal = (job.progress && typeof job.progress === 'object' && job.progress.stage) ? job.progress.stage : 'image';
          const extra = (job.progress && typeof job.progress === 'object') ? job.progress : {};
          const result = {
            success: true,
            status: 'processing',
            ...extra,
            progress: progressVal,
            stage: stageVal
          };
          jobStatusStore.set(queryId, result);
          return result;
        }
      }
    } catch (err) {
      console.warn(`[Queue] Error querying job ${queryId} from Redis:`, err?.message || err);
    }
  }

  // 4. Fallback: Check STORIES/database.json to see if story completed and saved to disk
  try {
    const dbFile = path.join(process.cwd(), 'STORIES', 'database.json');
    if (fs.existsSync(dbFile)) {
      const raw = fs.readFileSync(dbFile, 'utf-8');
      const db = JSON.parse(raw);
      const dbStory = (db.stories || []).find(s => 
        s.id === queryId || 
        s.folderName === queryId || 
        (s.folderName && s.folderName.includes(queryId)) ||
        (s.id && queryId.includes(s.id))
      );
      if (dbStory) {
        const result = { success: true, status: 'completed', progress: 100, story: dbStory, stage: 'finalize' };
        jobStatusStore.set(queryId, result);
        return result;
      }
    }
  } catch (err) {
    console.warn(`[Queue] Error reading database for story ${queryId}:`, err?.message || err);
  }

  return { success: false, message: 'Job not found' };
}

// -------------------------------------------------------------
// VIDEO GENERATION QUEUE & LOCAL WORKERS
// -------------------------------------------------------------
const localVideoJobQueue = [];
let localVideoWorkerRunning = 0;

async function processLocalVideoQueue() {
  if (localVideoWorkerRunning >= 1 || localVideoJobQueue.length === 0) return;
  const nextJob = localVideoJobQueue.shift();
  if (!nextJob) return;

  localVideoWorkerRunning++;
  const { story, storiesDir } = nextJob;
  const storyId = story.id || story.folderName;
  console.log(`[Local Video Worker] Rendering story video for: ${storyId}`);

  try {
    const updateProgress = (progress, stage) => {
      const payload = { status: 'processing', progress, stage, storyId };
      jobVideoStatusStore.set(storyId, payload);
      if (story.folderName) jobVideoStatusStore.set(story.folderName, payload);
    };

    updateProgress(5, 'Starting video rendering...');
    const videoUrl = await generateStoryVideo({ story, storiesDir, onProgress: updateProgress });

    // Update story record in database.json
    try {
      const dbFile = path.join(storiesDir, 'database.json');
      if (fs.existsSync(dbFile)) {
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        const dbStory = (db.stories || []).find(s => s.id === story.id || s.folderName === story.folderName);
        if (dbStory) {
          dbStory.videoUrl = videoUrl;
          fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
        }
      }
    } catch (e) {
      console.warn('[Video Queue] DB update notice:', e.message);
    }

    const completedPayload = { status: 'completed', progress: 100, stage: 'done', videoUrl };
    jobVideoStatusStore.set(storyId, completedPayload);
    if (story.folderName) jobVideoStatusStore.set(story.folderName, completedPayload);
    console.log(`[Local Video Worker] Completed video for ${storyId}: ${videoUrl}`);
  } catch (err) {
    console.error(`[Local Video Worker] Failed video for story ${storyId}:`, err);
    const failedPayload = { status: 'failed', error: err.message };
    jobVideoStatusStore.set(storyId, failedPayload);
    if (story.folderName) jobVideoStatusStore.set(story.folderName, failedPayload);
  } finally {
    localVideoWorkerRunning--;
    setImmediate(processLocalVideoQueue);
  }
}

export async function addVideoJob(story, storiesDir) {
  const storyId = story.id || story.folderName;
  const initialStatus = { status: 'queued', progress: 0, stage: 'Queued for video rendering...', storyId };
  jobVideoStatusStore.set(storyId, initialStatus);
  if (story.folderName) jobVideoStatusStore.set(story.folderName, initialStatus);

  if (isRedisConnected) {
    try {
      const cleanJobId = `video_${String(storyId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
      await videoQueue.add('generate-video', { story, storiesDir }, {
        jobId: cleanJobId,
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 2
      });
      return { success: true, queued: true, type: 'bullmq', jobId: cleanJobId };
    } catch (err) {
      console.warn('[Queue] Failed adding video job to Redis, using local fallback:', err.message);
    }
  }

  localVideoJobQueue.push({ story, storiesDir });
  setImmediate(processLocalVideoQueue);
  return { success: true, queued: true, type: 'local', jobId: storyId };
}

export async function getVideoJobStatus(queryId, storiesDir) {
  if (!queryId) return { success: false, message: 'Invalid query ID' };

  // 1. Direct check in jobVideoStatusStore
  if (jobVideoStatusStore.has(queryId)) {
    return { success: true, ...jobVideoStatusStore.get(queryId) };
  }

  // 2. Fuzzy match in jobVideoStatusStore
  for (const [key, val] of jobVideoStatusStore.entries()) {
    if (key === queryId || key.includes(queryId) || queryId.includes(key)) {
      return { success: true, ...val };
    }
  }

  // 3. Check STORIES/database.json or video file on disk
  try {
    const sDir = storiesDir || path.join(process.cwd(), 'STORIES');
    const dbFile = path.join(sDir, 'database.json');
    if (fs.existsSync(dbFile)) {
      const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      const dbStory = (db.stories || []).find(s => 
        s.id === queryId || 
        s.folderName === queryId || 
        (s.folderName && s.folderName.includes(queryId)) ||
        (s.id && queryId.includes(s.id))
      );
      if (dbStory) {
        // Check if video file actually exists on disk
        const videoDiskPath = path.join(sDir, dbStory.folderName, 'story_video.mp4');
        if (fs.existsSync(videoDiskPath) && fs.statSync(videoDiskPath).size > 1000) {
          const videoUrl = dbStory.videoUrl || `/STORIES/${encodeURIComponent(dbStory.folderName)}/story_video.mp4`;
          const result = { success: true, status: 'completed', progress: 100, videoUrl };
          jobVideoStatusStore.set(queryId, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn(`[Video Queue] Error reading database for story ${queryId}:`, err?.message || err);
  }

  return { success: false, status: 'idle', message: 'No video generation active' };
}
