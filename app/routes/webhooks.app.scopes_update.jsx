import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    console.log("🔔 APP_SCOPES_UPDATE webhook received");

    // Enhanced HMAC verification and authentication
    const { payload, session, topic, shop } = await authenticate.webhook(request);

    // Verify this is actually an APP_SCOPES_UPDATE webhook
    if (topic !== 'APP_SCOPES_UPDATE') {
      console.error(`❌ Invalid webhook topic: ${topic}`);
      return new Response("Invalid webhook topic", { status: 400 });
    }

    console.log(`Received ${topic} webhook for ${shop}`);

    if (!payload) {
      console.error(`❌ No payload received for ${topic}`);
      return new Response("No payload", { status: 400 });
    }

    const current = payload.current;
    const previous = payload.previous;

    console.log(`📋 Scope update details:`);
    console.log(`   Shop: ${shop}`);
    console.log(`   Previous scopes: ${previous}`);
    console.log(`   Current scopes: ${current}`);

    // Update the session with new scopes if session exists
    if (session) {
      try {
        await db.session.update({
          where: {
            id: session.id,
          },
          data: {
            scope: current.toString(),
          },
        });
        console.log(`✓ Session scopes updated for shop: ${shop}`);
      } catch (updateError) {
        console.error(`❌ Failed to update session scopes for ${shop}:`, updateError);
      }
    } else {
      console.log(`ℹ️ No session found for shop: ${shop}`);
    }

    // Log the scope change for monitoring and compliance
    console.log(`📝 Scope change logged for ${shop}: ${previous} → ${current}`);

    // Check if critical scopes were removed (compliance check)
    const removedScopes = previous
      .split(',')
      .filter(scope => scope.trim() && !current.includes(scope.trim()));
    
    const addedScopes = current
      .split(',')
      .filter(scope => scope.trim() && !previous.includes(scope.trim()));

    if (removedScopes.length > 0) {
      console.warn(`⚠️ Critical scopes removed from ${shop}: ${removedScopes.join(', ')}`);
    }

    if (addedScopes.length > 0) {
      console.log(`➕ New scopes granted to ${shop}: ${addedScopes.join(', ')}`);
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("❌ Error handling app scopes update webhook:", error);
    // Return 200 OK even on error to prevent Shopify from retrying
    return new Response("OK", { status: 200 });
  }
};
