import { getDatabase } from './connection.js';

export const COLLECTIONS = {
  PRODUCTS: 'products',
  SYNC_LOGS: 'sync_logs',
  AI_SUMMARIES: 'ai_summaries',
  INSTALLATION_JOBS: 'installation_jobs',
};

// Ensure indexes for multi-tenant shop scoping
export async function ensureIndexes() {
  const db = await getDatabase();

  // Compound indexes for shop-scoped queries
  await db.collection(COLLECTIONS.PRODUCTS).createIndex(
    { shop: 1, shopify_product_id: 1 },
    { unique: true }
  );
  await db.collection(COLLECTIONS.AI_SUMMARIES).createIndex(
    { shop: 1, shopify_product_id: 1 },
    { unique: true }
  );
  await db.collection(COLLECTIONS.SYNC_LOGS).createIndex({ shop: 1, timestamp: -1 });
  await db.collection(COLLECTIONS.INSTALLATION_JOBS).createIndex({ shop_url: 1, created_at: -1 });

  // Migrate existing documents that lack a shop field
  const defaultShop = process.env.SHOP_CUSTOM_DOMAIN;
  if (defaultShop) {
    await db.collection(COLLECTIONS.PRODUCTS).updateMany(
      { shop: { $exists: false } },
      { $set: { shop: defaultShop } }
    );
    await db.collection(COLLECTIONS.AI_SUMMARIES).updateMany(
      { shop: { $exists: false } },
      { $set: { shop: defaultShop } }
    );
    await db.collection(COLLECTIONS.SYNC_LOGS).updateMany(
      { shop: { $exists: false } },
      { $set: { shop: defaultShop } }
    );
  }

  console.log('✅ MongoDB indexes ensured and migration complete');
}

export async function getProductsCollection() {
  const db = await getDatabase();
  return db.collection(COLLECTIONS.PRODUCTS);
}

export async function getSyncLogsCollection() {
  const db = await getDatabase();
  return db.collection(COLLECTIONS.SYNC_LOGS);
}

export async function insertProduct(productData) {
  const collection = await getProductsCollection();
  const result = await collection.insertOne(productData);
  return result;
}

export async function updateProduct(shopifyProductId, productData, shop) {
  const collection = await getProductsCollection();
  const result = await collection.updateOne(
    { shopify_product_id: shopifyProductId, shop },
    { $set: { ...productData, shop } },
    { upsert: true }
  );
  return result;
}

export async function getAllProducts(shop) {
  const collection = await getProductsCollection();
  const products = await collection.find({ shop }).toArray();
  return products;
}

export async function getProductById(shopifyProductId, shop) {
  const collection = await getProductsCollection();
  const filter = shop
    ? { shopify_product_id: shopifyProductId, shop }
    : { shopify_product_id: shopifyProductId };
  const product = await collection.findOne(filter);
  return product;
}

export async function deleteProduct(shopifyProductId, shop) {
  const collection = await getProductsCollection();
  const result = await collection.deleteOne({ shopify_product_id: shopifyProductId, shop });
  return result;
}

export async function logSync(syncData) {
  const collection = await getSyncLogsCollection();
  const result = await collection.insertOne({
    ...syncData,
    timestamp: new Date(),
  });
  return result;
}

export async function getAISummariesCollection() {
  const db = await getDatabase();
  return db.collection(COLLECTIONS.AI_SUMMARIES);
}

export async function saveAISummary(shopifyProductId, summaryData, shop) {
  const collection = await getAISummariesCollection();
  const result = await collection.updateOne(
    { shopify_product_id: shopifyProductId, shop },
    {
      $set: {
        ...summaryData,
        shop,
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );
  return result;
}

export async function getAISummary(shopifyProductId, shop) {
  const collection = await getAISummariesCollection();
  const filter = shop
    ? { shopify_product_id: shopifyProductId, shop }
    : { shopify_product_id: shopifyProductId };
  const summary = await collection.findOne(filter);
  return summary;
}

export async function getAllAISummaries(shop) {
  const collection = await getAISummariesCollection();
  const summaries = await collection.find({ shop }).toArray();
  return summaries;
}

export async function deleteAllAISummaries(shop) {
  const collection = await getAISummariesCollection();
  const result = await collection.deleteMany({ shop });
  return result;
}

export async function getInstallationJobsCollection() {
  const db = await getDatabase();
  return db.collection(COLLECTIONS.INSTALLATION_JOBS);
}

export async function createInstallationJob(jobData) {
  const collection = await getInstallationJobsCollection();
  const result = await collection.updateOne(
    { job_id: jobData.job_id },
    {
      $set: {
        ...jobData,
        updated_at: new Date(),
      },
      $setOnInsert: {
        created_at: new Date(),
      }
    },
    { upsert: true }
  );
  return result;
}

export async function updateJobStatus(jobId, updates) {
  const collection = await getInstallationJobsCollection();
  const result = await collection.updateOne(
    { job_id: jobId },
    {
      $set: {
        ...updates,
        updated_at: new Date(),
      },
    }
  );
  return result;
}

export async function getJobStatus(jobId) {
  const collection = await getInstallationJobsCollection();
  const job = await collection.findOne({ job_id: jobId });
  return job;
}

export async function getLatestInstallationJob(shopUrl) {
  const collection = await getInstallationJobsCollection();
  const job = await collection.findOne(
    { shop_url: shopUrl },
    { sort: { created_at: -1 } }
  );
  return job;
}
