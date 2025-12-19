import { authenticate } from "../shopify.server";
import { updateProduct, saveAISummary, getAISummary } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";
import { generateProductSummary } from "../../backend/services/groqAIService.js";

export const action = async ({ request }) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (!payload) {
    throw new Response("No payload", { status: 400 });
  }

  try {
    await connectToMongoDB();

    const product = payload;

    // Map webhook payload to our MongoDB structure
    const productData = {
      shopify_product_id: `gid://shopify/Product/${product.id}`,
      title: product.title,
      description: product.body_html ? product.body_html.replace(/<[^>]*>/g, '') : '',
      description_html: product.body_html,
      handle: product.handle,
      status: product.status.toUpperCase(),
      vendor: product.vendor,
      product_type: product.product_type,
      tags: product.tags ? product.tags.split(', ') : [],
      created_at: product.created_at,
      updated_at: product.updated_at,
      published_at: product.published_at,
      online_store_url: `https://${shop}/products/${product.handle}`,
      options: product.options,
      variants: product.variants.map(variant => ({
        id: `gid://shopify/ProductVariant/${variant.id}`,
        title: variant.title,
        price: variant.price,
        compare_at_price: variant.compare_at_price,
        sku: variant.sku,
        barcode: variant.barcode,
        inventory_quantity: variant.inventory_quantity,
        image: variant.image_id ? {
          id: `gid://shopify/ProductImage/${variant.image_id}`,
        } : null,
      })),
      images: product.images.map(image => ({
        id: `gid://shopify/ProductImage/${image.id}`,
        url: image.src,
        alt_text: image.alt,
        width: image.width,
        height: image.height,
      })),
      featured_image: product.image ? {
        id: `gid://shopify/ProductImage/${product.image.id}`,
        url: product.image.src,
        alt_text: product.image.alt,
        width: product.image.width,
        height: product.image.height,
      } : null,
      synced_at: new Date(),
    };

    await updateProduct(productData.shopify_product_id, productData);

    console.log(`✓ Product ${product.title} updated in MongoDB via webhook`);

    // Auto-generate AI summary if it doesn't exist
    try {
      const existingSummary = await getAISummary(productData.shopify_product_id);

      if (!existingSummary && product.title && productData.description) {
        console.log(`Auto-generating AI summary for updated product: ${product.title}`);

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

        console.log(`✓ AI summary auto-generated for: ${product.title}`);
      }
    } catch (aiError) {
      console.error(`Failed to auto-generate AI summary:`, aiError.message);
      // Don't fail the webhook if AI generation fails
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing product update webhook:", error);
    return new Response("Error", { status: 500 });
  }
};
