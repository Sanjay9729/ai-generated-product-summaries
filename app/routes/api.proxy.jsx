import { getAISummary, logError } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

// App Proxy handler for storefront requests
// This allows the storefront to call our API via: /apps/ai-summaries
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const rawId = url.searchParams.get("id");
  const shop = url.searchParams.get("shop");

  // Reconstruct full GID if only numeric ID was sent (avoids gid:// in proxy URL)
  const productId = rawId && !rawId.startsWith("gid://")
    ? `gid://shopify/Product/${rawId}`
    : rawId;

  if (!productId) {
    return new Response(
      JSON.stringify({ error: "Product ID is required" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }

  try {
    console.log(`[PROXY] productId=${productId} shop=${shop}`);
    console.log(`[PROXY] MONGODB_URI set: ${!!process.env.MONGODB_URI}`);

    await connectToMongoDB();
    console.log("[PROXY] MongoDB connected successfully");

    // Fetch AI summary from MongoDB scoped to the requesting shop
    const aiSummary = await getAISummary(productId, shop);
    console.log(`[PROXY] aiSummary found: ${!!aiSummary}`);

    if (!aiSummary) {
      return new Response(
        JSON.stringify({
          productSummary: null,
          enhancedTitle: null,
          message: "No AI summary found for this product",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Return the AI-generated content
    return new Response(
      JSON.stringify({
        productSummary: aiSummary.enhanced_description,
        enhancedTitle: aiSummary.enhanced_title,
        originalTitle: aiSummary.original_title,
        productId: aiSummary.shopify_product_id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    console.error("[PROXY] Error:", error.name, error.message);
    console.error("[PROXY] Stack:", error.stack);
    
    // Log error to MongoDB for remote debugging
    await logError({
      location: "api.proxy.jsx",
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      url: request.url,
      shop: shop,
      productId: productId
    }).catch(err => console.error("Failed to log error to DB:", err.message));

    return new Response(
      JSON.stringify({
        error: "Failed to fetch AI summary",
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
};
