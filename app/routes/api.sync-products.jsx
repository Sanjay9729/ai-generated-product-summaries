import { authenticate } from "../shopify.server";
import { syncProductsToMongoDB } from "../../backend/services/shopifyProductService.js";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    await connectToMongoDB();

    const result = await syncProductsToMongoDB(admin);

    return {
      success: true,
      message: `Successfully synced ${result.products_count} products to MongoDB`,
      data: result,
    };
  } catch (error) {
    console.error("Error in sync-products API:", error);
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
