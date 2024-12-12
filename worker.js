import Bull from 'bull';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

// Create a Bull queue for file processing
const fileQueue = new Bull('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 8000,
  },
});

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  // Find the file document in the database
  const fileDocument = await dbClient.db.collection('files').findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!fileDocument) {
    throw new Error('File not found');
  }

  const filePath = fileDocument.localPath;

  const sizes = [500, 250, 100];
  for (const size of sizes) {
    try {
      const options = { width: size };
      // eslint-disable-next-line no-await-in-loop
      const thumbnail = await imageThumbnail(filePath, options);
      const thumbnailPath = filePath.replace(/(\.[^.]*)$/, `_${size}$1`);
      fs.writeFileSync(thumbnailPath, thumbnail);
    } catch (error) {
      console.error(`Error generating thumbnail for size ${size}:`, error);
    }
  }
});

// Create a Bull queue for user processing
const userQueue = new Bull('userQueue', {
  redis: {
    host: '127.0.0.1',
    port: 8000,
  },
});

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  // Find the user document in the database
  const userDocument = await dbClient.db.collection('users').findOne({
    _id: ObjectId(userId),
  });

  if (!userDocument) {
    throw new Error('User not found');
  }

  console.log(`Welcome ${userDocument.email}!`);
});

export { fileQueue, userQueue };
