// =====================================================================
// src/core/HybridParser.js - Hybrid Parser combining normalization + hierarchical parsing
// =====================================================================
// Combines the best of both approaches:
// 1. Pre-processing: Detect and normalize embedded SCHRITT keywords
// 2. Hierarchical parsing: Structure-aware parsing with RUST/SCHRITT rules
// =====================================================================

import { HierarchicalParser } from './HierarchicalParser.js';

export class HybridParser extends HierarchicalParser {
  constructor(syntaxRules) {
    super(syntaxRules);
  }

  /**
   * Parse with hybrid approach: normalize first, then hierarchical parsing
   */
  parse(text, source = 'manual', metadata = {}) {
    this.log('🔄 Starting hybrid parsing', { source });
    
    // Step 1: Pre-process and normalize embedded SCHRITT keywords
    const normalizedText = this.preProcessEmbeddedKeywords(text, source);
    this.log('📝 Pre-processed text', { 
      originalLines: text.split('\n').length,
      normalizedLines: normalizedText.split('\n').length, 
    });
    
    // Step 2: Apply hierarchical parsing to normalized text
    return super.parse(normalizedText, source, metadata);
  }

  /**
   * Pre-process text to handle embedded SCHRITT keywords and fix indentation
   */
  preProcessEmbeddedKeywords(text, source) {
    this.log('🔧 Pre-processing embedded keywords');
    
    let processed = text;
    
    // Step 1: Split embedded SCHRITT keywords onto their own lines
    processed = this.splitEmbeddedKeywords(processed);
    
    // Step 2: Fix indentation patterns (SCHRITT should be Level 0, conditions Level 1)
    processed = this.fixIndentationPatterns(processed);
    
    // Step 3: Remove cross-reference noise
    processed = this.cleanCrossReferences(processed);
    
    return processed;
  }

  /**
   * Split embedded SCHRITT keywords onto separate lines
   */
  splitEmbeddedKeywords(text) {
    const lines = text.split('\n');
    const processedLines = [];
    
    for (const line of lines) {
      // Check for embedded SCHRITT patterns: (text SCHRITT X)
      const embeddedMatches = [...line.matchAll(/\([^)]*\s+(SCHRITT|STAP|STEP)\s+[0-9+-]+[^)]*\)/gi)];
      
