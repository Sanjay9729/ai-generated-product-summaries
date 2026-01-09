import { useEffect } from "react";
import PropTypes from "prop-types";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getLatestInstallationJob, createInstallationJob } from "../../database/collections.js";
import step2mage from "../images/AI Product Summary Block.png";
import step3mage from "../images/Configure Block Settings.png";
import crypto from "crypto";
import "../styles/setupGuide.css";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  // Get the published theme ID
  let themeEditorUrl = `https://${session.shop}/admin/themes`;

  try {
    const response = await admin.graphql(
      `#graphql
        query {
          themes(first: 1, roles: MAIN) {
            nodes {
              id
            }
          }
        }`
    );

    const responseJson = await response.json();
    const themeId = responseJson.data?.themes?.nodes?.[0]?.id;

    if (themeId) {
      // Extract numeric ID from the GraphQL ID (format: gid://shopify/Theme/123456789)
      const numericThemeId = themeId.split('/').pop();
      // Create a deep link to the product template in the theme editor
      themeEditorUrl = `https://${session.shop}/admin/themes/${numericThemeId}/editor?template=product`;
    }
  } catch (error) {
    console.error('Error fetching theme ID:', error);
    // Fall back to basic themes URL if there's an error
  }

  // Check if this shop has ever had an installation job
  try {
    const existingJob = await getLatestInstallationJob(session.shop);

    // If no job exists, create one and trigger automatic sync (first-time install)
    if (!existingJob) {
      const jobId = `install-${session.shop}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      await createInstallationJob({
        job_id: jobId,
        shop_url: session.shop,
        status: 'processing',
        total_products: 0,
        products_processed: 0,
        summaries_generated: 0,
        progress_percentage: 0,
      });

      console.log(`🚀 First-time install detected - Job ${jobId} created for ${session.shop}`);
      console.log(`🔄 Starting automatic product sync...`);

      // Trigger automatic sync in the background
      const { syncProductsToMongoDB } = await import('../../backend/services/shopifyProductService.js');
      const { connectToMongoDB } = await import('../../database/connection.js');

      // Don't await - run in background
      (async () => {
        try {
          await connectToMongoDB();
          const syncResult = await syncProductsToMongoDB(admin);

          await createInstallationJob({
            job_id: jobId,
            shop_url: session.shop,
            status: 'completed',
            total_products: syncResult.products_count,
            products_processed: syncResult.products_count,
            summaries_generated: syncResult.products_count,
            progress_percentage: 100,
          });

          console.log(`✅ Automatic sync completed: ${syncResult.products_count} products synced for ${session.shop}`);
        } catch (error) {
          console.error(`❌ Automatic sync failed for ${session.shop}:`, error);
          await createInstallationJob({
            job_id: jobId,
            shop_url: session.shop,
            status: 'failed',
            error_message: error.message,
          });
        }
      })();

      return { isFirstInstall: true, jobId, autoSyncTriggered: true, themeEditorUrl };
    }

    return { isFirstInstall: false, existingJob: existingJob?.status, themeEditorUrl };
  } catch (error) {
    console.error('Error checking installation status:', error);
    return { isFirstInstall: false, error: error.message, themeEditorUrl };
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

function Index({ loaderData }) {
  const shopify = useAppBridge();

  useEffect(() => {
    if (loaderData?.isFirstInstall && loaderData?.autoSyncTriggered) {
      shopify.toast.show("🚀 Automatic product sync started! Your Shopify products are being synced to MongoDB in the background.");
    }
  }, [loaderData?.isFirstInstall, loaderData?.autoSyncTriggered, shopify]);

  const openThemeEditor = () => {
    const themeEditorUrl = loaderData?.themeEditorUrl;
    if (themeEditorUrl) {
      window.open(themeEditorUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 16px',
    },
    stepSection: {
      display: 'flex',
      flexDirection: 'row',
      gap: '24px',
      padding: '24px',
      border: '1px solid #e1e3e5',
      borderRadius: '8px',
      backgroundColor: '#fff',
    },
    stepContent: {
      flex: '1',
    },
    image: {
      width: '100%',
      height: '100%',
      
      objectFit: 'contain',
      maxHeight: '100%',
      border: '2px solid #000',
      maxWidth: 600,
    },
  };

  const steps = [
    {
      title: "Step 1: Open Theme Editor",
      image: null,
      content: (
        <>
          <s-paragraph>
            Click the button below to open your theme editor. This will take you to where you need to customize your product template and add the AI Product Summary block.
          </s-paragraph>
          <s-paragraph>
            <s-text emphasis="subdued">Alternatively, you can manually navigate to <s-text emphasis="strong">Online Store {'>'} Themes {'>'} Customize</s-text> and select the product template.</s-text>
          </s-paragraph>
          <s-button variant="primary" onClick={openThemeEditor}>
            Open Theme Editor
          </s-button>
        </>
      ),
    },
    {
      title: "Step 2: Add the AI Product Summary Block",
      image: step2mage,
      content: (
        <>
          <s-paragraph>
            Now you'll add the AI Product Summary block to your product detail page:
          </s-paragraph>
          <s-ordered-list>
            <s-list-item>
              In the left sidebar of the theme editor, look for the product page section. This may be called <s-text emphasis="strong">Product information</s-text>, <s-text emphasis="strong">Product pages</s-text>, or similar depending on your theme.
            </s-list-item>
            <s-list-item>
              Click the <s-text emphasis="strong">Add block</s-text> button (usually a + icon) within that section
            </s-list-item>
            <s-list-item>
              In the block selection menu that appears, switch to the <s-text emphasis="strong">Apps</s-text> tab
            </s-list-item>
            <s-list-item>
              Find and click on <s-text emphasis="strong">AI Product Summary</s-text> (it should show "AI Product Summary Generator" underneath)
            </s-list-item>
            <s-list-item>
              The block will be added to your product page
            </s-list-item>
          </s-ordered-list>
        </>
      ),
    },
    {
      title: "Step 3: Configure Block Settings",
      image: step3mage,
      content: (
        <>
          <s-paragraph>
            Customize how the AI Product Summary appears on your product pages:
          </s-paragraph>
          <s-ordered-list>
            <s-list-item>
              Click on the newly added <s-text emphasis="strong">AI Product Summary</s-text> block in the left sidebar
            </s-list-item>
            <s-list-item>
              You'll see settings options appear:
              <s-unordered-list>
                <s-list-item>
                  <s-text emphasis="strong">Show AI Product Title</s-text> - Toggle to display or hide the product title
                </s-list-item>
                <s-list-item>
                  <s-text emphasis="strong">Show AI Product Description</s-text> - Toggle to display or hide the product description
                </s-list-item>
              </s-unordered-list>
            </s-list-item>
            <s-list-item>
              Adjust these settings based on your preferences
            </s-list-item>
          </s-ordered-list>
        </>
      ),
    },
    {
      title: "Step 4: Position the Block",
      image: null,
      content: (
        <>
          <s-paragraph>
            You can drag and drop the AI Product Summary block to position it where you want:
          </s-paragraph>
          <s-ordered-list>
            <s-list-item>
              Click and hold the drag handle (⋮⋮) next to the block name
            </s-list-item>
            <s-list-item>
              Drag it up or down within the Product information section
            </s-list-item>
            <s-list-item>
              Place it where you think it will look best (commonly placed after the product title or description)
            </s-list-item>
          </s-ordered-list>
        </>
      ),
    },
    {
      title: "Step 5: Save Your Changes",
      image: null,
      content: (
        <>
          <s-paragraph>
            Once you're happy with the placement and settings:
          </s-paragraph>
          <s-ordered-list>
            <s-list-item>
              Click the <s-text emphasis="strong">Save</s-text> button in the top right corner of the Theme Editor
            </s-list-item>
            <s-list-item>
              Your changes are now live on your store!
            </s-list-item>
          </s-ordered-list>
        </>
      ),
    },
    {
      title: "Step 6: Preview and Test",
      image: null,
      content: (
        <>
          <s-paragraph>
            Verify that the AI Product Summary is displaying correctly:
          </s-paragraph>
          <s-ordered-list>
            <s-list-item>
              Click the <s-text emphasis="strong">Preview</s-text> button in the Theme Editor to see how it looks
            </s-list-item>
            <s-list-item>
              Navigate to a product page to see the AI-enhanced summary
            </s-list-item>
          </s-ordered-list>
        </>
      ),
    },
  ];

  return (
    <s-page heading="Setup Guide" inlineSize="large">
      <div className="setup-guide-wrapper">
        <div style={styles.container}>
          <s-banner tone="info">
            <s-paragraph>
              Follow these step-by-step instructions to set up the AI Product Summary app block in your theme and start displaying AI-generated product summaries on your store.
            </s-paragraph>
          </s-banner>

          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                ...styles.stepSection,
                gridTemplateColumns: step.image ? '1fr 1fr' : '1fr',
              }}
              className={`setup-guide-step-section ${!step.image ? 'no-image' : ''}`}
            >
              <div style={styles.stepContent}>
                <s-section heading={step.title}>
                  <s-stack direction="block" gap="base">
                    {step.content}
                  </s-stack>
                </s-section>
              </div>
              {step.image && (
                <div style={styles.stepImage} className="setup-guide-step-image">
                  <img
                    src={step.image}
                    alt={step.title}
                    style={styles.image}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </s-page>
  );
}

Index.propTypes = {
  loaderData: PropTypes.shape({
    isFirstInstall: PropTypes.bool,
    autoSyncTriggered: PropTypes.bool,
    themeEditorUrl: PropTypes.string,
    jobId: PropTypes.string,
    existingJob: PropTypes.string,
    error: PropTypes.string,
  }),
};

export default Index;

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
