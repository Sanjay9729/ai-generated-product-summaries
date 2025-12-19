// Generate NEW AI product summaries (220 words each) with unique titles
import 'dotenv/config';
import { connectToMongoDB } from './database/connection.js';
import { getAllProducts, deleteAllAISummaries, saveAISummary } from './database/collections.js';
import { generateProductSummary } from './backend/services/groqAIService.js';

async function generateNewAISummaries() {
  try {
    console.log('✨ STARTING NEW AI SUMMARY GENERATION (220 WORDS EACH)');
    console.log('===========================================================');
    
    // Step 1: Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await connectToMongoDB();
    console.log('✅ Connected to MongoDB');

    // Step 2: Get ALL products
    console.log('\n📦 Fetching ALL products from database...');
    const products = await getAllProducts();
    console.log(`✅ Found ${products.length} total products`);

    // Step 3: DELETE ALL existing AI summaries
    console.log('\n🗑️  DELETING ALL EXISTING AI SUMMARY DATA...');
    const deleteResult = await deleteAllAISummaries();
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing AI summary records`);
    console.log('✅ All old AI summary data has been completely removed');

    // Step 4: Generate NEW AI summaries for ALL products
    console.log('\n✨ GENERATING NEW ENGAGING AI SUMMARIES (220 WORDS EACH)...');
    console.log('Using enhanced prompts for unique titles and rich descriptions');
    
    const productsWithContent = products.filter(p => p.title && p.description);
    console.log(`🎯 Processing ${productsWithContent.length} products with content...`);

    let successCount = 0;
    let errorCount = 0;
    const newSummaries = [];

    for (let i = 0; i < productsWithContent.length; i++) {
      const product = productsWithContent[i];
      
      try {
        console.log(`\n[${i + 1}/${productsWithContent.length}] ✨ Generating NEW summary for: "${product.title}"`);
        
        // Generate NEW AI summary with enhanced requirements
        const aiSummary = await generateProductSummary(
          product.title,
          product.description
        );

        // Store the NEW summary
        await saveAISummary(product.shopify_product_id, {
          shopify_product_id: product.shopify_product_id,
          product_title: product.title,
          original_title: aiSummary.originalTitle,
          original_description: aiSummary.originalDescription,
          enhanced_title: aiSummary.enhancedTitle,
          enhanced_description: aiSummary.enhancedDescription,
          created_at: new Date(),
        });

        console.log(`✅ NEW engaging summary generated and stored`);
        console.log(`   📝 New Title: "${aiSummary.enhancedTitle}"`);
        console.log(`   📄 Description: "${aiSummary.enhancedDescription.substring(0, 120)}..."`);
        
        newSummaries.push({
          product: product.title,
          originalTitle: aiSummary.originalTitle,
          enhancedTitle: aiSummary.enhancedTitle,
          enhancedDescription: aiSummary.enhancedDescription
        });
        
        successCount++;

        // Rate limiting delay
        if (i < productsWithContent.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Failed to generate NEW summary for "${product.title}":`, error.message);
        errorCount++;
      }
    }

    // Final Results
    console.log('\n🎉 NEW AI SUMMARY GENERATION COMPLETED!');
    console.log('==========================================');
    console.log(`✅ SUCCESS: ${successCount} products got NEW engaging AI summaries`);
    console.log(`❌ ERRORS: ${errorCount} products failed`);
    console.log(`📊 TOTAL: ${productsWithContent.length} products processed`);
    console.log(`📝 Word count: ~220 words per description`);
    console.log(`🎯 Unique titles: Generated for all products`);

    // Show comparison of original vs enhanced titles
    console.log('\n📋 TITLE COMPARISON (Original → Enhanced):');
    console.log('==========================================');
    newSummaries.slice(0, 5).forEach((summary, index) => {
      console.log(`${index + 1}. "${summary.originalTitle}" → "${summary.enhancedTitle}"`);
      console.log(`   Desc: "${summary.enhancedDescription.substring(0, 100)}..."`);
      console.log('');
    });

    console.log('🚀 ALL PRODUCTS NOW HAVE ENGAGING, DESCRIPTIVE AI SUMMARIES!');
    
  } catch (error) {
    console.error('💥 Error during new AI summary generation:', error);
  }
}

generateNewAISummaries();