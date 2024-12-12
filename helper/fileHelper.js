import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

export const generateFilePath = (fileName) => {
  const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
  if (!fs.existsSync(FOLDER_PATH)) {
    fs.mkdirSync(FOLDER_PATH, { recursive: true });
  }
  return path.join(FOLDER_PATH, `${uuidv4()}-${fileName}`);
};

export const saveFile = (filePath, data) => {
  const buffer = Buffer.from(data, 'base64');
  fs.writeFileSync(filePath, buffer);
};
