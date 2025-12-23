import { getDatabase } from './connection.js';

export const COLLECTIONS = {
  PRODUCTS: 'products',
  SYNC_LOGS: 'sync_logs',
  AI_SUMMARIES: 'ai_summaries',
  INSTALLATION_JOBS: 'installation_jobs',
};

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

export async function updateProduct(shopifyProductId, productData) {
  const collection = await getProductsCollection();
  const result = await collection.updateOne(
    { shopify_product_id: shopifyProductId },
    { $set: productData },
    { upsert: true }
  );
  return result;
}

export async function getAllProducts() {
  const collection = await getProductsCollection();
  const products = await collection.find({}).toArray();
  return products;
}

export async function getProductById(shopifyProductId) {
  const collection = await getProductsCollection();
  const product = await collection.findOne({ shopify_product_id: shopifyProductId });
  return product;
}

export async function deleteProduct(shopifyProductId) {
  const collection = await getProductsCollection();
  const result = await collection.deleteOne({ shopify_product_id: shopifyProductId });
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

export async function saveAISummary(shopifyProductId, summaryData) {
  const collection = await getAISummariesCollection();
  const result = await collection.updateOne(
    { shopify_product_id: shopifyProductId },
    {
      $set: {
        ...summaryData,
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );
  return result;
}

export async function getAISummary(shopifyProductId) {
  const collection = await getAISummariesCollection();
  const summary = await collection.findOne({ shopify_product_id: shopifyProductId });
  return summary;
}

export async function getAllAISummaries() {
  const collection = await getAISummariesCollection();
  const summaries = await collection.find({}).toArray();
  return summaries;
}

export async function deleteAllAISummaries() {
  const collection = await getAISummariesCollection();
  const result = await collection.deleteMany({});
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
