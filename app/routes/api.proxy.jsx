import { getAISummary } from "../../database/collections.js";

// App Proxy handler for storefront requests
// This allows the storefront to call our API via: /apps/ai-summaries
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("id");

  // Verify this is coming from Shopify proxy
  const signature = url.searchParams.get("signature");
  const shop = url.searchParams.get("shop");

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
    // Fetch AI summary from MongoDB
    const aiSummary = await getAISummary(productId);

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
    console.error("Error fetching AI summary via proxy:", error);
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
