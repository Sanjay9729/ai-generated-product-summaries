import { authenticate } from "../shopify.server";

/**
 * Compliance webhook endpoint for Shopify App Store automated testing
 * This endpoint is used by Shopify to verify HMAC signature validation
 */
export const action = async ({ request }) => {
  try {
    // Shopify's built-in authentication with HMAC verification
    // This will automatically return 401 if HMAC is invalid
    const { topic, shop } = await authenticate.webhook(request);

    console.log(`✓ Compliance webhook verified for shop: ${shop}, topic: ${topic}`);

    // Return 200 OK to indicate successful HMAC verification
    return new Response("OK", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      }
    });
  } catch (error) {
    // If authentication fails (invalid HMAC), return 401
    console.error("❌ Compliance webhook authentication failed:", error.message);

    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
      }
    });
  }
};
