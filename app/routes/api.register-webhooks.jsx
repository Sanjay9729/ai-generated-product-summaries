import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  try {
    console.log(`🔗 Manually registering webhooks for ${session.shop}...`);
    
    // Force webhook registration
    await registerWebhooks(session);
    
    console.log(`✅ Webhooks registered successfully for ${session.shop}`);
    
    return {
      success: true,
      message: "Webhooks registered successfully",
      shop: session.shop,
      registered_webhooks: [
        "PRODUCTS_CREATE",
        "PRODUCTS_UPDATE", 
        "PRODUCTS_DELETE"
      ]
    };

  } catch (error) {
    console.error("❌ Error registering webhooks:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to register webhooks",
        error: error.message,
      },
      { status: 500 }
    );
  }
};

export const action = async ({ request }) => {
  // Same as loader for POST requests
  return loader({ request });
};