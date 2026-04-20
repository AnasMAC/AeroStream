import express from "express";
import * as Minio from 'minio';
import pg from 'pg'; // Import the pg library
import 'dotenv/config';

const { Pool } = pg;
const port = process.env.PORT;
const app = express();
console.log(process.env.USERNAME,process.env.DATABASE,process.env.PASSWORD)
// Database Configuration
const pool = new Pool({
  user: process.env.USERNAME,
  host: '127.0.0.1',
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: 5432,
});

const minioClient = new Minio.Client({
  endPoint: '127.0.0.1',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
});

// --- NEW ROUTES ---

/**
 * GET ALL VIDEOS
 */
app.get('/api/videos', async (req, res) => {
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
app.get('/api/videos/category/:category', async (req, res) => {
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
app.get('/api/videos/:id', async (req, res) => {
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

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});