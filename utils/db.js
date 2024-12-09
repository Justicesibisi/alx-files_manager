// utils/db.js

import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    this.uri = `mongodb://${host}:${port}/${database}`;
    this.client = new MongoClient(this.uri, { useUnifiedTopology: true });
    this.client.connect()
      .then(() => console.log('Connected to MongoDB'))
      .catch((err) => console.error('MongoDB connection error:', err));
  }

  // Checks if the connection to MongoDB is alive
  isAlive() {
    return this.client.isConnected();
  }

  // Asynchronous method to get the number of users in the "users" collection
  async nbUsers() {
    const db = this.client.db();
    const collection = db.collection('users');
    return await collection.countDocuments();
  }

  // Asynchronous method to get the number of files in the "files" collection
  async nbFiles() {
    const db = this.client.db();
    const collection = db.collection('files');
    return await collection.countDocuments();
  }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
export default dbClient;
