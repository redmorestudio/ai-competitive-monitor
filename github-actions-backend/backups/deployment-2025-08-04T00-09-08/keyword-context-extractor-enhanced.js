#!/usr/bin/env node

/**
 * Enhanced Keyword Context Extractor using Smart Content Extraction
 * 
 * This version uses the smart content extractor to:
 * - Focus on main article content for keyword contexts
 * - Reduce false positives from boilerplate text
 * - Provide quality-scored contexts
 * - Track whether keywords appear in main content vs boilerplate
 */

const SmartContentExtractor = require('./smart-content-extractor');
const { db, end } = require('./postgres-db');

// SSL fix for production
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

class EnhancedKeywordContextExtractor {
  constructor() {
    this.smartExtractor = new SmartContentExtractor();
    this.stats = {
      totalProcessed: 0,
      mainContentContexts: 0,
      boilerplateContexts: 0,
      highQualityContexts: 0
    };
  }

  async extractAndStoreContexts(companyName = null) {
    console.log('🔍 Enhanced Keyword Context Extraction');
    console.log('=' .repeat(60));
    
    try {
      // Get keywords to search for
      const keywords = await this.getKeywords();
      console.log(`Found ${keywords.length} keywords to search for`);
      
      // Build query for pages to process
      let query = `
        SELECT 
          sp.company,
          sp.url,
          sp.html,
          sp.content_hash,
          sp.scraped_at
        FROM raw_content.scraped_pages sp
        WHERE sp.html IS NOT NULL
          AND sp.content_hash IS NOT NULL
      `;
      
      const params = [];
      if (companyName) {
        query += ` AND sp.company = $1`;
        params.push(companyName);
      }
      
      query += ` ORDER BY sp.scraped_at DESC LIMIT 100`;
      
      const pages = await db.all(query, params);
      console.log(`Processing ${pages.length} pages...`);
      
      for (const page of pages) {
        await this.processPage(page, keywords);
      }
      
      // Generate summary
      await this.generateSummary();
      
    } catch (error) {
      console.error('❌ Fatal error:', error);
      throw error;
    } finally {
      await end();
    }
  }

  async getKeywords() {
    // Get keywords from different categories
    const keywordQueries = [
      // Company names
      `SELECT DISTINCT name as keyword, 'company' as type 
       FROM monitoring.companies WHERE active = true`,
      
      // Products (if we have a products table)
      `SELECT DISTINCT product_name as keyword, 'product' as type 
       FROM intelligence.baseline_analysis 
       WHERE product_name IS NOT NULL`,
      
      // Technologies (common AI terms)
      `SELECT unnest(ARRAY[
        'GPT', 'LLM', 'transformer', 'neural network', 'machine learning',
        'deep learning', 'AI', 'artificial intelligence', 'NLP',
        'computer vision', 'reinforcement learning', 'generative AI'
      ]) as keyword, 'technology' as type`,
      
      // Specific products we're tracking
      `SELECT unnest(ARRAY[
        'ChatGPT', 'GPT-4', 'Claude', 'Gemini', 'Llama', 'PhariaAI',
        'PhariaAssistant', 'Aleph', 'Luminous', 'Bard'
      ]) as keyword, 'product' as type`
    ];
    
    const keywords = [];
    for (const query of keywordQueries) {
      try {
        const results = await db.all(query);
        keywords.push(...results);
      } catch (error) {
        console.warn(`Warning: Could not fetch keywords:`, error.message);
      }
    }
    
    // Deduplicate
    const uniqueKeywords = Array.from(
      new Map(keywords.map(k => [k.keyword.toLowerCase(), k])).values()
    );
    
    return uniqueKeywords;
  }

  async processPage(page, keywords) {
    try {
      this.stats.totalProcessed++;
      
      // Extract keyword contexts using smart extraction
      const keywordTerms = keywords.map(k => k.keyword);
      const result = this.smartExtractor.extractKeywordContexts(
        page.html, 
        page.url, 
        keywordTerms
      );
      
      if (result.contexts.length === 0) {
        return;
      }
      
      // Group contexts by keyword
      const contextsByKeyword = {};
      for (const context of result.contexts) {
        if (!contextsByKeyword[context.keyword]) {
          contextsByKeyword[context.keyword] = [];
        }
        contextsByKeyword[context.keyword].push(context);
      }
      
      // Store contexts in database
      for (const [keyword, contexts] of Object.entries(contextsByKeyword)) {
        // Find keyword type
        const keywordInfo = keywords.find(
          k => k.keyword.toLowerCase() === keyword.toLowerCase()
        );
        
        // Separate main content and boilerplate contexts
        const mainContexts = contexts.filter(c => c.isMainContent);
        const boilerplateContexts = contexts.filter(c => !c.isMainContent);
        
        // Calculate average quality
        const avgQuality = mainContexts.length > 0
          ? mainContexts.reduce((sum, c) => sum + c.quality, 0) / mainContexts.length
          : 0;
        
        // Store in database
        await db.run(`
          INSERT INTO processed_content.keyword_contexts
          (company, url, keyword, keyword_type, contexts, 
           main_content_count, boilerplate_count, avg_quality,
           extraction_method, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (company, url, keyword) DO UPDATE SET
            contexts = EXCLUDED.contexts,
            main_content_count = EXCLUDED.main_content_count,
            boilerplate_count = EXCLUDED.boilerplate_count,
            avg_quality = EXCLUDED.avg_quality,
            extraction_method = EXCLUDED.extraction_method,
            updated_at = NOW()
        `, [
          page.company,
          page.url,
          keyword,
          keywordInfo?.type || 'unknown',
          JSON.stringify(mainContexts), // Only store main content contexts
          mainContexts.length,
          boilerplateContexts.length,
          avgQuality,
          result.method
        ]);
        
        // Update stats
        this.stats.mainContentContexts += mainContexts.length;
        this.stats.boilerplateContexts += boilerplateContexts.length;
        this.stats.highQualityContexts += mainContexts.filter(c => c.quality >= 7).length;
      }
      
      if (this.stats.totalProcessed % 10 === 0) {
        console.log(`  Processed ${this.stats.totalProcessed} pages...`);
        console.log(`  Main contexts: ${this.stats.mainContentContexts}, Boilerplate: ${this.stats.boilerplateContexts}`);
      }
      
    } catch (error) {
      console.error(`Error processing page ${page.url}:`, error.message);
    }
  }

