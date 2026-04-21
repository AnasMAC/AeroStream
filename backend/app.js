import express from "express";
import * as Minio from 'minio';
import fs from "fs";
import path from 'path';
import { spawn } from 'child_process';
import multer from "multer";
import pg from 'pg'; // Import the pg library
import 'dotenv/config';

const { Pool } = pg;
const port = process.env.PORT;
const app = express();
console.log(process.env.USERNAME,process.env.DATABASE,process.env.PASSWORD)
// Database Configuration
const pool = new Pool({
  user: process.env.USERNAME,
  host: process.env.PGHOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PROT,
});

const minioClient = new Minio.Client({
  endPoint: process.env.MINIOHOST,
  port: process.env.MINIOPORT,
  useSSL: false,
  accessKey: process.env.ACCESSKEY,
  secretKey: process.env.SECRETKEY,
});

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const uploadMiddleware = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);




async function chunkVideo(inputFilePath) {
  return new Promise((resolve, reject) => {
    // Extract base name and directory
    // Example: inputFilePath = "uploads/12345-myvideo.mp4"
    const parsedPath = path.parse(inputFilePath);
    // 2. Log it SECOND
    console.log("path: ", parsedPath); 

    const basename = parsedPath.name; 
    console.log("basename: " + basename);

    const outputDir = path.join(parsedPath.dir, basename); 
    console.log("outputDir: " + outputDir);
    

    // Create the output directory for the chunks
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Starting HLS chunking for ${inputFilePath}...`);

    const ffmpegArgs = [
      '-i', inputFilePath,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-start_number', '0',
      '-hls_time', '5',
      '-hls_list_size', '0',
      '-hls_segment_filename', `${outputDir}/segment_%03d.ts`,
      '-f', 'hls',
      `${outputDir}/manifest.m3u8`
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`Chunking complete! Saved to ${outputDir}`);
        // Return the directory path so the Express route can use it
        resolve(outputDir); 
      } else {
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
  });
}

// 3. The Main Express Route
app.post('/upload', uploadMiddleware, async (req, res) => {
  try {
    console.log("hello")
    const title = req.body.title;
    const category = req.body.category;
    const thumbnailFile = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
    const videoFile = req.files['video'] ? req.files['video'][0] : null;

    if (!videoFile) {
      return res.status(400).json({ error: "Video file is required." });
    }

    console.log(`Received Video: ${title} (${category})`);
    if (thumbnailFile) console.log(`Thumbnail saved to: ${thumbnailFile.path}`);
    console.log(`Video saved to: ${videoFile.path}`);

    // --- HERE IS WHERE WE TRIGGER THE CHUNKING ---
    // The 'await' makes the Express route pause until FFmpeg is 100% done
    const chunkedDirectory = await chunkVideo(videoFile.path);

    const bucketName = "public-media"; // Name of your MinIO bucket
    // Create a safe folder name (e.g., "my-video-1691234567")
    const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const minioFolderName = `${safeTitle}-${Date.now()}`;

    // 3. Upload to MinIO
    await uploadHlsToMinio(chunkedDirectory, bucketName, minioFolderName);

    // 4. (Optional) Upload the thumbnail to MinIO too
    if (thumbnailFile) {
      const thumbExt = path.extname(thumbnailFile.originalname);
      await minioClient.fPutObject(
        bucketName, 
        `${minioFolderName}/thumbnail${thumbExt}`, 
        thumbnailFile.path, 
        { 'Content-Type': thumbnailFile.mimetype }
      );
    }

    // 5. CLEANUP: Delete the local files from the Node.js server to save space
    console.log("Cleaning up local files...");
    fs.rmSync(chunkedDirectory, { recursive: true, force: true });
    fs.unlinkSync(videoFile.path);
    if (thumbnailFile) fs.unlinkSync(thumbnailFile.path);

    // 6. Save to PostgreSQL Database (Optional, but recommended)
    // You have your 'pool' setup, you'd insert the title, category, and MinIO folder path here.
    
    await pool.query(
      'INSERT INTO videos (title, category, minio_path) VALUES ($1, $2, $3)',
      [title, category, minioFolderName]
    );
    

    // 7. Respond to the frontend
    res.status(200).json({ 
      message: "Upload, chunking, and MinIO sync successful!",
      streamUrl: `/${bucketName}/${minioFolderName}/manifest.m3u8` // How the frontend will find it
    });

  } catch (error) {
    console.error("Pipeline Error:", error);
    res.status(500).json({ error: "An error occurred during upload or chunking." });
  }
});

// Function to upload the chunked directory to MinIO
async function uploadHlsToMinio(localFolderPath, bucketName, minioFolderName) {
  try {
    // 1. Check if bucket exists, create if it doesn't
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1'); // 'us-east-1' is the default region
      console.log(`Created new MinIO bucket: ${bucketName}`);
      
      // Optional: If you want these videos to be publicly readable via your Nginx proxy, 
      // you need to set a public download policy on the bucket here.
    }

    // 2. Read all files (.m3u8 and .ts) in the directory
    const files = fs.readdirSync(localFolderPath);
    console.log(`Uploading ${files.length} HLS files to MinIO...`);

    // 3. Upload each file
    for (const file of files) {
      const filePath = path.join(localFolderPath, file);
      
      // We store it in a folder inside the bucket based on the video title or ID
      const objectName = `${minioFolderName}/${file}`; 

      // Set correct MIME types for HLS playback
      let contentType = 'application/octet-stream';
      if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
      else if (file.endsWith('.ts')) contentType = 'video/mp2t';

      const metaData = { 'Content-Type': contentType };

      // Upload to MinIO
      await minioClient.fPutObject(bucketName, objectName, filePath, metaData);
    }
    
    console.log(`Successfully uploaded ${minioFolderName} to MinIO!`);
  } catch (error) {
    console.error("Error uploading to MinIO:", error);
    throw error; // Re-throw so the Express route can catch it
  }
}

/**
 * GET ALL VIDEOS
 */
app.get('/videos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM videos ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Database error" });
    }
});

/**
 * GET VIDEOS BY CATEGORY
 */
app.get('/videos/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const result = await pool.query(
            'SELECT * FROM videos WHERE category = $1 ORDER BY created_at DESC', 
            [category]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Database error" });
    }
});

/**
 * GET SINGLE VIDEO BY ID
 */
app.get('/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Video not found" });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Database error" });
    }
});

//if we want to add download vedio


// app.get('api/download/:bucketName/:namefile', async (req, res) => {
//     try {
//         // Extract both the bucket name and the file name from the request parameters
//         const { bucketName, namefile } = req.params;
//         const expiryInSeconds = 24 * 60 * 60; 

//         // Force the browser to treat it as an inline MP4 video
//         const responseHeaders = {
//             'response-content-type': 'video/mp4',
//             'response-content-disposition': 'attachment'
//         };

//         // Generate the presigned URL using the dynamic bucketName
//         const presignedUrl = await minioClient.presignedGetObject(
//             bucketName, 
//             namefile, 
//             expiryInSeconds,
//             responseHeaders 
//         );
        
//         console.log(presignedUrl);
//         res.status(200).json(presignedUrl);

//     } catch (error) {
//         console.error("Error generating URL:", error.message);
//         res.status(500).json({ error: "Failed to generate download link" });
//     }
// });

app.post('/upload', uploadMiddleware, (req, res) => {
  try {
    // Text fields are populated in req.body
    const title = req.body.title;
    const category = req.body.category;

    // Files are populated in req.files
    // Note: req.files is an object where keys are the field names
    const thumbnailFile = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
    const videoFile = req.files['video'] ? req.files['video'][0] : null;

    if (!thumbnailFile || !videoFile) {
        return res.status(400).json({ error: "Both thumbnail and video are required." });
    }

    console.log(`Received Video: ${title} (${category})`);
    console.log(`Thumbnail saved to: ${thumbnailFile.path}`);
    console.log(`Video saved to: ${videoFile.path}`);

    res.status(200).json({ message: "Upload successful!" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong during upload." });
  }
});


app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});