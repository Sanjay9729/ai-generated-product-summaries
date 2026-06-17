import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Maps locale codes to the language name used in AI prompts
const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ja: 'Japanese',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  ko: 'Korean',
  ru: 'Russian',
  tr: 'Turkish',
  pl: 'Polish',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  el: 'Greek',
  cs: 'Czech',
  ro: 'Romanian',
  hu: 'Hungarian',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  uk: 'Ukrainian',
  he: 'Hebrew',
  bn: 'Bengali',
};

export async function generateProductSummary(productTitle, productDescription, targetLanguage = 'en') {
  try {
    console.log(`Generating AI summary for: ${productTitle} (${targetLanguage})`);

    const hasDescription = !!productDescription;
    const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const languageInstruction = `- Write the enhancedTitle and enhancedDescription in ${languageName}`;

    const prompt = hasDescription
      ? `You are a product summarizer. Create a concise, engaging 2-sentence product summary.

Product: ${productTitle}
Details: ${productDescription}

Requirements:
- Write EXACTLY 2 sentences (not 2 lines)
- Keep it descriptive but concise
- Make the title more compelling and unique (different from original title)
- Include specific details about materials, design, or features
- End with how it enhances the wearer's style or appearance
- Make it engaging but not overly long
${languageInstruction}

Example style:
"The Boho Bangle Bracelet is a stylish gold bangle adorned with multicolor tassels. Its bohemian design makes it a perfect accessory for adding a touch of eclectic charm to any outfit."

Your response must be a valid JSON object containing exactly two keys:
"enhancedTitle": string value (the enhanced title in ${languageName})
"enhancedDescription": string value (the 2-sentence summary in ${languageName})`
      : `You are a product title enhancer. Create a more compelling, unique product title.

Product: ${productTitle}

Requirements:
- Make the title more compelling, unique, and marketable
- Keep it concise (3-8 words)
- Do NOT invent a description — only enhance the title
${languageInstruction}

Your response must be a valid JSON object containing exactly two keys:
"enhancedTitle": string value (the enhanced title in ${languageName})
"enhancedDescription": string value (always an empty string "")`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const response = chatCompletion.choices[0]?.message?.content;
    console.log("RAW GROQ RESPONSE:", response);

    if (!response) {
      throw new Error('No response from Groq AI');
    }

    const parsedResponse = JSON.parse(response);

    console.log(`✓ AI summary generated for: ${productTitle}`);

    return {
      enhancedTitle: parsedResponse.enhancedTitle || productTitle,
      enhancedDescription: hasDescription ? (parsedResponse.enhancedDescription || productDescription) : '',
      originalTitle: productTitle,
      originalDescription: productDescription || '',
    };
  } catch (error) {
    console.error('Error generating product summary with Groq AI:', error);
    throw error;
  }
}

export async function generateBulkProductSummaries(products) {
  const results = [];

  console.log(`Starting bulk AI summary generation for ${products.length} products...`);

  for (const product of products) {
    try {
      const summary = await generateProductSummary(
        product.title,
        product.description
      );

      results.push({
        productId: product.shopify_product_id,
        ...summary,
        success: true,
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to generate summary for ${product.title}:`, error);
      results.push({
        productId: product.shopify_product_id,
        success: false,
        error: error.message,
      });
    }
  }

  console.log(`✓ Bulk AI summary generation completed. Success: ${results.filter(r => r.success).length}/${products.length}`);

  return results;
}

export async function translateProductSummary(title, description, targetLanguage) {
  try {
    const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    console.log(`Translating AI summary to: ${languageName}`);

    const prompt = `You are a professional translator. Translate the following product title and description from English to ${languageName}.

Title: ${title}
Description: ${description}

Your response must be a valid JSON object containing exactly two keys:
"enhancedTitle": string value (the translated title in ${languageName})
"enhancedDescription": string value (the translated description in ${languageName})`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const response = chatCompletion.choices[0]?.message?.content;
    console.log(`[translateProductSummary] RAW GROQ RESPONSE (${languageName}):`, response);

    if (!response) {
      throw new Error('No response from Groq AI');
    }

    const parsedResponse = JSON.parse(response);

    console.log(`✓ Translation generated for "${title}" -> ${languageName}`);

    return {
      enhancedTitle: parsedResponse.enhancedTitle || title,
      enhancedDescription: parsedResponse.enhancedDescription || description,
    };
  } catch (error) {
    console.error(`[translateProductSummary] Error translating to ${targetLanguage}:`, error);
    throw error;
  }
}

