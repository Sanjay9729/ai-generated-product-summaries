import { useLoaderData } from "react-router";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { getAllProducts, getAllAISummaries } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    await connectToMongoDB();

    // Just fetch existing data, no automatic sync needed
    const products = await getAllProducts(shop);
    const aiSummaries = await getAllAISummaries(shop);

    return {
      syncStatus: {
        success: true,
        message: `Found ${products.length} products and ${aiSummaries.length} AI summaries in MongoDB`,
      },
      productsCount: products.length,
      aiSummariesCount: aiSummaries.length,
    };
  } catch (error) {
    console.error("Error loading products:", error);
    return {
      syncStatus: {
        success: false,
        error: error.message,
      },
      productsCount: 0,
      aiSummariesCount: 0,
    };
  }
};

export default function ProductsPage() {
  const { syncStatus, productsCount } = useLoaderData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    if (productsCount === 0) {
      setIsSyncing(true);
      fetch('/api/sync-products')
        .then((res) => res.json())
        .then((result) => {
          setSyncResult(result);
          setTimeout(() => window.location.reload(), 2000);
        })
        .catch((error) => setSyncResult({ success: false, error: error.message }))
        .finally(() => setIsSyncing(false));
    }
  }, []);

  return (
    <s-page heading="Products Sync">
      <s-section heading="MongoDB Product Sync">

        {isSyncing && (
          <s-banner tone="info">
            <s-paragraph>Syncing products from Shopify to MongoDB, please wait...</s-paragraph>
          </s-banner>
        )}

        {syncResult && (
          <s-banner tone={syncResult.success ? "success" : "critical"}>
            <s-paragraph>{syncResult.message || syncResult.error}</s-paragraph>
          </s-banner>
        )}

        {!isSyncing && !syncResult && syncStatus && (
          <s-banner tone={syncStatus.success ? "success" : "critical"}>
            <s-paragraph>
              {syncStatus.success ? syncStatus.message : `Error: ${syncStatus.error}`}
            </s-paragraph>
          </s-banner>
        )}

        <s-paragraph>
          <s-text variant="bodySm" tone="subdued">
            Products are automatically synced to MongoDB when you visit this page (if no products exist) or when products are created, updated, or deleted in your Shopify store via webhooks.
          </s-text>
        </s-paragraph>
      </s-section>

      {/* <s-section heading="Database Information">
        <s-paragraph>
          <s-text variant="bodySm">
            <strong>Database:</strong> MongoDB (Local)
          </s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text variant="bodySm">
            <strong>Connection:</strong> mongodb://localhost:27017/shopify_products
          </s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text variant="bodySm">
            <strong>Current Data:</strong>
          </s-text>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>products - {productsCount} Shopify products</s-list-item>
          <s-list-item>ai_summaries - {aiSummariesCount} AI-generated summaries</s-list-item>
          <s-list-item>sync_logs - Sync operation history</s-list-item>
          <s-list-item>installation_jobs - App installation tracking</s-list-item>
        </s-unordered-list>
      </s-section> */}

      {/* <s-section heading="View in MongoDB Compass">
        <s-paragraph>
          Open MongoDB Compass and connect to view your synced products:
        </s-paragraph>
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <pre style={{ margin: 0, fontSize: "12px" }}>
            mongodb://localhost:27017/shopify_products
          </pre>
        </s-box>
      </s-section> */}
    </s-page>
  );
}
