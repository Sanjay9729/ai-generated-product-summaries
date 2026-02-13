import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllProducts, getSyncLogsCollection } from "../../database/collections.js";
import { connectToMongoDB } from "../../database/connection.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    await connectToMongoDB();

    const products = await getAllProducts(shop);
    const syncLogsCollection = await getSyncLogsCollection();
    const syncLogs = await syncLogsCollection.find({ shop }).sort({ timestamp: -1 }).limit(10).toArray();

    return {
      products: products,
      productsCount: products.length,
      syncLogs: syncLogs,
    };
  } catch (error) {
    console.error("Error fetching MongoDB data:", error);
    return {
      products: [],
      productsCount: 0,
      syncLogs: [],
      error: error.message,
    };
  }
};

export default function MongoDBViewer() {
  const { products, productsCount, syncLogs, error } = useLoaderData();

  return (
    <s-page heading="Product Sync Dashboard">
      {error && (
        <s-section>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="critical-subdued"
          >
            <s-text variant="headingSm">Error: {error}</s-text>
          </s-box>
        </s-section>
      )}

      <s-section heading="Database Statistics">
        <s-stack direction="inline" gap="base">
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="success-subdued"
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="headingLg">{productsCount}</s-text>
              <s-text variant="bodySm">Total Products</s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="info-subdued"
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="headingLg">{syncLogs.length}</s-text>
              <s-text variant="bodySm">Recent Syncs</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Recent Sync Logs">
        {syncLogs.length > 0 ? (
          <s-stack direction="block" gap="base">
            {syncLogs.map((log, index) => (
              <s-box
                key={index}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background={log.status === "success" ? "success-subdued" : "critical-subdued"}
              >
                <s-stack direction="block" gap="tight">
                  <s-text variant="headingSm">
                    {log.status === "success" ? "✓" : "✗"} {log.status.toUpperCase()}
                  </s-text>
                  <s-text variant="bodySm">
                    Products: {log.products_count} | Duration: {log.duration_ms}ms
                  </s-text>
                  <s-text variant="bodySm" tone="subdued">
                    {new Date(log.timestamp).toLocaleString()}
                  </s-text>
                  {log.error_message && (
                    <s-text variant="bodySm" tone="critical">
                      Error: {log.error_message}
                    </s-text>
                  )}
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        ) : (
          <s-paragraph>No sync logs available.</s-paragraph>
        )}
      </s-section>

      <s-section heading={`Products in MongoDB (${productsCount})`}>
        {products.length > 0 ? (
          <s-stack direction="block" gap="base">
            {products.map((product) => (
              <s-box
                key={product._id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="block" gap="tight">
                  <s-text variant="headingSm">{product.title}</s-text>

                  {product.featured_image && (
                    <img
                      src={product.featured_image.url}
                      alt={product.title}
                      style={{ maxWidth: "150px", borderRadius: "8px" }}
                    />
                  )}

                  {product.description && (
                    <s-box
                      padding="tight"
                      borderWidth="base"
                      borderRadius="base"
                      background="surface"
                    >
                      <s-text variant="bodySm">
                        <strong>Description:</strong>
                      </s-text>
                      <s-text variant="bodySm" tone="subdued">  
                         {product.description}
                      </s-text>
                    </s-box>
                  )}

                  <s-text variant="bodySm">
                    <strong>Status:</strong> {product.status}
                  </s-text>

                  {product.vendor && (
                    <s-text variant="bodySm">
                      <strong>Vendor:</strong> {product.vendor}
                    </s-text>
                  )}

                  <s-text variant="bodySm">
                    <strong>Variants:</strong> {product.variants?.length || 0}
                  </s-text>

                  <s-text variant="bodySm">
                    <strong>Images:</strong> {product.images?.length || 0}
                  </s-text>

                  <s-text variant="bodySm" tone="subdued">
                    <strong>Synced:</strong> {new Date(product.synced_at).toLocaleString()}
                  </s-text>

                  <s-text variant="bodySm" tone="subdued">
                    <strong>Shopify ID:</strong> {product.shopify_product_id}
                  </s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        ) : (
          <s-paragraph>No products found in MongoDB.</s-paragraph>
        )}
      </s-section>

      <s-section heading="Connection Info">
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <s-stack direction="block" gap="tight">
            <s-text variant="bodySm">
              <strong>Database:</strong> shopify_products
            </s-text>
            <s-text variant="bodySm">
              <strong>Connection:</strong> mongodb://localhost:27017
            </s-text>
            <s-text variant="bodySm">
              <strong>Collections:</strong> products, sync_logs
            </s-text>
          </s-stack>
        </s-box>
      </s-section>
    </s-page>
  );
}
