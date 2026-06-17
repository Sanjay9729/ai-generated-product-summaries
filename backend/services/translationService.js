import { generateProductSummary, translateProductSummary } from './groqAIService.js';
import { saveAISummaryTranslation, getShopSettings } from '../../database/collections.js';

// Resolves the AI summary for a given locale, lazily generating and
// caching a translation if one doesn't exist yet for that language.
export async function resolveLocalizedSummary(aiSummary, lang, shop) {
  let enhancedTitle = aiSummary.enhanced_title;
  let enhancedDescription = aiSummary.enhanced_description;

  const shopSettings = await getShopSettings(shop);
  const primaryLanguage = (shopSettings?.primary_language || 'en').toLowerCase().split('-')[0];
  const requestedLang = (lang || 'en').toLowerCase().split('-')[0];

  // The storefront only sends a non-'en' lang if a non-English locale is
  // actually published. Otherwise, fall back to the merchant's configured
  // primary language so it can act as the default summary for everyone.
  const normalizedLang = requestedLang === 'en' ? primaryLanguage : requestedLang;

  console.log(`[resolveLocalizedSummary] shop=${shop} productId=${aiSummary.shopify_product_id} requestedLang=${lang} primaryLanguage=${primaryLanguage} normalizedLang=${normalizedLang}`);

  if (normalizedLang === 'en') {
    console.log('[resolveLocalizedSummary] resolved language is English, returning original summary');
    return { enhancedTitle, enhancedDescription };
  }

  const existingTranslation = aiSummary.translations?.[normalizedLang];
  if (existingTranslation) {
    console.log(`[resolveLocalizedSummary] found cached translation for "${normalizedLang}"`);
    return {
      enhancedTitle: existingTranslation.enhanced_title,
      enhancedDescription: existingTranslation.enhanced_description,
    };
  }

  if (!aiSummary.original_title) {
    console.log('[resolveLocalizedSummary] no original_title on aiSummary, skipping translation');
    return { enhancedTitle, enhancedDescription };
  }

  try {
    // Translate the already optimized English title/description for consistency
    console.log(`[resolveLocalizedSummary] generating translation for "${normalizedLang}"...`);
    const generated = await translateProductSummary(
      enhancedTitle || aiSummary.original_title,
      enhancedDescription || aiSummary.original_description || '',
      normalizedLang
    );

    const translation = {
      enhanced_title: generated.enhancedTitle,
      enhanced_description: generated.enhancedDescription,
    };

    console.log(`[resolveLocalizedSummary] translation generated:`, translation);

    await saveAISummaryTranslation(aiSummary.shopify_product_id, shop, normalizedLang, translation);

    return {
      enhancedTitle: translation.enhanced_title,
      enhancedDescription: translation.enhanced_description,
    };
  } catch (error) {
    console.error(`[resolveLocalizedSummary] Failed to generate ${normalizedLang} translation for ${aiSummary.shopify_product_id}:`, error);
    return { enhancedTitle, enhancedDescription };
  }
}
