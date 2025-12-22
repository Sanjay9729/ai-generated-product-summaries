import express from 'express';
import cors from 'cors';
import { getAllProducts, getAllAISummaries } from './database/collections.js';
import { connectToMongoDB } from './database/connection.js';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (favicon, etc.)
app.use(express.static('public'));

// API Routes
app.get('/api/products', async (req, res) => {
  try {
    // Connect to MongoDB
    await connectToMongoDB();

    // Fetch all products
    const products = await getAllProducts();

    // Return JSON response
    res.json({
      success: true,
      count: products.length,
      products: products,
      timestamp: new Date().toISOString(),
      message: "Products retrieved successfully from MongoDB"
    });
  } catch (error) {
    console.error("Error in products API:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch products from MongoDB",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// AI Summaries API endpoint
app.get('/api/ai-summaries', async (req, res) => {
  try {
    // Connect to MongoDB
    await connectToMongoDB();

    // Fetch all AI summaries
    const aiSummaries = await getAllAISummaries();

    // Return JSON response
    res.json({
      success: true,
      count: aiSummaries.length,
      ai_summaries: aiSummaries,
      timestamp: new Date().toISOString(),
      message: "AI summaries retrieved successfully from MongoDB"
    });
  } catch (error) {
    console.error("Error in ai-summaries API:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch AI summaries from MongoDB",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API server is running'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📋 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🤖 AI Summaries API: http://localhost:${PORT}/api/ai-summaries`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});