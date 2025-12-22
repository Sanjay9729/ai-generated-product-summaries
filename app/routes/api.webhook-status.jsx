import { authenticate } from "../shopify.server";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    console.log("🔍 Checking webhook registration status...");
    
    // Try to query existing webhooks to see if they're registered
    const query = `
      query {
        webhookSubscriptions(first: 10) {
          edges {
            node {
              id
              topic
              endpoint {
                __typename
                ... on WebhookHttpEndpoint {
                  callbackUrl
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error("Failed to query webhook subscriptions");
    }

    const webhooks = data.data.webhookSubscriptions.edges.map(edge => edge.node);
    
    const productWebhooks = webhooks.filter(w => 
      w.topic === 'PRODUCTS_CREATE' || 
      w.topic === 'PRODUCTS_UPDATE' || 
      w.topic === 'PRODUCTS_DELETE'
    );

    console.log(`📊 Found ${webhooks.length} total webhooks, ${productWebhooks.length} product webhooks`);

    return {
      success: true,
      total_webhooks: webhooks.length,
      product_webhooks: productWebhooks.length,
      webhooks: productWebhooks.map(w => ({
        topic: w.topic,
        callbackUrl: w.endpoint?.callbackUrl || 'Unknown'
      })),
      webhook_registration_status: productWebhooks.length >= 3 ? 'complete' : 'incomplete'
    };

  } catch (error) {
    console.error("❌ Error checking webhook status:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to check webhook status",
        error: error.message,
      },
      { status: 500 }
    );
  }
};