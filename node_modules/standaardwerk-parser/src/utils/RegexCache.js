// =====================================================================
// src/utils/RegexCache.js - Centralized Regex Pattern Caching
// =====================================================================
// Provides high-performance regex caching with LRU eviction and
// performance monitoring for all parsers
// =====================================================================

/**
 * High-performance regex cache with LRU eviction and monitoring
 */
export class RegexCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hitCount = 0;
    this.missCount = 0;
    this.compilationTime = 0;
  }

  /**
   * Get or compile regex pattern with caching
   */
  getRegex(pattern, flags = '') {
    const cacheKey = `${pattern}:::${flags}`;
    
    if (this.cache.has(cacheKey)) {
      // Move to end (most recently used)
      const regex = this.cache.get(cacheKey);
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, regex);
      this.hitCount++;
      return regex;
    }

    // Cache miss - compile new regex
    const startTime = performance.now();
    const regex = new RegExp(pattern, flags);
    this.compilationTime += performance.now() - startTime;
    
    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, regex);
    this.missCount++;
    return regex;
  }

  /**
   * Pre-compile commonly used patterns for optimal performance
   */
  precompileCommonPatterns() {
    const commonPatterns = [
      // Step patterns
      { pattern: '^(RUST|RUHE|IDLE|STAP|SCHRITT|STEP)(?:\\s+(\\d+))?:\\s*(.*)$', flags: 'i' },
      
      // Condition patterns
      { pattern: '^\\s+', flags: '' },
      { pattern: '^\\s*\\+', flags: '' },
      { pattern: '^\\s*-', flags: '' },
      { pattern: '^(NIET|NOT|NICHT)\\s+', flags: 'i' },
      
      // Timer patterns
      { pattern: '(?:TIJD|ZEIT|TIME)\\s+(\\d+)\\s*(Sek|sek|Min|min|s|m)\\s*\\?\\?', flags: 'i' },
      
      // Cross-reference patterns
      { pattern: '^(.+?)\\s*\\(([^)]+)\\s+(SCHRITT|STAP|STEP)\\s+([0-9+]+)\\)\\s*$', flags: 'i' },
      
      // Assignment patterns
      { pattern: '^([^=]+)\\s*=\\s*(.*)$', flags: '' },
      { pattern: '^([^<>=!]+)\\s*([<>=!]+)\\s*(.*)$', flags: '' },
      
      // Variable patterns
      { pattern: '^([A-Za-z][A-Za-z0-9_\\s]*)\\s*=\\s*(.*)$', flags: '' },
      
      // Program patterns
      { pattern: '^([A-Za-z][A-Za-z0-9_\\s]*)\\s+(FB\\d+)$', flags: 'i' },
      
      // HTML entity patterns
      { pattern: '&amp;', flags: 'g' },
      { pattern: '&lt;', flags: 'g' },
      { pattern: '&gt;', flags: 'g' },
      { pattern: '&quot;', flags: 'g' },
      { pattern: '&nbsp;', flags: 'g' },
      { pattern: '&#(\\d+);', flags: 'g' },
      { pattern: '&#x([0-9A-Fa-f]+);', flags: 'g' },
      
      // Advanced parser patterns
      { pattern: '^(Hauptprogramm|Unterprogramm|Programm)\\s+([A-Za-z0-9_\\s]+)\\s+(FB\\d+)$', flags: 'i' },
      { pattern: '^([A-Za-z_][A-Za-z0-9_\\s]*)\\s*\\(([^)]+)\\)\\s*=\\s*(.+)$', flags: '' },
      { pattern: '^([A-Za-z_][A-Za-z0-9_]*)\\[([^\\]]+)\\]\\.([A-Za-z_][A-Za-z0-9_]*)\\[([^\\]]+)\\]\\.([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.+)$', flags: '' },
      
      // OR-block patterns
      { pattern: '^\\s*\\[\\s*$', flags: '' },
      { pattern: '^\\s*\\]\\s*$', flags: '' },
      { pattern: '^\\+?\\s*(.+?)\\s*$', flags: '' },
      
      // Transition patterns
      { pattern: '^\\+\\s*von\\s+SCHRITT\\s+(\\d+)', flags: 'i' },
      { pattern: '^\\+\\s*nach\\s+SCHRITT\\s+(\\d+)', flags: 'i' },
      
      // Entity patterns
      { pattern: '^(Käsezähler|Cheese Counter)\\s+([A-Za-z0-9_\\s]+)\\s*(.*)$', flags: 'i' },
      { pattern: '^(NICHT\\s+)?(Störung|Fault|Error)\\s*[:.]?\\s*(.+)$', flags: 'i' },
      { pattern: '^(Freigabe|Release|Enable)\\s+(.+)$', flags: 'i' },
    ];

    console.log('🚀 Pre-compiling', commonPatterns.length, 'regex patterns...');
    const startTime = performance.now();
    
    commonPatterns.forEach(({ pattern, flags }) => {
      this.getRegex(pattern, flags);
    });
    
    const compileTime = performance.now() - startTime;
    console.log(`✅ Regex pre-compilation completed in ${compileTime.toFixed(2)}ms`);
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    return {
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests * 100).toFixed(2) + '%' : '0%',
      compilationTime: this.compilationTime.toFixed(2) + 'ms',
      memoryEstimate: (this.cache.size * 0.5).toFixed(1) + 'KB', // Rough estimate
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.compilationTime = 0;
  }

  /**
   * Test a pattern against text with caching
   */
  test(pattern, text, flags = '') {
    const regex = this.getRegex(pattern, flags);
    return regex.test(text);
  }

  /**
   * Execute a pattern against text with caching
   */
  exec(pattern, text, flags = '') {
    const regex = this.getRegex(pattern, flags);
    return regex.exec(text);
  }

  /**
   * Match a pattern against text with caching
   */
  match(text, pattern, flags = '') {
    const regex = this.getRegex(pattern, flags);
    return text.match(regex);
  }

  /**
   * Replace using cached regex pattern
   */
  replace(text, pattern, replacement, flags = '') {
    const regex = this.getRegex(pattern, flags);
    return text.replace(regex, replacement);
  }
}

// Global regex cache instance
export const globalRegexCache = new RegexCache(2000);

// Initialize with common patterns on import
globalRegexCache.precompileCommonPatterns();

export default globalRegexCache;