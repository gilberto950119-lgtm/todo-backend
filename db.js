const { MongoClient } = require('mongodb');

let client;
let db;

async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const dbName = process.env.MONGODB_DB || process.env.DB_NAME || 'todoapp';

  console.log(`[env] Mongo URI present: ${Boolean(uri)}, DB name: ${dbName}`);

  if (!uri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI environment variable.');
  }

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
  } catch (error) {
    console.error(`[MongoDB] connection failed: ${error.name}: ${error.message}`);
    if (error.code) {
      console.error(`[MongoDB] error code: ${error.code}`);
    }
    throw error;
  }

  db = client.db(dbName);
  console.log(`[MongoDB] connected (db: ${dbName})`);
  return db;
}

function getCollection(name) {
  if (!db) {
    throw new Error('Database is not connected yet. Call connectDB() first.');
  }
  return db.collection(name);
}

module.exports = { connectDB, getCollection };
