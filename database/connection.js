import { MongoClient } from 'mongodb';

let client = null;
let db = null;
let indexesEnsured = false;

export async function connectToMongoDB() {
  if (db) {
    return db;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify_products';

    client = new MongoClient(uri);
    await client.connect();

    console.log('✓ Connected to MongoDB successfully');

    db = client.db();

    // Run index setup and migration once per server lifetime
    if (!indexesEnsured) {
      indexesEnsured = true;
      const { ensureIndexes } = await import('./collections.js');
      await ensureIndexes().catch(err => console.error('Index setup warning:', err.message));
    }

    return db;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    throw error;
  }
}

export async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✓ MongoDB connection closed');
  }
}

export async function getDatabase() {
  if (!db) {
    return await connectToMongoDB();
  }
  return db;
}
