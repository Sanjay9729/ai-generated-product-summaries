/* global process */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllProducts, getAllAISummaries } from './database/collections.js';
import { connectToMongoDB } from './database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Get the build directory path
const buildDir = path.join(__dirname, 'build/client');

// Helper function to serve the index.html
function serveIndex(req, res) {
  res.sendFile(path.join(buildDir, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Build not found. Please run npm run build first.');
    }
  });
}

// Main page route - shows route.jsx content
app.get('/', serveIndex);

// API products route - returns JSON data
app.get('/api/products', async (req, res) => {
  try {
    await connectToMongoDB();
    const products = await getAllProducts();
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

// API ai-summaries route - returns JSON data
app.get('/api/ai-summaries', async (req, res) => {
  try {
    await connectToMongoDB();
    const aiSummaries = await getAllAISummaries();
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

// API health check - returns JSON
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API server is running'
  });
});

// Serve static files from build/client
app.use(express.static(buildDir));

// SPA fallback for all other routes
app.get('/{*splat}', serveIndex);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📋 Main page: http://localhost:${PORT}/`);
  console.log(`📋 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🤖 AI Summaries API: http://localhost:${PORT}/api/ai-summaries`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});
