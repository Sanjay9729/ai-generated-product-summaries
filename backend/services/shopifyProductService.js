import { updateProduct, logSync, saveAISummary, getAISummary } from '../../database/collections.js';
import { generateProductSummary } from './groqAIService.js';

export async function fetchAllShopifyProducts(admin) {
  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  console.log('Starting to fetch all products from Shopify...');

  try {
    while (hasNextPage) {
      const query = `#graphql
        query GetProducts($cursor: String) {
          products(first: 250, after: $cursor) {
            edges {
              node {
                id
                title
                description
                descriptionHtml
                handle
                status
                vendor
                productType
                tags
                createdAt
                updatedAt
                publishedAt
                onlineStoreUrl
                options {
                  id
                  name
                  values
                  position
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      price
                      compareAtPrice
                      sku
                      barcode
                      inventoryQuantity
                      image {
                        id
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
                images(first: 250) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                featuredImage {
                  id
                  url
                  altText
                  width
                  height
                }
                seo {
                  title
                  description
                }
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                totalInventory
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await admin.graphql(query, {
        variables: { cursor },
      });

      const data = await response.json();

      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error('Failed to fetch products from Shopify');
      }

      const products = data.data.products.edges.map(edge => edge.node);
      allProducts = [...allProducts, ...products];

      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;

      console.log(`Fetched ${allProducts.length} products so far...`);
    }

    console.log(`✓ Total products fetched from Shopify: ${allProducts.length}`);
    return allProducts;
  } catch (error) {
    console.error('Error fetching products from Shopify:', error);
    throw error;
  }
}

export async function syncProductsToMongoDB(admin, shop) {
  const startTime = new Date();
  let syncStatus = 'success';
  let errorMessage = null;
  let productsCount = 0;

  try {
    console.log(`Starting product sync to MongoDB for shop: ${shop}...`);

    const shopifyProducts = await fetchAllShopifyProducts(admin);
    productsCount = shopifyProducts.length;

    for (const product of shopifyProducts) {
      const productData = {
        shopify_product_id: product.id,
        title: product.title,
        description: product.description,
        description_html: product.descriptionHtml,
        handle: product.handle,
        status: product.status,
        vendor: product.vendor,
        product_type: product.productType,
        tags: product.tags,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        published_at: product.publishedAt,
        online_store_url: product.onlineStoreUrl,
        options: product.options,
        variants: product.variants.edges.map(edge => ({
          id: edge.node.id,
          title: edge.node.title,
          price: edge.node.price,
          compare_at_price: edge.node.compareAtPrice,
          sku: edge.node.sku,
          barcode: edge.node.barcode,
          inventory_quantity: edge.node.inventoryQuantity,
          image: edge.node.image,
        })),
        images: product.images.edges.map(edge => ({
          id: edge.node.id,
          url: edge.node.url,
          alt_text: edge.node.altText,
          width: edge.node.width,
          height: edge.node.height,
        })),
        featured_image: product.featuredImage,
        seo: product.seo,
        price_range: product.priceRangeV2,
        total_inventory: product.totalInventory,
        synced_at: new Date(),
      };

      await updateProduct(product.id, productData, shop);

      // Auto-generate AI summary if it doesn't exist
      try {
        const existingSummary = await getAISummary(product.id, shop);

        if (!existingSummary && product.title) {
          console.log(`Generating AI summary for: ${product.title}`);

          const aiSummary = await generateProductSummary(
            product.title,
            product.description
          );

          await saveAISummary(product.id, {
            shopify_product_id: product.id,
            product_title: product.title,
            original_title: aiSummary.originalTitle,
            original_description: aiSummary.originalDescription,
            enhanced_title: aiSummary.enhancedTitle,
            enhanced_description: aiSummary.enhancedDescription,
            created_at: new Date(),
          }, shop);

          console.log(`✓ AI summary generated for: ${product.title}`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (aiError) {
        console.error(`Failed to generate AI summary for ${product.title}:`, aiError.message);
        // Continue with next product even if AI generation fails
      }
    }

    console.log(`✓ Successfully synced ${productsCount} products to MongoDB for ${shop}`);
  } catch (error) {
    console.error('Error syncing products to MongoDB:', error);
    syncStatus = 'failed';
    errorMessage = error.message;
    throw error;
  } finally {
    const endTime = new Date();
    const duration = endTime - startTime;

    await logSync({
      shop,
      status: syncStatus,
      products_count: productsCount,
      duration_ms: duration,
      error_message: errorMessage,
    });
  }

  return {
    status: syncStatus,
    products_count: productsCount,
  };
}
