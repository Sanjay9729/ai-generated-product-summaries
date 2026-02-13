import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new MongoDBSessionStorage(
    process.env.MONGODB_URI,
    process.env.MONGODB_DB || "shopify_app"
  ),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  webhooks: {
    // Mandatory compliance webhooks for App Store with HMAC verification
    APP_INSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/app/installed",
    },
    APP_UNINSTALLED: {
      deliveryMethod: "http", 
      callbackUrl: "/webhooks/app/uninstalled",
    },
    APP_SCOPES_UPDATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/app/scopes_update",
    },
    // Product webhooks with HMAC verification
    PRODUCTS_CREATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/products/create",
    },
    PRODUCTS_UPDATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/products/update",
    },
    PRODUCTS_DELETE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/products/delete",
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
