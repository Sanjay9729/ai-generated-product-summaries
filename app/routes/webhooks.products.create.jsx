import { authenticate } from "../shopify.server";
import { updateProduct, saveAISummary } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";
import { generateProductSummary } from "../../backend/services/groqAIService.js";

export const action = async ({ request }) => {
  try {
    console.log("🔔 PRODUCTS_CREATE webhook received - Starting processing...");

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

    console.log(`🏪 Processing product for shop: ${shop}`);
    console.log(`📦 Product ID: ${payload.id}`);
    console.log(`📝 Product Title: ${payload.title}`);

    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await connectToMongoDB();
    console.log("✅ MongoDB connected successfully");

    const product = payload;

    // Validate required product fields for compliance
    if (!product.id || !product.title) {
      console.error("❌ Product missing required fields (id or title)");
      return new Response("Invalid product data", { status: 400 });
    }

    // Map webhook payload to our MongoDB structure
    const productData = {
      shopify_product_id: `gid://shopify/Product/${product.id}`,
      title: product.title,
      description: product.body_html ? product.body_html.replace(/<[^>]*>/g, '') : '',
      description_html: product.body_html,
      handle: product.handle || '',
      status: product.status ? product.status.toUpperCase() : 'ACTIVE',
      vendor: product.vendor || '',
      product_type: product.product_type || '',
      tags: product.tags ? product.tags.split(', ') : [],
      created_at: product.created_at || new Date().toISOString(),
      updated_at: product.updated_at || new Date().toISOString(),
      published_at: product.published_at,
      online_store_url: `https://${shop}/products/${product.handle || ''}`,
      options: product.options || [],
      variants: (product.variants || []).map(variant => ({
        id: `gid://shopify/ProductVariant/${variant.id}`,
        title: variant.title,
        price: variant.price || '0.00',
        compare_at_price: variant.compare_at_price,
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        inventory_quantity: variant.inventory_quantity || 0,
        image: variant.image_id ? {
          id: `gid://shopify/ProductImage/${variant.image_id}`,
        } : null,
      })),
      images: (product.images || []).map(image => ({
        id: `gid://shopify/ProductImage/${image.id}`,
        url: image.src || '',
        alt_text: image.alt || '',
        width: image.width || 0,
        height: image.height || 0,
      })),
      featured_image: product.image ? {
        id: `gid://shopify/ProductImage/${product.image.id}`,
        url: product.image.src || '',
        alt_text: product.image.alt || '',
        width: product.image.width || 0,
        height: product.image.height || 0,
      } : null,
      synced_at: new Date(),
    };

    console.log("💾 Saving product to MongoDB...");
    await updateProduct(productData.shopify_product_id, productData);
    console.log(`✅ Product "${product.title}" saved to MongoDB successfully`);

    // Auto-generate AI summary
    if (product.title && productData.description) {
      try {
        console.log(`🤖 Generating AI summary for: ${product.title}`);
        
        const aiSummary = await generateProductSummary(
          product.title,
          productData.description
        );

        await saveAISummary(productData.shopify_product_id, {
          shopify_product_id: productData.shopify_product_id,
          product_title: product.title,
          original_title: aiSummary.originalTitle,
          original_description: aiSummary.originalDescription,
          enhanced_title: aiSummary.enhancedTitle,
          enhanced_description: aiSummary.enhancedDescription,
          created_at: new Date(),
        });

        console.log(`✅ AI summary generated for: ${product.title}`);
      } catch (aiError) {
        console.error(`⚠️ Failed to generate AI summary for ${product.title}:`, aiError.message);
        // Don't fail the webhook if AI generation fails
      }
    } else {
      console.log(`⏭️ Skipping AI summary - missing title or description`);
    }

    console.log(`🎉 PRODUCTS_CREATE webhook completed successfully for ${shop}`);
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Error processing PRODUCTS_CREATE webhook:", error);
    console.error("Error stack:", error.stack);
    return new Response(`Webhook processing failed: ${error.message}`, { status: 500 });
  }
};
