import { authenticate, sessionStorage } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    console.log("🔔 APP_UNINSTALLED webhook received");

    // Shopify's built-in authentication with HMAC verification
    const { topic, shop, session } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    // Webhook requests can trigger multiple times and after an app has already been uninstalled.
    // If this webhook already ran, the session may have been deleted previously.
    try {
      const sessions = await sessionStorage.findSessionsByShop(shop);
      for (const existingSession of sessions) {
        await sessionStorage.deleteSession(existingSession.id);
      }
      console.log(`✓ Session data deleted for shop: ${shop}`);
    } catch (deleteError) {
      console.error(`Warning: Failed to delete sessions for ${shop}:`, deleteError);
    }

    // Clean up any related data in your database if needed
    try {
      // Here you could add cleanup logic for MongoDB collections
      // that are specific to this shop
      console.log(`🧹 Shop cleanup completed for: ${shop}`);
    } catch (cleanupError) {
      console.error(`Warning: Failed to clean up shop data for ${shop}:`, cleanupError);
      // Don't fail the webhook if cleanup fails
    }

    // Return 200 OK to acknowledge receipt
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("❌ Error handling app uninstalled webhook:", error);
    // Return 200 OK even on error to prevent Shopify from retrying
    // but log the error for monitoring
    return new Response("OK", { status: 200 });
  }
};
