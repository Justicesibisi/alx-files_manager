import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import fs from 'fs';
import dbClient from '../utils/db';
import { generateFilePath, saveFile } from '../helper/fileHelper';
import { handleError, errorMessages } from '../helper/errorHandler';
import fileQueue from '../worker';

export default class FilesController {
  static async postUpload(req, res) {
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    // Validate inputs
    if (!name) {
      return handleError(res, 400, errorMessages.missingName);
    }
    if (!['folder', 'file', 'image'].includes(type)) {
      return handleError(res, 400, errorMessages.missingType);
    }
    if (type !== 'folder' && !data) {
      return handleError(res, 400, errorMessages.missingData);
    }

    let parentFile = null;
    if (parentId) {
      parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return handleError(res, 400, errorMessages.parentNotFound);
      }
      if (parentFile.type !== 'folder') {
        return handleError(res, 400, errorMessages.parentNotFolder);
      }
    }

    const fileDocument = {
      userId: req.user._id,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
      localPath: '',
    };

    if (type === 'file' || type === 'image') {
      const filePath = generateFilePath(name);
      saveFile(filePath, data);
      fileDocument.localPath = filePath;
    }

    try {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      const fileId = result.insertedId;

      // If the file type is image, add a job to the queue for processing thumbnails
      if (type === 'image') {
        await fileQueue.add({
          userId: req.user._id,
          fileId,
        });
      }

      return res.status(201).json({ id: fileId, ...fileDocument });
    } catch (error) {
      return res.status(500).json({ error: 'Error saving the file' });
    }
  }

  static async getShow(req, res) {
    const userId = req.user._id;
    const fileId = req.params.id;

    try {
      const fileDocument = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      });

      if (!fileDocument) {
        return handleError(res, 404, errorMessages.notFound);
      }

      return res.status(200).json(fileDocument);
    } catch (error) {
      return handleError(res, 500, 'Error retrieving the file document');
    }
  }

  static async getIndex(req, res) {
    const userId = req.user._id;
    const { parentId = 0, page = 0 } = req.query;

    try {
      const files = await dbClient.db.collection('files').aggregate([
        { $match: { userId: ObjectId(userId), parentId: ObjectId(parentId) } },
        { $skip: parseInt(page, 10) * 20 },
        { $limit: 20 },
      ]).toArray();

      return res.status(200).json(files);
    } catch (error) {
      return handleError(res, 500, 'Error retrieving the file documents');
    }
  }

  static async putPublish(req, res) {
    const userId = req.user._id;
    const fileId = req.params.id;

    try {
      const fileDocument = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      });

      if (!fileDocument) {
        return handleError(res, 404, errorMessages.notFound);
      }

      fileDocument.isPublic = true;

      await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(fileId) },
        { $set: { isPublic: true } },
      );

      return res.status(200).json(fileDocument);
    } catch (error) {
      return handleError(res, 500, 'Error updating the file document');
    }
  }

  static async putUnpublish(req, res) {
    const userId = req.user._id;
    const fileId = req.params.id;

    try {
      const fileDocument = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      });

      if (!fileDocument) {
        return handleError(res, 404, errorMessages.notFound);
      }

      fileDocument.isPublic = false;

      await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(fileId) },
        { $set: { isPublic: false } },
      );

      return res.status(200).json(fileDocument);
    } catch (error) {
      return handleError(res, 500, 'Error updating the file document');
    }
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const userId = req.user ? req.user._id : null;
    const { size } = req.query;

    try {
      const fileDocument = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });

      if (!fileDocument) {
        return handleError(res, 404, errorMessages.notFound);
      }

      if (!fileDocument.isPublic && (!userId || !fileDocument.userId.equals(userId))) {
        return handleError(res, 404, errorMessages.notFound);
      }

      if (fileDocument.type === 'folder') {
        return handleError(res, 400, 'A folder doesn\'t have content');
      }

      let filePath = fileDocument.localPath;
      if (size && ['500', '250', '100'].includes(size)) {
        filePath = filePath.replace(/(\.[^.]*)$/, `_${size}$1`);
      }

      if (!fs.existsSync(filePath)) {
        return handleError(res, 404, errorMessages.notFound);
      }

      const mimeType = mime.lookup(fileDocument.name);
      if (!mimeType) {
        return handleError(res, 500, 'Error determining file MIME-type');
      }

      const fileContent = fs.readFileSync(filePath);

      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileContent);
    } catch (error) {
      return handleError(res, 500, 'Error retrieving the file content');
    }
  }
}