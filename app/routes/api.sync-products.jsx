import { authenticate } from "../shopify.server";
import { syncProductsToMongoDB } from "../../backend/services/shopifyProductService.js";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    console.log(`🔄 Manual product sync triggered via API for ${shop}...`);
    await connectToMongoDB();

    const result = await syncProductsToMongoDB(admin, shop);

    console.log(`✅ Manual sync completed: ${result.products_count} products synced`);

    return {
      success: true,
      message: `Successfully synced ${result.products_count} products to MongoDB`,
      data: result,
    };
  } catch (error) {
    console.error("❌ Error in manual sync API:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to sync products to MongoDB",
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
