const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const dotenv = require('dotenv');
dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Upload an array of files to a specific "folder" (jobId) in S3
 * @param {string} jobId 
 * @param {Array<{name: string, content: string}>} files 
 */
async function uploadProjectToS3(jobId, files) {
    if (!BUCKET_NAME) {
        console.warn('AWS_S3_BUCKET not configured. Skipping S3 upload.');
        return;
    }

    const uploadPromises = files.map(file => {
        const params = {
            Bucket: BUCKET_NAME,
            Key: `projects/${jobId}/${file.name}`,
            Body: file.content,
            ContentType: getContentType(file.name)
        };
        return s3Client.send(new PutObjectCommand(params));
    });

    try {
        await Promise.all(uploadPromises);
        console.log(`[S3] Successfully uploaded ${files.length} files for job ${jobId}`);
    } catch (err) {
        console.error('[S3] Error uploading project:', err);
        throw err;
    }
}

/**
 * Fetch all files for a specific jobId from S3
 * @param {string} jobId 
 * @returns {Promise<Array<{name: string, content: string}>>}
 */
async function fetchProjectFromS3(jobId) {
    if (!BUCKET_NAME) throw new Error('AWS_S3_BUCKET not configured');

    try {
        const listParams = {
            Bucket: BUCKET_NAME,
            Prefix: `projects/${jobId}/`
        };

        const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return [];
        }

        const fetchPromises = listedObjects.Contents.map(async (obj) => {
            const fileName = obj.Key.replace(`projects/${jobId}/`, '');
            const getParams = {
                Bucket: BUCKET_NAME,
                Key: obj.Key
            };
            const response = await s3Client.send(new GetObjectCommand(getParams));
            const content = await response.Body.transformToString();
            return { name: fileName, content };
        });

        return await Promise.all(fetchPromises);
    } catch (err) {
        console.error('[S3] Error fetching project:', err);
        throw err;
    }
}

/**
 * Helper to get content type based on extension
 */
function getContentType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const map = {
        'js': 'application/javascript',
        'jsx': 'application/javascript',
        'ts': 'application/typescript',
        'tsx': 'application/typescript',
        'html': 'text/html',
        'css': 'text/css',
        'json': 'application/json',
        'md': 'text/markdown',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml'
    };
    return map[ext] || 'text/plain';
}

module.exports = {
    uploadProjectToS3,
    fetchProjectFromS3,
    s3Client
};
