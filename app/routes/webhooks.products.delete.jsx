import { authenticate } from "../shopify.server";
import { deleteProduct } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

export const action = async ({ request }) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (!payload) {
    throw new Response("No payload", { status: 400 });
  }

  try {
    await connectToMongoDB();

    const product = payload;
    const shopifyProductId = `gid://shopify/Product/${product.id}`;

    await deleteProduct(shopifyProductId);

    console.log(`✓ Product ${product.id} deleted from MongoDB via webhook`);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing product delete webhook:", error);
    return new Response("Error", { status: 500 });
  }
};
