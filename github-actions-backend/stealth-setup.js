// stealth-setup.js
// Browser stealth configuration module

class StealthSetup {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
  }

  /**
   * Get browser launch arguments
   */
  getBrowserArgs() {
    return [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
      '--disable-accelerated-2d-canvas',
      '--disable-gl-drawing-for-tests',
      '--disable-dev-tools',
      '--disable-extensions',
      '--no-first-run',
      '--ignore-certificate-errors',
      '--allow-running-insecure-content',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-notifications',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-default-apps'
    ];
  }

  /**
   * Apply stealth to page
   */
  async applyStealthToPage(page) {
    // Set random user agent
    const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await page.setUserAgent(randomUA);
    
    // Set realistic viewport with randomization
    const width = 1920 + Math.floor(Math.random() * 100) - 50;
    const height = 1080 + Math.floor(Math.random() * 100) - 50;
    await page.setViewport({ width, height });
    
    // Apply evasion techniques
    await page.evaluateOnNewDocument(() => {
      // Hide webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Add chrome object
      if (!window.chrome) {
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
      }
      
      // Fix permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // Fix plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ],
      });
      
      // Fix language
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Fix WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter(parameter);
      };
      
      // Fix screen
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => 1
      });
      
      // Fix timestamps
      const now = Date.now();
      window.performance.timing.navigationStart = now - Math.floor(Math.random() * 600000);
    });
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
  }

  /**
   * Add random mouse movement
   */
  async addMouseMovement(page) {
    const mouse = page.mouse;
    
    // Random starting position
    let x = Math.floor(Math.random() * 800) + 100;
    let y = Math.floor(Math.random() * 600) + 100;
    
    // Move mouse in a natural pattern
    for (let i = 0; i < 3; i++) {
      const newX = x + (Math.random() * 200 - 100);
      const newY = y + (Math.random() * 200 - 100);
      
      await mouse.move(newX, newY, { steps: 10 });
      x = newX;
      y = newY;
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
    }
  }

  /**
   * Random scroll behavior
   */
  async addScrollBehavior(page) {
    await page.evaluate(() => {
      const totalHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      if (totalHeight > viewportHeight) {
        // Scroll down a random amount
        const scrollAmount = Math.floor(Math.random() * (totalHeight - viewportHeight) * 0.3);
        window.scrollTo({
          top: scrollAmount,
          behavior: 'smooth'
        });
      }
    });
  }
}

module.exports = StealthSetup;
