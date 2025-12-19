import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateProductSummary(productTitle, productDescription) {
  try {
    console.log(`Generating AI summary for: ${productTitle}`);

    const prompt = `You are a product summarizer. Create a concise, engaging 2-sentence product summary.

Product: ${productTitle}
Details: ${productDescription || 'Basic product'}

Requirements:
- Write EXACTLY 2 sentences (not 2 lines)
- Keep it descriptive but concise (around 25-35 words total)
- Make the title more compelling and unique (different from original title)
- Include specific details about materials, design, or features
- End with how it enhances the wearer's style or appearance
- Make it engaging but not overly long

Example style:
"The Boho Bangle Bracelet is a stylish gold bangle adorned with multicolor tassels. Its bohemian design makes it a perfect accessory for adding a touch of eclectic charm to any outfit."

Return ONLY JSON:
{
  "enhancedTitle": "Create a compelling, unique title (NOT the same as original)",
  "enhancedDescription": "Your 2-sentence summary here (25-35 words)"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const response = chatCompletion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from Groq AI');
    }

    const parsedResponse = JSON.parse(response);

    console.log(`✓ AI summary generated for: ${productTitle}`);

    return {
      enhancedTitle: parsedResponse.enhancedTitle || productTitle,
      enhancedDescription: parsedResponse.enhancedDescription || productDescription,
      originalTitle: productTitle,
      originalDescription: productDescription,
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
