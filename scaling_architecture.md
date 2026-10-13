# Scaling StoryMaker for High Concurrency

When 100 users click "Generate Story" at the same exact time, the current architecture faces a few major bottlenecks:
1. **Google API Rate Limits (429 Errors)**: Google Cloud (Gemini & TTS) will block your server if it receives 100 massive generation requests in a single second.
2. **Server Memory/CPU**: Processing, downloading, and converting 100 images and audio files simultaneously can crash the Node.js server (Out of Memory).
3. **Connection Timeouts**: Browsers will timeout if they wait too long for a synchronous HTTP response.

To handle high pressure without losing requests, we need to transition from a **Synchronous** model to an **Asynchronous Queueing** model.

---

## 1. The Asynchronous Queue Architecture

Instead of generating the story immediately while the user's browser waits, the server should place the request in a line (a Queue) and process them one by one at a safe speed.

### How it works:
1. **User Clicks Generate**: The frontend sends the story details to the backend.
2. **Add to Queue**: The backend instantly saves the request to a Queue and returns a `jobId` (e.g., "Your story is position #5 in line").
3. **Background Worker**: A background process running on your server pulls jobs from the Queue at a controlled rate (e.g., strictly 3 stories at a time).
4. **Live Updates**: The frontend constantly asks the server `GET /api/status/:jobId` to update the loading bar (e.g., "Generating Slide 3...").

---

## 2. Options for Implementing the Queue

Depending on your server infrastructure (Plesk), you have two main paths:

### Option A: The "Lightweight" In-Memory Queue (Easiest to add right now)
We can use a Node.js library like `p-queue` or `fastq` to control concurrency inside your existing `server.js`.
* **Pros**: No extra database installations required. Works immediately on Plesk.
* **Cons**: If the Node.js server restarts or crashes, any stories currently waiting in the queue are lost.
* **How**: We set `concurrency: 3`. If 100 users click generate, 3 start immediately, and 97 wait in memory until a slot opens up.

### Option B: The "Enterprise" Redis Queue (BullMQ)
We install **Redis** on your server and use the **BullMQ** library to manage the queue.
* **Pros**: Rock-solid stability. If the server crashes, the queue is saved in Redis and automatically resumes when the server restarts. You can view a dashboard of all pending/failed jobs.
* **Cons**: Requires installing and running a Redis server on your Plesk VPS.

---

## 3. Handling Google API Limits (Exponential Backoff)

Even with a queue, Google might occasionally reject a request if it's too large. We need to implement **Exponential Backoff**:
* If Google replies with "Too Many Requests", the server should NOT fail the story.
* Instead, it waits 2 seconds and tries again.
* If it fails again, it waits 4 seconds, then 8 seconds, up to a maximum number of retries.

---

## 4. Disconnecting the Frontend

Currently, your frontend drives the generation (it asks for Slide 1, then asks for Slide 2). 
If the user's internet drops or they close the browser on Slide 3, the story stops generating forever.

**To fix this:**
The Backend must take full control of the generation loop. Once the user clicks "Generate", the Backend should loop through all slides internally and save them to the database. The frontend just acts as a "viewer" watching the progress.

---

## Next Steps

If you want to prepare the system for heavy traffic, I recommend we do this in stages:
1. **First**, we move the generation loop entirely to the backend so users can close their browser without breaking the generation.
2. **Second**, we implement an internal Queue (Option A) to limit Google API calls to a safe number (e.g., 3 at a time).
3. **Third**, we implement automatic retry logic (Exponential Backoff) for Google API failures.

Let me know if you would like me to start implementing this architectural upgrade!
