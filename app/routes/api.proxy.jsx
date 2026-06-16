import { getAISummary } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";
import { resolveLocalizedSummary } from "../../backend/services/translationService.js";

// App Proxy handler for storefront requests
// This allows the storefront to call our API via: /apps/ai-summaries
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("id");
  const lang = url.searchParams.get("lang");

  // Verify this is coming from Shopify proxy
  const signature = url.searchParams.get("signature");
  const shop = url.searchParams.get("shop");

  console.log(`[api.proxy] incoming request: productId=${productId} shop=${shop} lang=${lang} signature=${signature}`);

  try {
    await connectToMongoDB();
  } catch (dbError) {
    console.error("[api.proxy] MongoDB connection failed:", dbError);
    return new Response(
      JSON.stringify({ error: "Database connection failed", detail: dbError?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      }
    );
  }

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
    // Fetch AI summary from MongoDB scoped to the requesting shop
    const aiSummary = await getAISummary(productId, shop);
    console.log(`[api.proxy] aiSummary found? ${!!aiSummary}`);

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

    // Resolve the summary for the requested locale, generating and
    // caching a translation on demand if needed
    const { enhancedTitle, enhancedDescription } = await resolveLocalizedSummary(aiSummary, lang, shop);
    console.log(`[api.proxy] resolved result: enhancedTitle=${enhancedTitle} enhancedDescription=${enhancedDescription}`);

    // Return the AI-generated content
    return new Response(
      JSON.stringify({
        productSummary: enhancedDescription,
        enhancedTitle: enhancedTitle,
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
    console.error("Error fetching AI summary via proxy:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch AI summary", detail: error?.message }),
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
