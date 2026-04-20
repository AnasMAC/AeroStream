import express from "express";
import * as Minio from 'minio'
import 'dotenv/config';

const port = process.env.PORT;

const app = express();

const minioClient = new Minio.Client({
  endPoint: '127.0.0.1',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
})



app.get('/',async  (req, res) => {
    try {
        const buckets = await minioClient.listBuckets()
        console.log('Success', buckets)
        const objectsList = [];
        const stream = minioClient.listObjects("test", '', true);

        // Wrap the stream consumption in a Promise
        await new Promise((resolve, reject) => {
            stream.on('data', (obj) => {
                objectsList.push(obj);
            });
            stream.on('error', (err) => {
                reject(err);
            });
            stream.on('end', () => {
                resolve();
            });
        });
        

        res.status(200).json(objectsList);
    } catch (err) {
        console.log(err.message)
    }
});

app.get('/:namefile',async (req, res)=>{
    const namefile =req.params.namefile;
    const expiryInSeconds = 24 * 60 * 60; 

        // Force the browser to treat it as an inline MP4 video
        const responseHeaders = {
            'response-content-type': 'video/mp4',
            'response-content-disposition': 'attachment' // 'inline' means play in browser. 'attachment' means download.
        };

        const presignedUrl = await minioClient.presignedGetObject(
            'test', 
            namefile, 
            expiryInSeconds,
            responseHeaders // <-- Pass the headers here
        );
    console.log(presignedUrl)
    res.status(200).json(presignedUrl)
})



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});