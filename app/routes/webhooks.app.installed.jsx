import { authenticate } from "../shopify.server";
import { productProcessingQueue } from "../../backend/queue/config.js";
import { createInstallationJob } from "../../database/collections.js";
import crypto from "crypto";

export const action = async ({ request }) => {
  try {
    console.log("📦 App installation webhook received");

    // Authenticate the webhook
    const { shop, session, admin } = await authenticate.webhook(request);

    if (!shop || !session) {
      console.error("Missing shop or session in webhook");
      return new Response("Missing shop or session", { status: 400 });
    }

    console.log(`✓ App installed on shop: ${shop}`);

    // Generate unique job ID
    const jobId = `install-${shop}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create job record in MongoDB
    await createInstallationJob({
      job_id: jobId,
      shop_url: shop,
      status: 'pending',
      total_products: 0,
      products_processed: 0,
      summaries_generated: 0,
      progress_percentage: 0,
    });

    console.log(`📝 Created installation job: ${jobId}`);

    // Add job to the queue
    await productProcessingQueue.add(
      'process-products',
      {
        shopUrl: shop,
        accessToken: session.accessToken,
        jobId: jobId,
      },
      {
        jobId: jobId,
      }
    );

    console.log(`✓ Job ${jobId} added to processing queue`);
    console.log(`🚀 Background processing started for ${shop}`);

    return new Response("Installation job queued", { status: 200 });

  } catch (error) {
    console.error("Error handling app installation webhook:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
};
