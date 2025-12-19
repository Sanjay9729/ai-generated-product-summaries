import { authenticate } from "../shopify.server";
import { getAllProducts } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  try {
    await connectToMongoDB();

    const products = await getAllProducts();

    return {
      success: true,
      count: products.length,
      products: products,
    };
  } catch (error) {
    console.error("Error in get-products API:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to fetch products from MongoDB",
        error: error.message,
      },
      { status: 500 }
    );
  }
};
