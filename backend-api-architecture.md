# Backend API Architecture

Yes, this app **does use extensive backend API endpoints and services**!

## Backend Services Architecture

### 1. Queue System (Redis + BullMQ)
**Location**: `backend/queue/`

- **Config**: Redis connection and queue setup
- **Worker**: Background job processing for product sync and AI generation
- **Purpose**: Handle long-running operations without blocking main application

### 2. AI Service (Groq API)
**Location**: `backend/services/groqAIService.js`

- **Service**: `generateProductSummary()` - Creates AI-enhanced product descriptions
- **API**: Groq LLM (Llama-4-Scout-17b) for product summarization
- **Features**: 
  - Single product summary generation
  - Bulk product summary processing
  - Rate limiting and error handling

### 3. Shopify Product Service
**Location**: `backend/services/shopifyProductService.js`

- **Service**: `fetchAllShopifyProducts()` - Fetches products via Shopify GraphQL API
- **Service**: `syncProductsToMongoDB()` - Syncs products and generates AI summaries
- **Features**:
  - Paginated product fetching (250 products per page)
  - Complete product data with variants, images, SEO
  - Auto AI summary generation during sync

## How Backend Integrates with Frontend

### React Router v7 Routes Call Backend Services:
1. `api.get-product-summary.jsx` → Fetches from MongoDB ( populated by backend sync )
2. `api.sync-products.jsx` → Triggers backend queue jobs
3. `api.get-products.jsx` → Reads from MongoDB collections

### Background Processing Flow:
1. **Queue Job Created** → Redis queue receives sync job
2. **Worker Processes** → Fetches from Shopify API
3. **AI Generation** → Groq API creates summaries
4. **MongoDB Storage** → Products and summaries saved
5. **Frontend Ready** → React Router can serve cached data

## Backend vs Frontend Responsibilities

| Component | Frontend (React Router v7) | Backend Services |
|-----------|---------------------------|------------------|
| **Data Storage** | MongoDB queries only | MongoDB writes, updates |
| **External APIs** | None (client-side only) | Shopify GraphQL, Groq AI |
| **Job Processing** | Status checking | BullMQ workers, Redis |
| **Rate Limiting** | None | Built into backend services |
| **Long Operations** | Real-time status updates | Background processing |

## Key Backend Endpoints/Services

- **Product Sync**: Triggers Shopify → MongoDB sync with AI generation
- **AI Summary Generation**: Groq API calls for product enhancement
- **Queue Management**: BullMQ job processing and status tracking
- **Database Operations**: MongoDB collections for products, summaries, jobs

The backend is essential for:
- Shopify API integration (rate-limited, authenticated)
- AI processing (Groq API calls)
- Background job processing (Redis/BullMQ)
- Data synchronization and caching