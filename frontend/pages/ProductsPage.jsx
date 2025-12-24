import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";

export default function ProductsPage() {
  const { syncStatus, productsCount } = useLoaderData();
  const [loading, setLoading] = useState(false);

  return (
    <s-page heading="Product Management s">
      <s-section heading="MongoDB Product Sync">
        <s-paragraph>
          All products from your Shopify store are automatically synced to your
          local MongoDB database when you access this page.
        </s-paragraph>

        {syncStatus && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background={syncStatus.success ? "success-subdued" : "critical-subdued"}
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="headingSm">
                {syncStatus.success ? "✓ Sync Successful" : "✗ Sync Failed"}
              </s-text>
              <s-text>
                {syncStatus.success
                  ? `Successfully synced ${productsCount} products to MongoDB`
                  : `Error: ${syncStatus.error}`}
              </s-text>
            </s-stack>
          </s-box>
        )}

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
            <strong>Connection:</strong> {process.env.MONGODB_URI || "mongodb://localhost:27017/shopify_products"}
          </s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text variant="bodySm">
            <strong>Collections:</strong>
          </s-text>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>products - All Shopify products</s-list-item>
          <s-list-item>sync_logs - Sync operation history</s-list-item>
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
