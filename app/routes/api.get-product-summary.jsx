import { getAISummary } from "../../database/collections.js";
import { resolveLocalizedSummary } from "../../backend/services/translationService.js";

// This API endpoint is called from the theme app extension (storefront)
export const loader = async ({ request }) => {
  // Enable CORS for storefront requests
  const url = new URL(request.url);
  const productId = url.searchParams.get("id");
  const shop = url.searchParams.get("shop");
  const lang = url.searchParams.get("lang");

  console.log(`[api.get-product-summary] incoming request: productId=${productId} shop=${shop} lang=${lang}`);

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
    // Fetch AI summary from MongoDB scoped to shop
    const aiSummary = await getAISummary(productId, shop);
    console.log(`[api.get-product-summary] aiSummary found? ${!!aiSummary}`);

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
    console.log(`[api.get-product-summary] resolved result: enhancedTitle=${enhancedTitle} enhancedDescription=${enhancedDescription}`);

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
    console.error("Error fetching AI summary:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch AI summary" }),
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
