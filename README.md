# Cloud Video Streaming Platform (HLS & MinIO)

A scalable, cloud-native Video-on-Demand (VOD) streaming architecture built with Node.js, Express, PostgreSQL, MinIO, and NGINX.

This project demonstrates a production-grade approach to video delivery by bypassing traditional monolithic file serving. Instead, it utilizes **HTTP Live Streaming (HLS)**, chunking videos via FFmpeg, and serving them through an NGINX reverse proxy directly from a self-hosted MinIO object storage bucket.

⚠️ **Note on the Frontend:** The included React frontend (Video Gallery & Player) is strictly a **Proof of Concept (PoC)** designed to test and validate the backend streaming architecture and HLS.js integration. It is not intended as a fully styled production UI.

---

## 🛠️ Tech Stack

- **Storage:** MinIO (S3-Compatible Object Storage)
- **Proxy/CDN:** NGINX
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Video Processing:** FFmpeg
- **Frontend Test Harness:** React, HLS.js

---

## 📼 How to Add a New Video

Because this platform uses HLS streaming, you cannot simply upload a raw `.mp4` file. The video must be processed into smaller chunks (`.ts` segments) and a playlist (`.m3u8` manifest) before uploading.

Follow these steps to process and publish a new video to the platform.

### Step 1: Chunk the Video

Use the provided `chunkMaker.sh` bash script to process your raw video using FFmpeg. This script uses a "Stream Copy" method, meaning it chunks the video in milliseconds without heavy CPU transcoding (assuming the source is already H.264).

1. Place your raw video (e.g., `my_video.mp4`) in the same directory as the script.
2. Run the script:
   ```bash
   ./chunkMaker.sh my_video.mp4
   ```
