import { useLoaderData } from "react-router";
import { useState } from "react";
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
  const { syncStatus, productsCount, aiSummariesCount } = useLoaderData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch('/api/sync-products');
      const result = await response.json();
      setSyncResult(result);
      
      // Refresh the page data after sync
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setSyncResult({ success: false, error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRegisterWebhooks = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch('/api/register-webhooks');
      const result = await response.json();
      setSyncResult(result);
    } catch (error) {
      setSyncResult({ success: false, error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckWebhookStatus = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await fetch('/api/webhook-status');
      const result = await response.json();
      setSyncResult(result);
    } catch (error) {
      setSyncResult({ success: false, error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <s-page heading="Product Management">
      <s-section heading="MongoDB Product Sync">
        <s-paragraph>
          Products from your Shopify store are automatically synced to MongoDB when:
        </s-paragraph>

        <s-unordered-list>
          <s-list-item>You install the app (initial sync of all products)</s-list-item>
          <s-list-item>Products are created, updated, or deleted via webhooks</s-list-item>
        </s-unordered-list>

        {syncStatus && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background={syncStatus.success ? "success-subdued" : "critical-subdued"}
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="headingSm">
                {syncStatus.success ? "✓ Database Status" : "✗ Error"}
              </s-text>
              <s-text>
                {syncStatus.success
                  ? syncStatus.message
                  : `Error: ${syncStatus.error}`}
              </s-text>
            </s-stack>
          </s-box>
        )}

        {syncResult && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background={syncResult.success ? "success-subdued" : "critical-subdued"}
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="headingSm">
                {syncResult.success ? "✓ Operation Successful" : "✗ Operation Failed"}
              </s-text>
              <s-text>
                {syncResult.message || syncResult.error}
              </s-text>
            </s-stack>
          </s-box>
        )}

        {/* <s-section heading="Troubleshooting">
          <s-paragraph>
            If new products aren't automatically syncing to MongoDB, try these steps:
          </s-paragraph>

          <s-stack direction="inline" gap="base">
            <s-button 
              onClick={handleCheckWebhookStatus}
              disabled={isSyncing}
              variant="tertiary"
            >
              Check Webhook Status
            </s-button>
            
            <s-button 
              onClick={handleRegisterWebhooks}
              disabled={isSyncing}
              variant="tertiary"
            >
              Register Webhooks
            </s-button>
            
            <s-button 
              onClick={handleManualSync}
              disabled={isSyncing}
              {...(isSyncing ? { loading: true } : {})}
            >
              Manual Sync Now
            </s-button>
          </s-stack>

          <s-paragraph>
            <s-text variant="bodySm" tone="subdued">
              Webhooks should automatically handle product sync, but manual sync is available as a fallback.
            </s-text>
          </s-paragraph>
        </s-section> */}

        <s-paragraph>
          <s-text variant="bodySm" tone="subdued">
            Products are stored in MongoDB with complete details including:
          </s-text>
        </s-paragraph>

        <s-unordered-list>
          <s-list-item>Product titles and descriptions</s-list-item>
          <s-list-item>Product images (all images with URLs)</s-list-item>
          <s-list-item>Variants with pricing and inventory</s-list-item>
          <s-list-item>Product status, vendor, and tags</s-list-item>
          <s-list-item>SEO information</s-list-item>
          <s-list-item>Product options and attributes</s-list-item>
          <s-list-item>AI-generated summaries (when available)</s-list-item>
        </s-unordered-list>
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