      if (embeddedMatches.length > 0) {
        this.log('🔍 Found embedded SCHRITT references', { 
          line: line.substring(0, 60),
          matches: embeddedMatches.length, 
        });
        
        // These are cross-references, not step declarations - keep as single line
        processedLines.push(line);
      } else {
        // Check for real SCHRITT declarations embedded in text
        const schrittMatch = line.match(/^(.+?)\s+(SCHRITT|STAP|STEP)\s+(\d+)\s*[:.]?\s*(.*)$/i);
        
        if (schrittMatch && !line.trim().startsWith('SCHRITT') && 
            !line.trim().startsWith('STAP') && !line.trim().startsWith('STEP')) {
          
          const [, before, keyword, number, after] = schrittMatch;
          
          // Check if this is a variable context (should NOT be split)
          if (this.isSchrittInVariableContext(line.trim()) || 
              /^(SETZEN|RÜCKSETZEN|SET|RESET)/i.test(before.trim())) {
            
            this.log('⚠️ Skipping split - SCHRITT in variable context', {
              line: line.trim().substring(0, 60),
            });
            processedLines.push(line);
          } else {
            this.log('✂️ Splitting embedded SCHRITT declaration', {
              before: before.trim(),
              step: `${keyword} ${number}`,
              after: after,
            });
            
            // Split into separate lines
            if (before.trim()) {
              processedLines.push(before.trim());
            }
            processedLines.push(`${keyword.toUpperCase()} ${number}: ${after}`);
          }
        } else {
          processedLines.push(line);
        }
      }
    }
    
    return processedLines.join('\n');
  }

  /**
   * Fix indentation patterns so SCHRITT is Level 0 and conditions are Level 1
   */
  fixIndentationPatterns(text) {
    const lines = text.split('\n');
    const fixedLines = [];
    let lastStepIndent = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) {
        fixedLines.push('');
        continue;
      }
      
      // Check if this is a RUST/SCHRITT declaration
      if (this.isRustDeclaration(trimmed) || this.isSchrittDeclaration(trimmed)) {
        // Steps should always be at Level 0 (no indentation)
        fixedLines.push(trimmed);
        lastStepIndent = 0;
        this.log('📍 Fixed step indentation', { step: trimmed.substring(0, 30) });
      } else if (this.isVariableDeclaration(trimmed)) {
        // Variables at Level 0
        fixedLines.push(trimmed);
      } else {
        // This looks like a condition - should be indented under the last step
        const currentIndent = this.calculateIndentLevel(line, 'manual');
        
        // If it's not indented but should be (following a step), indent it
        if (currentIndent === 0 && lastStepIndent === 0) {
          fixedLines.push('  ' + trimmed); // Add 2 spaces for Level 1
          this.log('🔧 Fixed condition indentation', { condition: trimmed.substring(0, 30) });
        } else {
          fixedLines.push(line);
        }
      }
    }
    
    return fixedLines.join('\n');
  }

  /**
   * Clean cross-references that might confuse the parser
   */
  cleanCrossReferences(text) {
    // For now, just return as-is
    // Future: Could mark cross-references more explicitly
    return text;
  }

  /**
   * Enhanced classification that handles cross-references better
   */
  classifyLineContent(content) {
    if (!content) return 'empty';
    
    // Check for cross-references FIRST (before other classifications)
    if (this.isCrossReference(content)) return 'cross_reference';
    
    // Check for variable assignments with SCHRITT ranges (e.g., "= SCHRITT 2-4")
    if (this.isVariableWithSchrittRange(content)) return 'variable';
    
    // Check for SCHRITT references in variable/condition context (NOT declarations)
    if (this.isSchrittInVariableContext(content)) return 'condition';
    
    // Then check for real declarations
    if (this.isRustDeclaration(content)) return 'rust';
    if (this.isSchrittDeclaration(content)) return 'schritt';
    if (this.isVonSchrittDeclaration(content)) return 'von_schritt';
    if (this.isVariableDeclaration(content)) return 'variable';
    
    // Default to condition
    return 'condition';
  }

  /**
   * Check for variable assignments that contain SCHRITT ranges
   */
  isVariableWithSchrittRange(content) {
    return /^.+\s*=\s*(SCHRITT\s+\d+-\d+|.*SCHRITT\s+\d+-\d+)/.test(content);
  }

  /**
   * Check for SCHRITT references in variable/condition context (NOT step declarations)
   */
  isSchrittInVariableContext(content) {
    // Pattern 1: SETZEN/RÜCKSETZEN with SCHRITT ranges (e.g., "SETZEN SCHRITT 4-5")
    if (/^(SETZEN|RÜCKSETZEN|SET|RESET)\s+.*SCHRITT\s+\d+(-\d+)?/i.test(content)) return true;
    
    // Pattern 2: SCHRITT ranges without colon (e.g., "SCHRITT 4-5", "SCHRITT 2-4")
    if (/^SCHRITT\s+\d+-\d+$/.test(content)) return true;
    
    // Pattern 3: Isolated SCHRITT numbers without description (e.g., "SCHRITT 4", "SCHRITT 5")
    if (/^SCHRITT\s+\d+$/.test(content)) return true;
    
    // Pattern 4: SCHRITT references with operators (e.g., "SCHRITT 4-5", "NICHT SCHRITT X")
    if (/^(NICHT|NOT|NIET)\s+SCHRITT\s+\d+/.test(content)) return true;
    
    return false;
  }

  /**
   * Enhanced cross-reference detection
   */
  isCrossReference(content) {
    // Pattern 1: (ProgramName SCHRITT X+Y+Z)
    if (/\([^)]+\s+(SCHRITT|STAP|STEP)\s+[0-9+]+\)/.test(content)) return true;
    
    // Pattern 2: Lines that only contain SCHRITT references in context
    if (/^[^:]*\s+(SCHRITT|STAP|STEP)\s+\d+[^:]*$/.test(content) && 
        !/^(SCHRITT|STAP|STEP)\s+\d+\s*:/.test(content)) return true;
    
    return false;
  }

  /**
   * Process cross-reference
   */
  processCrossReference(node, result) {
    // Extract program name and step references
    const crossRefMatch = node.content.match(/\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)/);
    
    if (crossRefMatch) {
      const [, program, keyword, steps] = crossRefMatch;
      
      const crossRef = {
        program: program.trim(),
        steps: steps,
        lineNumber: node.lineNumber,
        originalText: node.content,
      };
      
      result.crossReferences.push(crossRef);
      this.log('🔗 Added cross-reference', { program, steps });
    } else {
      this.log('🔗 Processing cross-reference', { content: node.content });
    }
  }

  /**
   * Process variable with better SCHRITT range handling
   */
  processVariable(node, result) {
    const variableMatch = node.content.match(/^([^=]+?)\s*=\s*(.*)$/);
    
    if (variableMatch) {
      const [, name, value] = variableMatch;
      
      const variable = {
        name: name.trim(),
        value: value.trim() || undefined,
        lineNumber: node.lineNumber,
        type: this.determineVariableType(name.trim()),
      };
      
      result.variables.push(variable);
      this.log('📋 Added variable', { name: variable.name, type: variable.type });
    }
  }

  /**
   * Determine variable type based on name/content
   */
  determineVariableType(name) {
    if (/^(STORING|STÖRUNG|FAULT)/i.test(name)) return 'storing';
    if (/^(MELDING|MESSAGE)/i.test(name)) return 'melding';
    if (/^(TIJD|TIME|ZEIT)/i.test(name)) return 'tijd';
    if (/teller|counter/i.test(name)) return 'teller';
    return 'hulpmerker';
  }
}