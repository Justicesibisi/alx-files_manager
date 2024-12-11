import Bull from 'bull';
import { promises as fsPromises } from 'fs';
import path from 'path';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job, done) => {
  try {
    const { fileId, userId } = job.data;

    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    const file = await dbClient.database.collection('files').findOne({
      _id: new mongo.ObjectId(fileId),
      userId,
    });

    if (!file) throw new Error('File not found');

    const { localPath, name } = file;
    const sizes = [500, 250, 100];

    for (const size of sizes) {
      const thumbnail = await imageThumbnail(localPath, { width: size });
      const thumbnailPath = `${localPath}_${size}`;

      await fsPromises.writeFile(thumbnailPath, thumbnail);
    }

    done();
  } catch (error) {
    done(error);
  }
});
