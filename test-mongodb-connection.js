import { MongoClient } from 'mongodb';

async function testConnection() {
  const uri = 'mongodb://localhost:27017/shopify_products';

  console.log('Testing MongoDB connection...');
  console.log('URI:', uri);

  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✓ Connected to MongoDB successfully!');

    const db = client.db();

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections:', collections.map(c => c.name));

    // Count documents in products collection
    const productsCount = await db.collection('products').countDocuments();
    console.log('\nTotal products in database:', productsCount);

    // Get one product to see structure
    const sampleProduct = await db.collection('products').findOne();
    console.log('\nSample product:');
    console.log(JSON.stringify(sampleProduct, null, 2));

    await client.close();
    console.log('\n✓ Connection closed');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
