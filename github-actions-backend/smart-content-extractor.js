#!/usr/bin/env node

/**
 * Smart Content Extractor using Mozilla Readability
 * 
 * Solves the keyword context pollution problem by:
 * 1. Extracting main article content from pages
 * 2. Separating boilerplate (headers/footers) from main content
 * 3. Providing quality-scored keyword contexts
 * 4. Falling back gracefully when extraction fails
 */

const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');

class SmartContentExtractor {
  constructor() {
    this.stats = {
      totalProcessed: 0,
      readabilitySuccess: 0,
      fallbackUsed: 0,
      errors: 0
    };
  }

  /**
   * Extract main content from HTML using Readability
   * @param {string} html - Raw HTML content
   * @param {string} url - Page URL for context
   * @returns {Object} Extracted content with metadata
   */
  extractMainContent(html, url) {
    try {
      // Create virtual DOM
      const doc = new JSDOM(html, { 
        url,
        features: {
          FetchExternalResources: false,
          ProcessExternalResources: false
        }
      });
      
      // Check if page is suitable for extraction
      const document = doc.window.document;
      
      // Try Readability extraction
      const reader = new Readability(document, {
        debug: false,
        maxElemsToParse: 0,  // No limit
        nbTopCandidates: 5,
        charThreshold: 500,
        classesToPreserve: ['code', 'pre', 'table']
      });
      
      const article = reader.parse();
      
      if (article && article.textContent && article.textContent.length > 100) {
        this.stats.readabilitySuccess++;
        return {
          success: true,
          method: 'readability',
          title: article.title || '',
          content: article.textContent,
          contentHtml: article.content,
          excerpt: article.excerpt || '',
          byline: article.byline || '',
          length: article.textContent.length,
          wordCount: article.textContent.split(/\s+/).length,
          siteName: article.siteName || '',
          contentHash: this.generateHash(article.textContent)
        };
      }
      
      // Fallback to basic extraction
      return this.basicExtraction(html, url);
      
    } catch (error) {
      console.error(`Extraction error for ${url}:`, error.message);
      this.stats.errors++;
      return this.basicExtraction(html, url);
    }
  }

  /**
   * Extract boilerplate content separately for change tracking
   */
  extractBoilerplate(html, url) {
    try {
      const doc = new JSDOM(html, { url });
      const document = doc.window.document;
      
      const boilerplate = {
        header: '',
        navigation: '',
        footer: '',
        sidebar: '',
        hash: ''
      };
      
      // Extract header
      const headerSelectors = 'header, [role="banner"], .header, #header, .site-header, .page-header';
      const header = document.querySelector(headerSelectors);
      if (header) {
        boilerplate.header = header.textContent.trim();
      }
      
      // Extract navigation
      const navSelectors = 'nav, [role="navigation"], .navigation, #nav, .navbar, .menu, .nav-menu';
      const nav = document.querySelector(navSelectors);
      if (nav) {
        boilerplate.navigation = nav.textContent.trim();
      }
      
      // Extract footer
      const footerSelectors = 'footer, [role="contentinfo"], .footer, #footer, .site-footer';
      const footer = document.querySelector(footerSelectors);
      if (footer) {
        boilerplate.footer = footer.textContent.trim();
      }
      
      // Extract sidebar
      const sidebarSelectors = 'aside, [role="complementary"], .sidebar, #sidebar, .widget-area';
      const sidebar = document.querySelector(sidebarSelectors);
      if (sidebar) {
        boilerplate.sidebar = sidebar.textContent.trim();
      }
      
      // Generate combined hash for change detection
      const combined = `${boilerplate.header}|${boilerplate.navigation}|${boilerplate.footer}|${boilerplate.sidebar}`;
      boilerplate.hash = this.generateHash(combined);
      
      return boilerplate;
      
    } catch (error) {
      console.error(`Boilerplate extraction error:`, error.message);
      return null;
    }
  }

  /**
   * Basic extraction fallback when Readability fails
   */
  basicExtraction(html, url) {
    try {
      const doc = new JSDOM(html, { url });
      const document = doc.window.document;
      
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());
      
      // Try to find main content area
      const mainSelectors = [
        'main',
        '[role="main"]',
        'article',
        '.content',
        '#content',
        '.post',
        '.article-body',
        '.entry-content'
      ];
      
      let content = '';
      for (const selector of mainSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.length > 100) {
          content = element.textContent;
          break;
        }
      }
      
      // If no main content found, get body text
      if (!content) {
        content = document.body ? document.body.textContent : '';
      }
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim();
      
      this.stats.fallbackUsed++;
      
