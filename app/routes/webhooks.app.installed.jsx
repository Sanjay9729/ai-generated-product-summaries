import { authenticate, registerWebhooks } from "../shopify.server";
import { createInstallationJob } from "../../database/collections.js";
import { syncProductsToMongoDB } from "../../backend/services/shopifyProductService.js";
import { connectToMongoDB } from "../../database/connection.js";
import crypto from "crypto";

export const action = async ({ request }) => {
  try {
    console.log("📦 App installation webhook received");

    // Enhanced HMAC verification and webhook authentication
    const { shop, session, admin, topic } = await authenticate.webhook(request);

    if (!shop || !session) {
      console.error("❌ Missing shop or session in webhook - possible security issue");
      return new Response("Unauthorized", { status: 401 });
    }

    // Verify this is actually an APP_INSTALLED webhook
    if (topic !== 'APP_INSTALLED') {
      console.error(`❌ Invalid webhook topic: ${topic}`);
      return new Response("Invalid webhook topic", { status: 400 });
    }

    console.log(`✓ App installed on shop: ${shop}`);

    // Generate unique job ID
    const jobId = `install-${shop}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create job record in MongoDB
    await createInstallationJob({
      job_id: jobId,
      shop_url: shop,
      status: 'processing',
      total_products: 0,
      products_processed: 0,
      summaries_generated: 0,
      progress_percentage: 0,
    });

    console.log(`📝 Created installation job: ${jobId}`);

    // Register webhooks automatically after installation
    try {
      console.log(`🔗 Registering webhooks for ${shop}...`);
      await registerWebhooks(session);
      console.log(`✓ Webhooks registered successfully for ${shop}`);
      console.log(`🎯 Products will now auto-sync to MongoDB when added/updated`);
    } catch (webhookError) {
      console.error(`Failed to register webhooks for ${shop}:`, webhookError);
      // Continue even if webhook registration fails
    }

    // Trigger immediate product sync during installation
    try {
      console.log(`🚀 Starting immediate product sync for ${shop}...`);
      await connectToMongoDB();
      
      const syncResult = await syncProductsToMongoDB(admin);
      
      console.log(`✓ Installation sync completed: ${syncResult.products_count} products synced`);
      
      // Update job status to completed
      await createInstallationJob({
        job_id: jobId,
        shop_url: shop,
        status: 'completed',
        total_products: syncResult.products_count,
        products_processed: syncResult.products_count,
        summaries_generated: syncResult.products_count, // Estimate: 1 summary per product
        progress_percentage: 100,
      });

      console.log(`🎉 Installation process completed successfully for ${shop}`);
      console.log(`✅ All existing products are now in MongoDB`);
      console.log(`🔄 Future products will auto-sync via webhooks`);

    } catch (syncError) {
      console.error(`Failed to sync products during installation:`, syncError);
      
      // Update job status to failed but keep webhooks active
      await createInstallationJob({
        job_id: jobId,
        shop_url: shop,
        status: 'failed',
        error_message: syncError.message,
      });
      
      console.log(`⚠️ Installation completed but initial sync failed. Webhooks will still capture future products.`);
    }

    return new Response("Installation completed successfully", { status: 200 });

  } catch (error) {
    console.error("❌ Error handling app installation webhook:", error);
    // Don't expose internal error details to maintain security
    return new Response("Webhook processing failed", { status: 500 });
  }
};
