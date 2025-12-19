// Clean ALL AI summary data and generate completely NEW summaries for all products
import 'dotenv/config';
import { connectToMongoDB } from './database/connection.js';
import { getAllProducts, deleteAllAISummaries, saveAISummary } from './database/collections.js';
import { generateProductSummary } from './backend/services/groqAIService.js';

async function cleanAndRegenerateAll() {
  try {
    console.log('🗑️  STARTING COMPLETE AI SUMMARY CLEANUP AND REGENERATION');
    console.log('=============================================================');
    
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
    console.log('\n🤖 GENERATING COMPLETELY NEW AI SUMMARIES FOR ALL PRODUCTS...');
    console.log('Using new Llama-4-Scout model with aggressive concise prompt');
    
    const productsWithContent = products.filter(p => p.title && p.description);
    console.log(`🎯 Processing ${productsWithContent.length} products with content...`);

    let successCount = 0;
    let errorCount = 0;
    const newSummaries = [];

    for (let i = 0; i < productsWithContent.length; i++) {
      const product = productsWithContent[i];
      
      try {
        console.log(`\n[${i + 1}/${productsWithContent.length}] 🎯 Generating NEW summary for: "${product.title}"`);
        
        // Generate completely new AI summary
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

        console.log(`✅ NEW summary generated and stored`);
        console.log(`   📝 Title: "${aiSummary.enhancedTitle}"`);
        console.log(`   📄 Description: "${aiSummary.enhancedDescription.substring(0, 80)}..."`);
        
        newSummaries.push({
          product: product.title,
          enhancedTitle: aiSummary.enhancedTitle,
          enhancedDescription: aiSummary.enhancedDescription
        });
        
        successCount++;

        // Rate limiting delay
        if (i < productsWithContent.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Failed to generate NEW summary for "${product.title}":`, error.message);
        errorCount++;
      }
    }

    // Final Results
    console.log('\n🎉 COMPLETE CLEANUP AND REGENERATION FINISHED!');
    console.log('===============================================');
    console.log(`✅ SUCCESS: ${successCount} products got NEW AI summaries`);
    console.log(`❌ ERRORS: ${errorCount} products failed`);
    console.log(`📊 TOTAL: ${productsWithContent.length} products processed`);
    console.log(`🗑️  Old data: COMPLETELY DELETED`);
    console.log(`🆕 New data: COMPLETELY GENERATED`);

    // Show sample of new data
    console.log('\n📋 SAMPLE OF NEW AI SUMMARIES:');
    console.log('================================');
    newSummaries.slice(0, 3).forEach((summary, index) => {
      console.log(`${index + 1}. ${summary.product}`);
      console.log(`   Title: "${summary.enhancedTitle}"`);
      console.log(`   Desc: "${summary.enhancedDescription}"`);
      console.log('');
    });

    console.log('🚀 ALL PRODUCTS NOW HAVE COMPLETELY NEW AI SUMMARIES!');
    
  } catch (error) {
    console.error('💥 Error during cleanup and regeneration:', error);
  }
}

cleanAndRegenerateAll();