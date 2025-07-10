// =====================================================================
// src/core/ContentPreprocessor.js - Content Preprocessing for Better Parsing
// =====================================================================
// Addresses parsing issues identified in analysis:
// 1. Transition rule parsing (+ von SCHRITT X)
// 2. HTML entity decoding (&amp;, &lt;, etc.)
// 3. Line break handling in assignments (= operator)
// 4. OR-block structure preservation ([...] groupings)
// =====================================================================

import { globalRegexCache } from './utils/RegexCache.js';

/**
 * Content Preprocessor for improving parsing accuracy
 */
export class ContentPreprocessor {
  constructor() {
    this.htmlEntities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': '\'',
      '&#39;': '\'',
      '&nbsp;': ' ',
      '&hellip;': '...',
      '&ndash;': '–',
      '&mdash;': '—',
    };
    
    // Performance optimizations - use global regex cache
    this.entityKeys = Object.keys(this.htmlEntities);
    
    // Patterns for context-aware parsing
    this.contextPatterns = {
      // Transition rules that should be kept together
      transitionRule: /^(\+\s*)(von\s+SCHRITT\s+\d+)/i,
      jumpRule: /^(\+\s*)(nach\s+SCHRITT\s+\d+)/i,
      
      // Assignment patterns that may be split across lines
      assignmentStart: /^(.+?)\s*=\s*$/,
      assignmentContinuation: /^=\s*(.+)$/,
      
      // OR-block patterns
      orBlockStart: /^\s*\[\s*$/,
      orBlockEnd: /^\s*\]\s*$/,
      orBlockItem: /^\s*\+?\s*(.+)\s*$/,
      
      // Common line break issues
      brokenCondition: /^(.+)\s+(&|UND|AND|ODER|OR)\s*$/,
      conditionContinuation: /^(&|UND|AND|ODER|OR)\s+(.+)$/,
    };
  }

  /**
   * Main preprocessing method
   */
  preprocess(content) {
    console.log('🔧 Starting content preprocessing...');
    
    // Step 1: HTML entity decoding
    let processed = this.decodeHtmlEntities(content);
    console.log('✅ HTML entities decoded');
    
    // Step 2: Normalize line breaks
    processed = this.normalizeLineBreaks(processed);
    console.log('✅ Line breaks normalized');
    
    // Step 3: Fix broken assignments
    processed = this.fixBrokenAssignments(processed);
    console.log('✅ Broken assignments fixed');
    
    // Step 4: Preserve OR-block structure
    processed = this.preserveOrBlocks(processed);
    console.log('✅ OR-blocks preserved');
    
    // Step 5: Fix transition rules
    processed = this.fixTransitionRules(processed);
    console.log('✅ Transition rules fixed');
    
    // Step 6: Clean up whitespace
    processed = this.cleanupWhitespace(processed);
    console.log('✅ Whitespace cleaned');
    
    console.log('🎯 Preprocessing completed successfully');
    return processed;
  }

  /**
   * Decode HTML entities that remain from DOCX conversion - optimized with global regex cache
   */
  decodeHtmlEntities(content) {
    let decoded = content;
    
    // Use global regex cache for better performance
    this.entityKeys.forEach(entity => {
      decoded = globalRegexCache.replace(decoded, entity, this.htmlEntities[entity], 'g');
    });
    
    // Handle numeric entities (&#123;)
    decoded = globalRegexCache.replace(decoded, '&#(\\d+);', (match, code) => {
      return String.fromCharCode(parseInt(code));
    }, 'g');
    
    // Handle hex entities (&#x1F;)
    decoded = globalRegexCache.replace(decoded, '&#x([0-9A-Fa-f]+);', (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    }, 'g');
    
    return decoded;
  }

  /**
   * Normalize line breaks for consistent parsing
   */
  normalizeLineBreaks(content) {
    // Convert different line break styles to \n
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks
  }

  /**
   * Fix broken assignments (= operator on wrong line)
   */
  fixBrokenAssignments(content) {
    const lines = content.split('\n');
    const fixedLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      
      // Check if current line ends with variable name and = is on next line
      if (currentLine && nextLine && 
          this.contextPatterns.assignmentStart.test(currentLine) &&
          this.contextPatterns.assignmentContinuation.test(nextLine)) {
        
        // Merge the lines
        const variablePart = currentLine.replace(/\s*=\s*$/, '');
        const valuePart = nextLine.replace(/^=\s*/, '');
        const mergedLine = `${variablePart} = ${valuePart}`;
        
        console.log(`🔧 Fixed broken assignment: "${currentLine}" + "${nextLine}" → "${mergedLine}"`);
        fixedLines.push(mergedLine);
        i += 2; // Skip both lines
      } else {
        fixedLines.push(currentLine);
        i++;
      }
    }
    
    return fixedLines.join('\n');
  }

  /**
   * Preserve OR-block structure and fix broken conditions
   */
  preserveOrBlocks(content) {
    const lines = content.split('\n');
    const processedLines = [];
    let inOrBlock = false;
    let orBlockContent = [];
    let orBlockStartLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Detect OR-block start
      if (this.contextPatterns.orBlockStart.test(trimmed)) {
        inOrBlock = true;
        orBlockStartLine = i;
        orBlockContent = [];
        processedLines.push(line); // Keep the opening [
        continue;
      }
      
      // Detect OR-block end
      if (this.contextPatterns.orBlockEnd.test(trimmed) && inOrBlock) {
        inOrBlock = false;
        
        // Process the OR-block content
        const processedOrBlock = this.processOrBlockContent(orBlockContent);
        processedLines.push(...processedOrBlock);
        processedLines.push(line); // Keep the closing ]
        
        console.log(`🔧 Processed OR-block (lines ${orBlockStartLine}-${i}): ${orBlockContent.length} items`);
        continue;
      }
      
      // If we're in an OR-block, collect content
      if (inOrBlock) {
        orBlockContent.push(line);
      } else {
        processedLines.push(line);
      }
    }
    
    return processedLines.join('\n');
  }

  /**
   * Process OR-block content to preserve logical structure
   */
  processOrBlockContent(orBlockLines) {
    const processedItems = [];
    let currentItem = '';
    
    for (const line of orBlockLines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        continue; // Skip empty lines
      }
      
      // Check if this is a new OR-block item (starts with +)
      if (trimmed.startsWith('+')) {
        // Save previous item if exists
        if (currentItem) {
          processedItems.push(currentItem);
        }
        currentItem = trimmed;
      } else {
        // This is a continuation of the current item
        if (currentItem) {
          currentItem += ' ' + trimmed;
        } else {
          // First item without +
          currentItem = trimmed;
        }
      }
    }
    
    // Add the last item
    if (currentItem) {
      processedItems.push(currentItem);
    }
    
    return processedItems;
  }

  /**
   * Fix transition rules (+ von SCHRITT X)
   */
  fixTransitionRules(content) {
    const lines = content.split('\n');
    const fixedLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      
      // Check for broken transition rules
      if (currentLine && nextLine) {
        const currentTrimmed = currentLine.trim();
        const nextTrimmed = nextLine.trim();
        
        // Case 1: + von on separate lines
        if (currentTrimmed === '+' && nextTrimmed.match(/^von\s+SCHRITT\s+\d+/i)) {
          const mergedLine = `+ ${nextTrimmed}`;
          console.log(`🔧 Fixed transition rule: "${currentLine}" + "${nextLine}" → "${mergedLine}"`);
          fixedLines.push(mergedLine);
          i += 2;
          continue;
        }
        
        // Case 2: + von SCHRITT split
        if (currentTrimmed.match(/^\+\s*von$/i) && nextTrimmed.match(/^SCHRITT\s+\d+/i)) {
          const mergedLine = `+ von ${nextTrimmed}`;
          console.log(`🔧 Fixed transition rule: "${currentLine}" + "${nextLine}" → "${mergedLine}"`);
          fixedLines.push(mergedLine);
          i += 2;
          continue;
        }
        
        // Case 3: + nach SCHRITT (similar pattern)
        if (currentTrimmed === '+' && nextTrimmed.match(/^nach\s+SCHRITT\s+\d+/i)) {
          const mergedLine = `+ ${nextTrimmed}`;
          console.log(`🔧 Fixed jump rule: "${currentLine}" + "${nextLine}" → "${mergedLine}"`);
          fixedLines.push(mergedLine);
          i += 2;
          continue;
        }
      }
      
      fixedLines.push(currentLine);
      i++;
    }
    
    return fixedLines.join('\n');
  }

  /**
   * Clean up whitespace and normalize formatting
   */
  cleanupWhitespace(content) {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Get preprocessing statistics
   */
  getPreprocessingStats(originalContent, processedContent) {
    const originalLines = originalContent.split('\n');
    const processedLines = processedContent.split('\n');
    
    return {
      originalLines: originalLines.length,
      processedLines: processedLines.length,
      reductionRatio: (originalLines.length - processedLines.length) / originalLines.length,
      htmlEntitiesFound: this.countHtmlEntities(originalContent),
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Count HTML entities in content - optimized with global regex cache
   */
  countHtmlEntities(content) {
    let count = 0;
    this.entityKeys.forEach(entity => {
      const matches = globalRegexCache.match(content, entity, 'g');
      if (matches) count += matches.length;
    });
    return count;
  }
}

export default ContentPreprocessor;