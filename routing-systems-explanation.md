# Dual Routing Systems in This Project

This project uses **two different routing systems**:

## 1. React Router v7 (Shopify App Frontend)
- **Location**: `app/routes/` directory
- **Purpose**: Shopify app admin interface (dashboard)
- **Framework**: React Router v7.9.3 with Remix-style file-based routing
- **Examples**: 
  - `app/routes/api.get-product-summary.jsx` - API for theme extension
  - `app/routes/app.products.jsx` - Admin products page
  - `app/routes/app._index.jsx` - Admin dashboard

## 2. Express.js (Backend API)
- **Location**: `server.js` and backend routes
- **Purpose**: Traditional REST API and backend services
- **Framework**: Express.js with middleware
- **Examples**:
  - `app.use('/api/products', productRoutes)`
  - `app.use('/api/product-summaries', productSummaryRoutes)`
  - Health checks, database operations

## Why Two Systems?

1. **React Router v7**: Handles Shopify app interface (what merchants see in admin)
2. **Express.js**: Handles traditional backend API endpoints and business logic

The API you asked about (`/apps/ai-product-summary/api/getProductSummary`) is part of the React Router v7 system because it's called from the Shopify theme extension on the storefront.