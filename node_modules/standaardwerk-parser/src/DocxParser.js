// =====================================================================
// src/core/DocxParser.js - DOCX Document Parser
// =====================================================================
// Handles parsing of .docx files with preservation of formatting,
// layout, headers, tabs, bold/italic text, tables, etc.
// =====================================================================

import mammoth from 'mammoth';
import { readFile } from 'fs/promises';

/**
 * DOCX Parser that preserves formatting and layout information
 */
export class DocxParser {
  constructor() {
    this.formattingMarkers = {
      bold: ['**', '**'],
      italic: ['*', '*'],
      underline: ['_', '_'],
      header1: ['# ', ''],
      header2: ['## ', ''],
      header3: ['### ', ''],
      listItem: ['- ', ''],
      indentLevel1: ['  ', ''],
      indentLevel2: ['    ', ''],
      indentLevel3: ['      ', ''],
      table: ['|', '|'],
      tableHeader: ['|**', '**|'],
    };
  }

  /**
   * Parse DOCX file with formatting preservation - async optimized
   */
  async parseDocxFile(filePath) {
    try {
      const buffer = await readFile(filePath);
      
      // Parse with mammoth to get both text and HTML concurrently
      const [textResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]);
      
      // Extract structured content with formatting (async)
      const structuredContent = await this.extractStructuredContentAsync(htmlResult.html, textResult.value);
      
      // Convert to normalized text with preserved formatting markers (async)
      const normalizedText = await this.convertToNormalizedTextAsync(structuredContent);
      
      return {
        rawText: textResult.value,
        html: htmlResult.html,
        structuredContent: structuredContent,
        normalizedText: normalizedText,
        metadata: {
          source: 'docx',
          filename: filePath.split('/').pop(),
          processingTimestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse DOCX file: ${error.message}`);
    }
  }

  /**
   * Extract structured content from HTML with formatting information - async optimized
   */
  async extractStructuredContentAsync(html, rawText) {
    return new Promise(resolve => {
      // Run extraction in chunks to avoid blocking
      setImmediate(() => {
        const result = this.extractStructuredContent(html, rawText);
        resolve(result);
      });
    });
  }

  /**
   * Extract structured content from HTML with formatting information
   */
  extractStructuredContent(html, rawText) {
    const content = {
      sections: [],
      tables: [],
      lists: [],
      formattedElements: [],
    };

    // Ensure html is a string
    if (!html || typeof html !== 'string') {
      console.log('⚠️ No HTML content, using raw text');
      return this.extractStructuredContentFromRawText(rawText);
    }

    // Parse HTML to extract structure
    const htmlLines = html.split('\n');
    let currentSection = null;
    let currentTable = null;
    let currentList = null;
    let lineNumber = 0;

    htmlLines.forEach(line => {
      lineNumber++;
      const trimmed = line.trim();
      
      if (!trimmed) return;

      // Headers
      const headerMatch = trimmed.match(/^<h(\d)>(.*?)<\/h\d>$/);
      if (headerMatch) {
        const level = parseInt(headerMatch[1]);
        const text = this.cleanHtmlText(headerMatch[2]);
        
        currentSection = {
          level,
          title: text,
          content: [],
          lineNumber,
          formatting: { type: 'header', level },
        };
        content.sections.push(currentSection);
        return;
      }

      // Paragraphs with formatting
      const paragraphMatch = trimmed.match(/^<p>(.*?)<\/p>$/);
      if (paragraphMatch) {
        const text = this.cleanHtmlText(paragraphMatch[1]);
        const formatting = this.extractFormatting(paragraphMatch[1]);
        
        const paragraph = {
          text,
          formatting,
          lineNumber,
          indentLevel: this.calculateIndentLevel(paragraphMatch[1]),
        };

        if (currentSection) {
          currentSection.content.push(paragraph);
        } else {
          content.formattedElements.push(paragraph);
        }
        return;
      }

      // Tables
      if (trimmed.includes('<table>')) {
        currentTable = {
          rows: [],
          lineNumber,
          formatting: { type: 'table' },
        };
        content.tables.push(currentTable);
        return;
      }

      if (trimmed.includes('<tr>') && currentTable) {
        const cells = this.extractTableCells(trimmed);
        currentTable.rows.push({
          cells,
          lineNumber,
          isHeader: trimmed.includes('<th>'),
        });
        return;
      }

      // Lists
      if (trimmed.includes('<ul>') || trimmed.includes('<ol>')) {
        currentList = {
          type: trimmed.includes('<ul>') ? 'unordered' : 'ordered',
          items: [],
          lineNumber,
          formatting: { type: 'list' },
        };
        content.lists.push(currentList);
        return;
      }

      if (trimmed.includes('<li>') && currentList) {
        const text = this.cleanHtmlText(trimmed.match(/<li>(.*?)<\/li>/)?.[1] || '');
        const formatting = this.extractFormatting(trimmed);
        
        currentList.items.push({
          text,
          formatting,
          lineNumber,
          indentLevel: this.calculateIndentLevel(trimmed),
        });
      }
    });

    return content;
  }

  /**
   * Extract structured content from raw text when HTML is not available
   */
  extractStructuredContentFromRawText(rawText) {
    const content = {
      sections: [],
      tables: [],
      lists: [],
      formattedElements: [],
    };

    if (!rawText || typeof rawText !== 'string') {
      return content;
    }

    const lines = rawText.split('\n');
    let lineNumber = 0;

    lines.forEach(line => {
      lineNumber++;
      const trimmed = line.trim();
      
      if (!trimmed) return;

      // Simple text parsing - treat all non-empty lines as formatted elements
      const element = {
        text: trimmed,
        formatting: { bold: false, italic: false, underline: false },
        lineNumber,
        indentLevel: this.calculateTextIndentLevel(line),
      };

      content.formattedElements.push(element);
    });

    return content;
  }

  /**
   * Calculate indent level from text line
   */
  calculateTextIndentLevel(line) {
    const leadingSpaces = line.match(/^\s*/)[0].length;
    return Math.floor(leadingSpaces / 2); // 2 spaces per indent level
  }

  /**
   * Extract formatting information from HTML
   */
  extractFormatting(html) {
    const formatting = {
      bold: html.includes('<strong>') || html.includes('<b>'),
      italic: html.includes('<em>') || html.includes('<i>'),
      underline: html.includes('<u>'),
      strikethrough: html.includes('<s>') || html.includes('<del>'),
      styles: [],
    };

    // Extract specific styles
    const styleMatch = html.match(/style="([^"]*)"/);
    if (styleMatch) {
      formatting.styles = this.parseStyleString(styleMatch[1]);
    }

    return formatting;
  }

  /**
   * Parse CSS style string
   */
  parseStyleString(styleString) {
    const styles = {};
    const declarations = styleString.split(';');
    
    declarations.forEach(declaration => {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        styles[property] = value;
      }
    });

    return styles;
  }

  /**
   * Calculate indentation level from HTML
   */
  calculateIndentLevel(html) {
    // Check for margin-left or padding-left in styles
    const styleMatch = html.match(/style="([^"]*)"/);
    if (styleMatch) {
      const styles = this.parseStyleString(styleMatch[1]);
      const marginLeft = styles['margin-left'] || styles['padding-left'];
      
      if (marginLeft) {
        const pixels = parseInt(marginLeft.replace(/[^\d]/g, ''));
        return Math.floor(pixels / 20); // Approximate conversion
      }
    }

    // Check for nested elements that might indicate indentation
    const indentElements = (html.match(/<(div|p|span)[^>]*>/g) || []).length;
    return Math.min(indentElements, 5); // Cap at 5 levels
  }

  /**
   * Extract table cells from HTML
   */
  extractTableCells(html) {
    const cells = [];
    const cellMatches = html.match(/<t[hd]>(.*?)<\/t[hd]>/g) || [];
    
    cellMatches.forEach(cellHtml => {
      const text = this.cleanHtmlText(cellHtml);
      const formatting = this.extractFormatting(cellHtml);
      
      cells.push({
        text,
        formatting,
        isHeader: cellHtml.includes('<th>'),
      });
    });

    return cells;
  }

  /**
   * Clean HTML text content
   */
  cleanHtmlText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .trim();
  }

  /**
   * Convert structured content to normalized text with formatting markers - async optimized
   */
  async convertToNormalizedTextAsync(structuredContent) {
    return new Promise(resolve => {
      // Run conversion in chunks to avoid blocking
      setImmediate(() => {
        const result = this.convertToNormalizedText(structuredContent);
        resolve(result);
      });
    });
  }

  /**
   * Convert structured content to normalized text with formatting markers
   */
  convertToNormalizedText(structuredContent) {
    let normalizedText = '';
    
    // Process sections
    structuredContent.sections.forEach(section => {
      const headerMarker = '#'.repeat(section.level);
      normalizedText += `${headerMarker} ${section.title}\n`;
      
      section.content.forEach(paragraph => {
        const indent = '  '.repeat(paragraph.indentLevel);
        let text = paragraph.text;
        
        // Apply formatting markers
        if (paragraph.formatting.bold) {
          text = `**${text}**`;
        }
        if (paragraph.formatting.italic) {
          text = `*${text}*`;
        }
        if (paragraph.formatting.underline) {
          text = `_${text}_`;
        }
        
        normalizedText += `${indent}${text}\n`;
      });
      
      normalizedText += '\n';
    });

    // Process tables
    structuredContent.tables.forEach(table => {
      table.rows.forEach(row => {
        const cells = row.cells.map(cell => {
          let text = cell.text;
          if (cell.formatting.bold || cell.isHeader) {
            text = `**${text}**`;
          }
          return text;
        });
        normalizedText += `| ${cells.join(' | ')} |\n`;
      });
      normalizedText += '\n';
    });

    // Process lists
    structuredContent.lists.forEach(list => {
      list.items.forEach((item, index) => {
        const indent = '  '.repeat(item.indentLevel);
        const marker = list.type === 'ordered' ? `${index + 1}.` : '-';
        let text = item.text;
        
        if (item.formatting.bold) {
          text = `**${text}**`;
        }
        if (item.formatting.italic) {
          text = `*${text}*`;
        }
        
        normalizedText += `${indent}${marker} ${text}\n`;
      });
      normalizedText += '\n';
    });

    // Process standalone formatted elements
    structuredContent.formattedElements.forEach(element => {
      const indent = '  '.repeat(element.indentLevel);
      let text = element.text;
      
      if (element.formatting.bold) {
        text = `**${text}**`;
      }
      if (element.formatting.italic) {
        text = `*${text}*`;
      }
      if (element.formatting.underline) {
        text = `_${text}_`;
      }
      
      normalizedText += `${indent}${text}\n`;
    });

    return normalizedText;
  }

  /**
   * Extract step program specific formatting
   */
  extractStepProgramFormatting(structuredContent) {
    const stepProgram = {
      title: '',
      steps: [],
      variables: [],
      conditions: [],
      metadata: {},
    };

    // Look for program title (usually first header)
    const firstSection = structuredContent.sections[0];
    if (firstSection) {
      stepProgram.title = firstSection.title;
    }

    // Process all content looking for RUST/SCHRITT patterns
    const allContent = [
      ...structuredContent.sections.flatMap(s => s.content),
      ...structuredContent.formattedElements,
    ];

    allContent.forEach(element => {
      const text = element.text;
      
      // Check for RUST/SCHRITT declarations
      if (/^(RUST|RUHE|IDLE|SCHRITT|STAP|STEP)/i.test(text)) {
        stepProgram.steps.push({
          text,
          formatting: element.formatting,
          indentLevel: element.indentLevel,
          lineNumber: element.lineNumber,
        });
      }
      // Check for variable declarations
      else if (text.includes('=') && !text.includes(':')) {
        stepProgram.variables.push({
          text,
          formatting: element.formatting,
          indentLevel: element.indentLevel,
          lineNumber: element.lineNumber,
        });
      }
      // Check for conditions (indented lines, starting with -, +, etc.)
      else if (element.indentLevel > 0 || text.startsWith('-') || text.startsWith('+')) {
        stepProgram.conditions.push({
          text,
          formatting: element.formatting,
          indentLevel: element.indentLevel,
          lineNumber: element.lineNumber,
        });
      }
    });

    return stepProgram;
  }

  /**
   * Convert DOCX to training-ready format
   */
  convertToTrainingFormat(docxResult) {
    const stepProgram = this.extractStepProgramFormatting(docxResult.structuredContent);
    
    return {
      source: 'docx',
      rawText: docxResult.rawText,
      normalizedText: docxResult.normalizedText,
      stepProgram: stepProgram,
      metadata: {
        ...docxResult.metadata,
        extractedSteps: stepProgram.steps.length,
        extractedVariables: stepProgram.variables.length,
        extractedConditions: stepProgram.conditions.length,
      },
    };
  }
}

/**
 * Convenience function for parsing DOCX files
 */
export async function parseDocx(filePath) {
  const parser = new DocxParser();
  return await parser.parseDocxFile(filePath);
}

/**
 * Convenience function for getting training format
 */
export async function parseDocxForTraining(filePath) {
  const parser = new DocxParser();
  const result = await parser.parseDocxFile(filePath);
  return parser.convertToTrainingFormat(result);
}