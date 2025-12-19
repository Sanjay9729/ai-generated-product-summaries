# API Fetch Examples for Product Summary

## Basic Usage (JavaScript)

```javascript
// Fetch AI summary for a product
const productId = ShopifyAnalytics.meta.product.gid; // Shopify product GID
const response = await fetch(`/apps/ai-product-summary/api/getProductSummary?id=${productId}`);

if (response.ok) {
    const data = await response.json();
    console.log(data);
} else {
    console.error('Failed to fetch AI summary');
}
```

## API Response Structure

```javascript
{
    "productSummary": "AI-generated enhanced product description...",
    "enhancedTitle": "AI-improved product title",
    "originalTitle": "Original product title",
    "productId": "gid://shopify/Product/123456789"
}
```

## Error Response Examples

### Missing Product ID (400)
```javascript
{
    "error": "Product ID is required"
}
```

### No AI Summary Found (200)
```javascript
{
    "productSummary": null,
    "enhancedTitle": null,
    "message": "No AI summary found for this product"
}
```

### Server Error (500)
```javascript
{
    "error": "Failed to fetch AI summary"
}
```

## Complete Fetch Example

```javascript
async function fetchProductSummary(productId) {
    try {
        const response = await fetch(`/apps/ai-product-summary/api/getProductSummary?id=${productId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle case where no AI summary exists
        if (!data.productSummary) {
            console.log(data.message || 'No AI summary available');
            return null;
        }
        
        return {
            summary: data.productSummary,
            enhancedTitle: data.enhancedTitle,
            originalTitle: data.originalTitle
        };
        
    } catch (error) {
        console.error('Error fetching product summary:', error);
        return null;
    }
}

// Usage
const summary = await fetchProductSummary(ShopifyAnalytics.meta.product.gid);
if (summary) {
    document.getElementById('ai-summary').textContent = summary.summary;
    document.getElementById('enhanced-title').textContent = summary.enhancedTitle;
}
```

## CORS Support
The API includes CORS headers (`Access-Control-Allow-Origin: *`), so it can be called directly from:
- Shopify theme files (Liquid + JavaScript)
- Browser console
- External websites (if needed)