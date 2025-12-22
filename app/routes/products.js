import { getAllProducts } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  try {
    // Connect to MongoDB
    await connectToMongoDB();

    // Fetch all products
    const products = await getAllProducts();

    // Return JSON response
    return new Response(
      JSON.stringify({
        success: true,
        count: products.length,
        products: products,
        timestamp: new Date().toISOString(),
        message: "Products retrieved successfully from MongoDB"
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
    console.error("Error in products API:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch products from MongoDB",
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