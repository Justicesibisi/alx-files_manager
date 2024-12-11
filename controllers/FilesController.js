import mongo from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, promises as fsPromises } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import mime from 'mime-types';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fileQueue = new Bull('fileQueue');

export default class FilesController {
  static async postUpload(request, response) {
    try {
      const verification = await FilesController.verification(request.body, response);
      if (verification === 'passed') {
        const usrId = await redisClient.get(`auth_${request.get('X-Token')}`);
        if (!usrId) {
          return response.status(401).json({ error: 'Unauthorized' });
        }

        const file = {
          name: request.body.name,
          type: request.body.type,
          userId: mongo.ObjectID(usrId),
          parentId: request.body.parentId ? mongo.ObjectID(request.body.parentId) : 0,
          isPublic: request.body.isPublic || false,
        };

        if (file.type !== 'folder') {
          const fileName = uuidv4();
          const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
          file.localPath = `${folderPath}/${fileName}`;

          const decodedData = Buffer.from(request.body.data, 'base64').toString('utf-8');
          await writeFile(file.localPath, decodedData);
        }

        const result = await dbClient.database.collection('files').insertOne(file);
        const savedFile = {
          id: result.insertedId,
          userId: file.userId,
          name: file.name,
          type: file.type,
          isPublic: file.isPublic,
          parentId: file.parentId,
        };

        if (file.type === 'image') {
          fileQueue.add({
            userId: usrId,
            fileId: result.insertedId,
          });
        }

        return response.status(201).json(savedFile);
      }
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verification(data, response) {
    if (!data.name) {
      response.status(400).json({ error: 'Missing name' });
      return 'failed';
    }

    if (!data.type || !['folder', 'file', 'image'].includes(data.type)) {
      response.status(400).json({ error: 'Missing or invalid type' });
      return 'failed';
    }

    if (data.type !== 'folder' && !data.data) {
      response.status(400).json({ error: 'Missing data' });
      return 'failed';
    }

    if (data.parentId) {
      try {
        const parentFile = await dbClient.database.collection('files').findOne({ _id: mongo.ObjectID(data.parentId) });
        if (!parentFile) {
          response.status(400).json({ error: 'Parent not found' });
          return 'failed';
        }
        if (parentFile.type !== 'folder') {
          response.status(400).json({ error: 'Parent is not a folder' });
          return 'failed';
        }
      } catch (error) {
        response.status(400).json({ error: 'Invalid parentId' });
        return 'failed';
      }
    }

    return 'passed';
  }

  // Other methods...
}
