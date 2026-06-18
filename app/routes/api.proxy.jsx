import { getAISummary, getProductById, saveAISummary } from "../../database/collections.js";
import { generateProductSummary } from "../../backend/services/groqAIService.js";
import { resolveLocalizedSummary } from "../../backend/services/translationService.js";
import { sessionStorage } from "../shopify.server.js";

// Fetch product title/description from Shopify Admin API using stored offline session
async function fetchProductFromShopify(productId, shop) {
  try {
    const offlineSessionId = `offline_${shop}`;
    const session = await sessionStorage.loadSession(offlineSessionId);

    if (!session?.accessToken) {
      console.log(`[api.proxy] No offline session found for ${shop}`);
      return null;
    }

    const response = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title
            description
          }
        }`,
        variables: { id: productId },
      }),
    });

    const data = await response.json();
    if (data.data?.product) {
      return data.data.product;
    }
    console.log(`[api.proxy] Shopify returned no product for ${productId}`);
    return null;
  } catch (err) {
    console.error(`[api.proxy] Failed to fetch product from Shopify:`, err.message);
    return null;
  }
}

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

  if (!productId) {
    return new Response(
      JSON.stringify({ error: "Product ID is required" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    // Fetch AI summary from MongoDB scoped to the requesting shop
    let aiSummary = await getAISummary(productId, shop);
    console.log(`[api.proxy] aiSummary found? ${!!aiSummary}`);

    // Auto-generate summary on demand if not found
    if (!aiSummary) {
      console.log(`[api.proxy] Auto-generating AI summary for ${productId}...`);

      // First try MongoDB products collection, then fall back to Shopify API
      let product = await getProductById(productId, shop);

      if (!product) {
        console.log(`[api.proxy] Product not in MongoDB, fetching from Shopify...`);
        product = await fetchProductFromShopify(productId, shop);
      }

      if (product?.title) {
        try {
          const aiResult = await generateProductSummary(product.title, product.description);

          await saveAISummary(productId, {
            shopify_product_id: productId,
            product_title: product.title,
            original_title: aiResult.originalTitle,
            original_description: aiResult.originalDescription,
            enhanced_title: aiResult.enhancedTitle,
            enhanced_description: aiResult.enhancedDescription,
            created_at: new Date(),
          }, shop);

          console.log(`[api.proxy] AI summary auto-generated for: ${product.title}`);

          // Use freshly generated data directly to avoid an extra DB round-trip
          aiSummary = {
            shopify_product_id: productId,
            original_title: aiResult.originalTitle,
            original_description: aiResult.originalDescription,
            enhanced_title: aiResult.enhancedTitle,
            enhanced_description: aiResult.enhancedDescription,
          };
        } catch (aiError) {
          console.error(`[api.proxy] AI generation failed for ${productId}:`, aiError.message);
        }
      } else {
        console.log(`[api.proxy] Cannot auto-generate: product data not available for ${productId}`);
      }
    }

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
            "Access-Control-Allow-Origin": "*",
          },
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
          "Access-Control-Allow-Origin": "*",
        },
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
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
