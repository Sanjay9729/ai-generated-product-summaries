import { getProductById } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  try {
    // Connect to MongoDB
    await connectToMongoDB();

    // Extract product ID from URL parameters or search params
    const url = new URL(request.url);
    const productId = url.searchParams.get("id") || url.pathname.split("/").pop();

    if (!productId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product ID is required"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        }
      );
    }

    // Fetch single product by ID
    const product = await getProductById(productId);

    if (!product) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Product not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Return JSON response
    return new Response(
      JSON.stringify({
        success: true,
        product: product,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  } catch (error) {
    console.error("Error in get-product API:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch product from MongoDB",
        error: error.message,
        timestamp: new Date().toISOString()
      }),
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

// Handle OPTIONS requests for CORS
export const action = async ({ request }) => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
};