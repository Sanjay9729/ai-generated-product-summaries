import { authenticate } from "../shopify.server";
import { deleteProduct } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

export const action = async ({ request }) => {
  try {
    console.log("🔔 PRODUCTS_DELETE webhook received");

    // Shopify's built-in authentication with HMAC verification
    const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

    console.log(`📋 Webhook details:`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Shop: ${shop}`);
    console.log(`   Payload received: ${!!payload}`);

    if (!payload) {
      console.error("❌ No payload received in webhook");
      throw new Response("No payload", { status: 400 });
    }

    if (!shop) {
      console.error("❌ No shop information received");
      throw new Response("No shop", { status: 400 });
    }

    console.log(`🏪 Processing product deletion for shop: ${shop}`);
    console.log(`📦 Product ID: ${payload.id}`);
    console.log(`📝 Product Title: ${payload.title || 'Unknown'}`);

    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await connectToMongoDB();
    console.log("✅ MongoDB connected successfully");

    const product = payload;
    const shopifyProductId = `gid://shopify/Product/${product.id}`;

    // Validate required fields
    if (!product.id) {
      console.error("❌ Product missing required id field");
      return new Response("Invalid product data", { status: 400 });
    }

    console.log(`🗑️ Deleting product from MongoDB: ${shopifyProductId}`);
    await deleteProduct(shopifyProductId, shop);
    console.log(`✅ Product "${product.title || 'Unknown'}" (ID: ${product.id}) deleted from MongoDB via HMAC-verified webhook`);

    console.log(`🎉 PRODUCTS_DELETE webhook completed successfully for ${shop}`);
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("❌ Error processing PRODUCTS_DELETE webhook:", error);
    console.error("Error stack:", error.stack);
    return new Response(`Webhook processing failed: ${error.message}`, { status: 500 });
  }
};
