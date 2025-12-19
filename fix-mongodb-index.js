import { MongoClient } from 'mongodb';

async function fixMongoDBIndexes() {
  const uri = 'mongodb://localhost:27017/shopify_products';

  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();
    const productsCollection = db.collection('products');

    // Get all indexes
    const indexes = await productsCollection.indexes();
    console.log('\nCurrent indexes:', JSON.stringify(indexes, null, 2));

    // Drop all documents
    console.log('\nDeleting all existing products...');
    const deleteResult = await productsCollection.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} documents`);

    // Drop all indexes except _id
    console.log('\nDropping all custom indexes...');
    try {
      await productsCollection.dropIndexes();
      console.log('✓ Dropped all custom indexes');
    } catch (error) {
      console.log('Note:', error.message);
    }

    // Create the correct index
    console.log('\nCreating index on shopify_product_id...');
    await productsCollection.createIndex(
      { shopify_product_id: 1 },
      { unique: true, sparse: true }
    );
    console.log('✓ Created unique index on shopify_product_id');

    // Verify indexes
    const newIndexes = await productsCollection.indexes();
    console.log('\nNew indexes:', JSON.stringify(newIndexes, null, 2));

    await client.close();
    console.log('\n✓ MongoDB indexes fixed successfully!');
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

fixMongoDBIndexes();
