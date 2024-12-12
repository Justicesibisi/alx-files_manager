/* eslint-disable no-unused-vars */
import { Express } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import { authenticateUser } from '../middlewares/auth';
import { handleError } from '../helper/errorHandler';

const router = (api) => {
  // Status and Stats
  api.get('/status', AppController.getStatus);
  api.get('/stats', AppController.getStats);

  // Users
  api.post('/users', UsersController.postNew);
  api.get('/users/me', UsersController.getMe);

  // Authentication
  api.get('/connect', AuthController.getConnect);
  api.get('/disconnect', AuthController.getDisconnect);

  // Files
  api.post('/files', authenticateUser, FilesController.postUpload);
  api.get('/files/:id', authenticateUser, FilesController.getShow);
  api.get('/files', authenticateUser, FilesController.getIndex);
  api.get('/files/:id/data', FilesController.getFile);

  api.put('/files/:id/publish', authenticateUser, FilesController.putPublish);
  api.put('/files/:id/unpublish', authenticateUser, FilesController.putUnpublish);

  api.use(handleError);
};

export default router;
