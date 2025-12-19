import { Worker } from 'bullmq';
import { redisConnection } from './config.js';
import { fetchAllShopifyProducts } from '../services/shopifyProductService.js';
import { updateProduct, saveAISummary, getAISummary, updateJobStatus } from '../../database/collections.js';
import { generateProductSummary } from '../services/groqAIService.js';

// Worker to process product import and AI generation jobs
export const productWorker = new Worker(
  'product-processing',
  async (job) => {
    const { shopUrl, accessToken, jobId } = job.data;

    console.log(`[Job ${jobId}] Starting product processing for shop: ${shopUrl}`);

    try {
      // Update job status to processing
      await updateJobStatus(jobId, {
        status: 'processing',
        started_at: new Date(),
      });

      // Create admin API client
      const admin = {
        graphql: async (query, options) => {
          const response = await fetch(`https://${shopUrl}/admin/api/2026-01/graphql.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify({
              query,
              variables: options?.variables || {},
            }),
          });
          return response;
        },
      };

      // Fetch all products
      console.log(`[Job ${jobId}] Fetching products from Shopify...`);
      const shopifyProducts = await fetchAllShopifyProducts(admin);

      await updateJobStatus(jobId, {
        total_products: shopifyProducts.length,
        products_processed: 0,
        summaries_generated: 0,
      });

      let productsProcessed = 0;
      let summariesGenerated = 0;
      const errors = [];

      // Process each product
      for (const product of shopifyProducts) {
        try {
          // Save product to MongoDB
          const productData = {
            shopify_product_id: product.id,
            title: product.title,
            description: product.description,
            description_html: product.descriptionHtml,
            handle: product.handle,
            status: product.status,
            vendor: product.vendor,
            product_type: product.productType,
            tags: product.tags,
            created_at: product.createdAt,
            updated_at: product.updatedAt,
            published_at: product.publishedAt,
            online_store_url: product.onlineStoreUrl,
            options: product.options,
            variants: product.variants.edges.map(edge => ({
              id: edge.node.id,
              title: edge.node.title,
              price: edge.node.price,
              compare_at_price: edge.node.compareAtPrice,
              sku: edge.node.sku,
              barcode: edge.node.barcode,
              inventory_quantity: edge.node.inventoryQuantity,
              image: edge.node.image,
            })),
            images: product.images.edges.map(edge => ({
              id: edge.node.id,
              url: edge.node.url,
              alt_text: edge.node.altText,
              width: edge.node.width,
              height: edge.node.height,
            })),
            featured_image: product.featuredImage,
            seo: product.seo,
            price_range: product.priceRangeV2,
            total_inventory: product.totalInventory,
            synced_at: new Date(),
          };

          await updateProduct(product.id, productData);
          productsProcessed++;

          // Generate AI summary if it doesn't exist
          const existingSummary = await getAISummary(product.id);

          if (!existingSummary && product.title && product.description) {
            console.log(`[Job ${jobId}] Generating AI summary for: ${product.title}`);

            const aiSummary = await generateProductSummary(
              product.title,
              product.description
            );

            await saveAISummary(product.id, {
              shopify_product_id: product.id,
              product_title: product.title,
              original_title: aiSummary.originalTitle,
              original_description: aiSummary.originalDescription,
              enhanced_title: aiSummary.enhancedTitle,
              enhanced_description: aiSummary.enhancedDescription,
              created_at: new Date(),
            });

            summariesGenerated++;
            console.log(`[Job ${jobId}] ✓ AI summary generated for: ${product.title}`);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Update progress
          await updateJobStatus(jobId, {
            products_processed: productsProcessed,
            summaries_generated: summariesGenerated,
            progress_percentage: Math.round((productsProcessed / shopifyProducts.length) * 100),
          });

          // Update job progress for BullMQ dashboard
          await job.updateProgress({
            processed: productsProcessed,
            total: shopifyProducts.length,
            summaries: summariesGenerated,
          });

        } catch (productError) {
          console.error(`[Job ${jobId}] Error processing product ${product.title}:`, productError);
          errors.push({
            product_id: product.id,
            product_title: product.title,
            error: productError.message,
          });
        }
      }

      // Mark job as completed
      await updateJobStatus(jobId, {
        status: 'completed',
        completed_at: new Date(),
        products_processed: productsProcessed,
        summaries_generated: summariesGenerated,
        errors: errors.length > 0 ? errors : undefined,
      });

      console.log(`[Job ${jobId}] ✓ Completed: ${productsProcessed} products, ${summariesGenerated} AI summaries`);

      return {
        success: true,
        productsProcessed,
        summariesGenerated,
        errors,
      };

    } catch (error) {
      console.error(`[Job ${jobId}] Fatal error:`, error);

      // Mark job as failed
      await updateJobStatus(jobId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: error.message,
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one job at a time to avoid rate limits
  }
);

productWorker.on('completed', (job) => {
  console.log(`✓ Job ${job.id} completed successfully`);
});

productWorker.on('failed', (job, err) => {
  console.error(`✗ Job ${job.id} failed:`, err.message);
});

productWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Product processing worker started and listening for jobs...');