      return {
        success: true,
        method: 'basic',
        title: document.title || '',
        content: content,
        contentHtml: '',  // No HTML for basic extraction
        excerpt: content.substring(0, 200),
        byline: '',
        length: content.length,
        wordCount: content.split(/\s+/).length,
        siteName: '',
        contentHash: this.generateHash(content)
      };
      
    } catch (error) {
      console.error(`Basic extraction error:`, error.message);
      return {
        success: false,
        method: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Extract keyword contexts from main content only
   */
  extractKeywordContexts(html, url, keywords = []) {
    const mainContent = this.extractMainContent(html, url);
    const boilerplate = this.extractBoilerplate(html, url);
    
    if (!mainContent.success) {
      return { contexts: [], error: mainContent.error };
    }
    
    const contexts = [];
    const text = mainContent.content.toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      sentences.forEach((sentence, idx) => {
        if (sentence.includes(keywordLower)) {
          // Get surrounding sentences for context
          const contextSentences = sentences.slice(
            Math.max(0, idx - 1),
            Math.min(sentences.length, idx + 2)
          );
          
          contexts.push({
            keyword,
            context: contextSentences.join('. ').trim(),
            sentence: sentence.trim(),
            position: idx,
            isMainContent: true,
            quality: this.assessContextQuality(sentence, keywordLower)
          });
        }
      });
      
      // Check if keyword appears in boilerplate (for tracking)
      if (boilerplate) {
        const boilerplateText = `${boilerplate.header} ${boilerplate.footer} ${boilerplate.navigation}`.toLowerCase();
        if (boilerplateText.includes(keywordLower)) {
          contexts.push({
            keyword,
            context: '[Appears in boilerplate/navigation]',
            sentence: '',
            position: -1,
            isMainContent: false,
            quality: 0  // Low quality
          });
        }
      }
    });
    
    return {
      contexts,
      mainContentLength: mainContent.length,
      method: mainContent.method,
      stats: {
        totalContexts: contexts.length,
        mainContentContexts: contexts.filter(c => c.isMainContent).length,
        boilerplateContexts: contexts.filter(c => !c.isMainContent).length
      }
    };
  }

  /**
   * Assess quality of keyword context
   */
  assessContextQuality(sentence, keyword) {
    let quality = 5;  // Base quality
    
    // Boost for longer sentences (more context)
    if (sentence.length > 100) quality += 2;
    if (sentence.length > 200) quality += 1;
    
    // Boost for sentences with multiple occurrences
    const occurrences = (sentence.match(new RegExp(keyword, 'gi')) || []).length;
    quality += Math.min(occurrences - 1, 3);
    
    // Reduce for very short sentences
    if (sentence.length < 50) quality -= 2;
    
    // Reduce for list-like content
    if (sentence.includes('|') || sentence.includes('•')) quality -= 1;
    
    return Math.max(1, Math.min(10, quality));
  }

  /**
   * Generate SHA-256 hash for content comparison
   */
  generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get extraction statistics
   */
  getStats() {
    this.stats.totalProcessed = this.stats.readabilitySuccess + this.stats.fallbackUsed + this.stats.errors;
    this.stats.successRate = this.stats.totalProcessed > 0 
      ? ((this.stats.readabilitySuccess / this.stats.totalProcessed) * 100).toFixed(2) + '%'
      : '0%';
    return this.stats;
  }
}

module.exports = SmartContentExtractor;

// If run directly, test the extractor
if (require.main === module) {
  const extractor = new SmartContentExtractor();
  
  // Test with a sample HTML
  const testHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Test Article - AI Technology News</title></head>
    <body>
      <header>Site Header with Navigation | Products | About | Contact</header>
      <nav>Home | About | Products: PhariaAI, PhariaAssistant | Contact</nav>
      <main>
        <article>
          <h1>Main Article Title: Advances in AI Technology</h1>
          <p>This is the main content of the article. It contains important information about AI and technology. 
             Machine learning has revolutionized how we process data.</p>
          <p>Here's another paragraph with more details about neural networks and deep learning algorithms. 
             These technologies enable sophisticated pattern recognition.</p>
          <p>The company Aleph Alpha has developed innovative AI models that compete with GPT-4.</p>
        </article>
      </main>
      <footer>Copyright 2025 - Products: PhariaAI, PhariaAssistant | Aleph Alpha GmbH</footer>
    </body>
    </html>
  `;
  
  console.log('Testing Smart Content Extractor\n' + '='.repeat(50));
  
  const result = extractor.extractMainContent(testHtml, 'https://example.com/article');
  console.log('\nExtraction Result:');
  console.log('Method:', result.method);
  console.log('Title:', result.title);
  console.log('Word Count:', result.wordCount);
  console.log('Content Preview:', result.content.substring(0, 200) + '...');
  
  const contexts = extractor.extractKeywordContexts(testHtml, 'https://example.com', ['AI', 'Aleph', 'Products', 'PhariaAI']);
  console.log('\nKeyword Contexts:');
  contexts.contexts.forEach(ctx => {
    console.log(`  ${ctx.keyword} (${ctx.isMainContent ? 'main' : 'boilerplate'}, quality: ${ctx.quality})`);
    if (ctx.isMainContent) {
      console.log(`    "${ctx.context.substring(0, 100)}..."`);
    }
  });
  
  console.log('\nStatistics:', contexts.stats);
  console.log('\nExtractor Stats:', extractor.getStats());
}
