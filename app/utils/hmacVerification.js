import crypto from "crypto";

/**
 * HMAC Signature Verification for Shopify Webhooks
 * This utility provides explicit HMAC verification as required by Shopify App Store
 */

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";

/**
 * Verify HMAC signature from Shopify webhook
 * @param {string} rawBody - Raw request body as string
 * @param {string} hmacHeader - HMAC header from request
 * @returns {boolean} - True if HMAC is valid, false otherwise
 */
export function verifyShopifyWebhookHmac(rawBody, hmacHeader) {
  if (!SHOPIFY_API_SECRET) {
    console.error("❌ SHOPIFY_API_SECRET not configured");
    return false;
  }

  if (!rawBody || !hmacHeader) {
    console.error("❌ Missing rawBody or hmacHeader for verification");
    return false;
  }

  try {
    // Create HMAC using the raw body and API secret
    const calculatedHmac = crypto
      .createHmac("sha256", SHOPIFY_API_SECRET)
      .update(rawBody, "utf8")
      .digest("base64");

    // Compare the calculated HMAC with the header value
    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHmac, "utf8"),
      Buffer.from(hmacHeader, "utf8")
    );

    if (!isValid) {
      console.error("❌ HMAC verification failed");
      console.error(`Expected: ${calculatedHmac}`);
      console.error(`Received: ${hmacHeader}`);
    }

    return isValid;
  } catch (error) {
    console.error("❌ Error during HMAC verification:", error);
    return false;
  }
}

/**
 * Extract and verify HMAC from request headers
 * @param {Request} request - The HTTP request object
 * @param {string} rawBody - Raw request body
 * @returns {Promise<boolean>} - True if HMAC is valid
 */
export async function verifyRequestHmac(request, rawBody) {
  try {
    // Get HMAC header from request
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
    
    if (!hmacHeader) {
      console.error("❌ No x-shopify-hmac-sha256 header found");
      return false;
    }

    // Verify the HMAC signature
    const isValid = verifyShopifyWebhookHmac(rawBody, hmacHeader);
    
    if (isValid) {
      console.log("✅ HMAC verification successful");
    } else {
      console.error("❌ HMAC verification failed");
    }

    return isValid;
  } catch (error) {
    console.error("❌ Error extracting and verifying HMAC:", error);
    return false;
  }
}

/**
 * Enhanced webhook authentication with explicit HMAC verification
 * This function should be used in webhook handlers for compliance
 * @param {Request} request - The HTTP request object
 * @returns {Promise<Object>} - Authenticated webhook data
 */
export async function authenticateWithHmacVerification(request) {
  try {
    // Get raw body for HMAC verification
    const rawBody = await request.text();
    
    // Verify HMAC signature first
    const hmacValid = await verifyRequestHmac(request, rawBody);
    
    if (!hmacValid) {
      throw new Error("HMAC verification failed - unauthorized webhook");
    }

    // Parse the body after HMAC verification
    const payload = JSON.parse(rawBody);
    
    // Get shop domain from headers
    const shopDomain = request.headers.get("x-shopify-shop-domain");
    
    // Get webhook topic
    const topic = request.headers.get("x-shopify-topic");
    
    // Get webhook ID
    const webhookId = request.headers.get("x-shopify-webhook-id");
    
    // Get webhook timestamp
    const timestamp = request.headers.get("x-shopify-webhook-timestamp");

    const authData = {
      payload,
      shop: shopDomain,
      topic,
      webhookId,
      timestamp,
      rawBody,
      hmacVerified: true
    };

    console.log(`🔐 HMAC-verified webhook: ${topic} for ${shopDomain}`);
    
    return authData;
  } catch (error) {
    console.error("❌ Error in HMAC-verified authentication:", error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}