/* global process */
import { createRequestHandler } from '@react-router/express';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getAllProducts, getAllAISummaries } from './database/collections.js';
import { connectToMongoDB } from './database/connection.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set NODE_ENV to production if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Set SHOPIFY_APP_URL if not set (required by Shopify SDK)
if (!process.env.SHOPIFY_APP_URL) {
  process.env.SHOPIFY_APP_URL = `http://localhost:${process.env.PORT || 3000}`;
}

const PORT = process.env.PORT || 3000;

// Import the React Router server build
const BUILD_PATH = path.resolve(__dirname, 'build', 'server', 'index.js');
const build = await import(pathToFileURL(BUILD_PATH).href);

const app = express();

// Middleware
app.use(compression());
app.disable('x-powered-by');
app.use(morgan('tiny'));
app.use(express.json());

// Custom API routes MUST come before the React Router handler
app.get('/api/products', async (_req, res) => {
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

app.get('/api/ai-summaries', async (_req, res) => {
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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API server is running'
  });
});

// Serve static assets
const CLIENT_BUILD_DIR = path.join(__dirname, 'build', 'client');
app.use(
  express.static(CLIENT_BUILD_DIR, {
    maxAge: '1h',
    setHeaders(res, resourcePath) {
      if (resourcePath.endsWith('.js') || resourcePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public,max-age=31536000,immutable');
      }
    },
  })
);

// React Router request handler for all other routes
const handler = createRequestHandler({ build });
console.log('Handler type:', typeof handler);
console.log('Handler function length:', handler.length);

// Add debug middleware
app.use((req, _res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// Wrap handler to see if it's being called
app.use((req, res, next) => {
  console.log('[DEBUG] Calling React Router handler for:', req.url);
  handler(req, res, next);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📋 Main page: http://localhost:${PORT}/`);
  console.log(`📋 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🤖 AI Summaries API: http://localhost:${PORT}/api/ai-summaries`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});