  async generateSummary() {
    console.log('\n📊 Extraction Summary');
    console.log('=' .repeat(60));
    
    // Get extraction stats
    const extractorStats = this.smartExtractor.getStats();
    console.log('\n📈 Extractor Performance:');
    console.log(`  Total pages processed: ${extractorStats.totalProcessed}`);
    console.log(`  Readability success rate: ${extractorStats.successRate}`);
    console.log(`  Fallback used: ${extractorStats.fallbackUsed}`);
    
    console.log('\n📊 Context Statistics:');
    console.log(`  Total contexts found: ${this.stats.mainContentContexts + this.stats.boilerplateContexts}`);
    console.log(`  Main content contexts: ${this.stats.mainContentContexts}`);
    console.log(`  Boilerplate contexts: ${this.stats.boilerplateContexts}`);
    console.log(`  High quality contexts (≥7): ${this.stats.highQualityContexts}`);
    
    const reductionRate = this.stats.boilerplateContexts > 0
      ? ((this.stats.boilerplateContexts / (this.stats.mainContentContexts + this.stats.boilerplateContexts)) * 100).toFixed(1)
      : 0;
    console.log(`  Boilerplate reduction: ${reductionRate}% of contexts filtered out`);
    
    // Get top keywords by quality
    try {
      const topKeywords = await db.all(`
        SELECT 
          keyword,
          keyword_type,
          COUNT(*) as page_count,
          SUM(main_content_count) as total_main_contexts,
          SUM(boilerplate_count) as total_boilerplate_contexts,
          AVG(avg_quality) as overall_quality
        FROM processed_content.keyword_contexts
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY keyword, keyword_type
        ORDER BY overall_quality DESC
        LIMIT 10
      `);
      
      if (topKeywords.length > 0) {
        console.log('\n🏆 Top Keywords by Quality:');
        for (const kw of topKeywords) {
          console.log(`  ${kw.keyword} (${kw.keyword_type})`);
          console.log(`    Pages: ${kw.page_count}, Main: ${kw.total_main_contexts}, Boilerplate: ${kw.total_boilerplate_contexts}`);
          console.log(`    Quality: ${parseFloat(kw.overall_quality).toFixed(2)}`);
        }
      }
    } catch (error) {
      console.warn('Could not fetch top keywords:', error.message);
    }
  }

  async setupDatabase() {
    console.log('🔧 Setting up database schema...');
    
    try {
      // Create keyword contexts table if it doesn't exist
      await db.run(`
        CREATE TABLE IF NOT EXISTS processed_content.keyword_contexts (
          id SERIAL PRIMARY KEY,
          company VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          keyword VARCHAR(255) NOT NULL,
          keyword_type VARCHAR(50),
          contexts JSONB,
          main_content_count INTEGER DEFAULT 0,
          boilerplate_count INTEGER DEFAULT 0,
          avg_quality DECIMAL(3,2),
          extraction_method VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP,
          UNIQUE(company, url, keyword)
        )
      `);
      
      // Create indexes
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_keyword_contexts_company 
        ON processed_content.keyword_contexts(company)
      `);
      
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_keyword_contexts_keyword 
        ON processed_content.keyword_contexts(keyword)
      `);
      
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_keyword_contexts_quality 
        ON processed_content.keyword_contexts(avg_quality DESC)
      `);
      
      console.log('✅ Database schema ready');
    } catch (error) {
      console.error('❌ Error setting up database:', error);
      throw error;
    }
  }
}

// Main execution
if (require.main === module) {
  const extractor = new EnhancedKeywordContextExtractor();
  
  // Get company name from command line if provided
  const companyName = process.argv[2] || null;
  
  // Setup database and run extraction
  extractor.setupDatabase()
    .then(() => extractor.extractAndStoreContexts(companyName))
    .catch(console.error);
}

module.exports = EnhancedKeywordContextExtractor;
