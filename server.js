/* global process */
import express from 'express';
import cors from 'cors';
import { createRequestHandler } from '@react-router/express';
import { getAllProducts, getAllAISummaries } from './database/collections.js';
import { connectToMongoDB } from './database/connection.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API server is running'
  });
});

// React Router handler for SSR
const reactRouterHandler = createRequestHandler({
  // Import the built routes (if available)
  // Otherwise, use the routes directory
  getLoadContext() {
    return {};
  }
});

app.all('/{*splat}', reactRouterHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📋 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🤖 AI Summaries API: http://localhost:${PORT}/api/ai-summaries`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
