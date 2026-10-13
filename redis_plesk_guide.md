# Step-by-Step Guide: Installing Redis on Plesk

To power our new scalable Queue System, your server needs **Redis**. Redis is an incredibly fast, in-memory database used by the world's biggest apps for background jobs.

Here is exactly how to install it on your Plesk VPS.

## Method 1: Using the Docker Extension (Recommended & Easiest)
This is the safest method as it keeps Redis isolated.

1. **Log in to your Plesk Panel** as Administrator.
2. In the left-hand menu, click on **Extensions**.
3. Search for **Docker** and install the free Docker extension (if it isn't already installed).
4. Once installed, go to **Docker** in the left menu.
5. Click **Docker Image Catalog**.
6. Search for `redis` and click **Run** (or "Run (local)" on the official `redis` image).
7. In the settings window that pops up:
   - Uncheck "Automatic port mapping".
   - Set the internal port `6379` to map to external port `6379`.
   - Make sure "Start after reboot" is checked.
   - Click **OK / Run**.
8. Redis is now running locally on port `6379`!

## Method 2: Using SSH (The Traditional Way)
If you prefer not to use Docker, you can install Redis directly onto your Ubuntu/Debian OS via SSH.

1. Open your terminal (or Plesk SSH terminal) and connect to your server.
2. Run the following command to update your package list:
   ```bash
   sudo apt-get update
   ```
3. Install the Redis server:
   ```bash
   sudo apt-get install redis-server -y
   ```
4. Start Redis and enable it to start automatically if the server reboots:
   ```bash
   sudo systemctl enable redis-server.service
   sudo systemctl start redis-server.service
   ```
5. You can verify it is running by typing `redis-cli ping`. It should reply with `PONG`.

---

## Next Steps
While you follow these steps to get Redis running, I have already created the `v1.2` git branch and am actively rewriting the backend code to use the BullMQ queue system.

Once you have Redis running (either via Docker or SSH), let me know and I will push the new backend logic!
