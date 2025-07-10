// =====================================================================
// src/core/UnifiedTextParser.js - Unified Text Parser
// =====================================================================
// Ensures consistent parsing between Word document import and manual text
// input, applying the same RUST/SCHRITT rules and validation logic
// =====================================================================

import { EnhancedLogicParser } from './EnhancedLogicParser.js';
import { DEFAULT_VALIDATION_RULES, validateVariableDefinition, validateStepDefinition, validateCrossReference } from './config/validationRules.js';

/**
 * Unified parser that handles both Word document import and manual text input
 * with consistent formatting and validation
 */
export class UnifiedTextParser {
  constructor(syntaxRules, validationRules = DEFAULT_VALIDATION_RULES) {
    this.syntaxRules = syntaxRules;
    this.validationRules = validationRules;
    this.programRegistry = new Map(); // For cross-reference validation
  }

  /**
   * Parse text with unified formatting and validation
   * @param {string} text - Raw text input
   * @param {string} source - Source type: 'word' or 'manual'
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Parsed and validated result
   */
  parse(text, source = 'manual', metadata = {}) {
    // Step 1: Normalize text format
    const normalizedText = this.normalizeText(text, source);
    
    // Step 2: Parse with enhanced logic parser
    const parser = new EnhancedLogicParser(this.syntaxRules);
    const parsed = parser.parse(normalizedText, metadata);
    
    // Step 3: Apply consistent validation
    const validated = this.applyValidation(parsed);
    
    // Step 4: Add parsing metadata
    validated.parsingMetadata = {
      source,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      normalizedLineCount: normalizedText.split('\\n').length,
      originalLineCount: text.split('\\n').length,
    };
    
    return validated;
  }

  /**
   * Normalize text format for consistent parsing
   */
  normalizeText(text, source) {
    console.log(`🔧 Starting normalization for source: ${source}`);
    console.log('📝 Original text (first 300 chars):', text.substring(0, 300));
    
    let normalized = text;
    
    // Common normalization for both sources
    normalized = this.removeExtraWhitespace(normalized);
    normalized = this.normalizeLineEndings(normalized);
    normalized = this.normalizeEncoding(normalized);
    
    // Source-specific normalization
    if (source === 'word') {
      normalized = this.normalizeWordImport(normalized);
    } else if (source === 'manual') {
      normalized = this.normalizeManualInput(normalized);
    }
    
    // Final consistency checks
    normalized = this.applyConsistencyRules(normalized);
    
    console.log('✅ Normalized text (first 300 chars):', normalized.substring(0, 300));
    
    return normalized;
  }

  /**
   * Remove extra whitespace while preserving structure
   */
  removeExtraWhitespace(text) {
    return text
      .split('\n')
      .map(line => {
        // Preserve leading whitespace for indentation
        const leadingWhitespace = line.match(/^\s*/)[0];
        const trimmed = line.trim();
        return trimmed ? leadingWhitespace + trimmed : '';
      })
      .join('\n');
  }

  /**
   * Normalize line endings
   */
  normalizeLineEndings(text) {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Normalize text encoding issues
   */
  normalizeEncoding(text) {
    // Fix common encoding issues from Word documents
    return text
      .replace(/[""]/g, '"')
      .replace(/['']/g, '\'')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/…/g, '...')
      .replace(/\u00A0/g, ' '); // Non-breaking space
  }

  /**
   * Normalize Word document import specific issues
   */
  normalizeWordImport(text) {
    let normalized = text;
    
    // Remove Word-specific formatting artifacts
    normalized = this.removeWordFormatting(normalized);
    
    // Fix common Word import issues
    normalized = this.fixWordImportIssues(normalized);
    
    // Ensure consistent step formatting
    normalized = this.normalizeStepFormatting(normalized);
    
    return normalized;
  }

  /**
   * Remove Word formatting artifacts
   */
  removeWordFormatting(text) {
    return text
      // Remove page breaks
      .replace(/\f/g, '')
      // Remove excessive spaces
      .replace(/\s{3,}/g, '  ')
      // Remove tab characters, replace with spaces
      .replace(/\t/g, '  ')
      // Remove form feed characters
      .replace(/\v/g, '\n');
  }

  /**
   * Fix common Word import issues
   */
  fixWordImportIssues(text) {
    return text
      // Fix bullet points
      .replace(/^\s*[•·▪▫-]\s*/gm, '- ')
      // Fix numbered lists
      .replace(/^\s*\d+\.\s*/gm, '- ')
      // Fix colon spacing
      .replace(/\s*:\s*/g, ': ')
      // Fix equals spacing
      .replace(/\s*=\s*/g, ' = ')
      // Fix plus spacing for OR conditions
      .replace(/^\s*\+\s*/gm, '+ ');
  }

  /**
   * Normalize step formatting
   */
  normalizeStepFormatting(text) {
    // Split into lines to work line by line, avoiding cross-line regex issues
    const lines = text.split('\n');
    const normalizedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check if this line contains embedded SCHRITT/STAP/STEP keywords - VERBETERD: flexibeler
      // KRITIEKE FIX: Voorkom splitsen van programma-verwijzingen binnen voorwaarden
      const schrittMatch = line.match(/^(.+?)\s+(SCHRITT|STAP|STEP)\s*(\d+)\s*[:\(\.]?\s*(.*)$/i);
      if (schrittMatch && !line.trim().startsWith('SCHRITT') && !line.trim().startsWith('STAP') && !line.trim().startsWith('STEP')) {
        // Check of dit een programma-verwijzing is (tussen haakjes of na +)
        const before = schrittMatch[1];
        const isInParentheses = /\([^)]*$/.test(before.trim());
        const isAfterPlus = /\+\s*$/.test(before.trim());
        
        if (isInParentheses || isAfterPlus) {
          // Dit is een programma-verwijzing, NIET splitsen
          normalizedLines.push(line);
          continue;
        }
        
        // Split the line: before part + new line with SCHRITT
        const [, , keyword, number, after] = schrittMatch;
        normalizedLines.push(before.trim());
        normalizedLines.push(`${keyword.toUpperCase()} ${number}: ${after}`);
        continue;
      }
      
      // Check if this line contains embedded RUST/RUHE/IDLE keywords - VERBETERD: flexibeler
      // KRITIEKE FIX: Voorkom splitsen van programma-verwijzingen binnen voorwaarden
      const rustMatch = line.match(/^(.+?)\s+(RUST|RUHE|IDLE)\s*[:\(\.]?\s*(.*)$/i);
      if (rustMatch && !line.trim().startsWith('RUST') && !line.trim().startsWith('RUHE') && !line.trim().startsWith('IDLE')) {
        // Check of dit een programma-verwijzing is
        const before = rustMatch[1];
        const keyword = rustMatch[2];
        const after = rustMatch[3];
        
        // Verschillende patronen voor programma-verwijzingen:
        const isInParentheses = /\([^)]*$/.test(before.trim());
        const isAfterPlus = /\+\s*$/.test(before.trim());
        const isAtEndOfCondition = after.trim() === '' && /\)$/.test(before.trim());
        const containsProgramRef = /\([^)]*:[^)]*\)/.test(before);
        
        if (isInParentheses || isAfterPlus || isAtEndOfCondition || containsProgramRef) {
          // Dit is een programma-verwijzing, NIET splitsen
          normalizedLines.push(line);
          continue;
        }
        
        // Split the line: before part + new line with RUST
        normalizedLines.push(before.trim());
        normalizedLines.push(`${keyword.toUpperCase()}: ${after}`);
        continue;
      }
      
      // No embedded keywords, keep line as is
      normalizedLines.push(line);
    }
    
    // Rejoin and apply final normalization
    return normalizedLines.join('\n')
      // Normalize RUST/RUHE/IDLE - VERBETERD: nog flexibeler
      .replace(/^\s*(RUST|RUHE|IDLE)\s*[:\(\.]?\s*/gmi, (match, keyword) => `${keyword.toUpperCase()}: `)
      // Normalize SCHRITT/STAP/STEP - VERBETERD: handle various formats inclusief haakjes
      .replace(/^\s*(SCHRITT|STAP|STEP)\s*[-.\(\s]*(\d+)\s*[:.\)]*\s*/gmi, (match, keyword, number) => 
        `${keyword.toUpperCase()} ${number}: `)
      // Handle step without number (default to 1)
      .replace(/^\s*(SCHRITT|STAP|STEP)\s*[:.](?!\s*\d)/gmi, (match, keyword) => 
        `${keyword.toUpperCase()} 1: `)
      // Normalize VON SCHRITT declarations
      .replace(/^\s*(\+?\s*VON\s+(?:SCHRITT|STAP|STEP)\s+\d+)\s*$/gmi, (match, declaration) => 
        declaration.toUpperCase())
      // Fix common spacing issues around colons
      .replace(/(\w)\s*:\s*/g, '$1: ')
      // Remove extra spaces WITHIN lines (preserve newlines)
      .replace(/ {2,}/g, ' ');
  }

  /**
   * Normalize manual input
   */
  normalizeManualInput(text) {
    let normalized = text;
    
    // Fix common manual input issues
    normalized = this.fixManualInputIssues(normalized);
    
    // Ensure consistent formatting
    normalized = this.normalizeStepFormatting(normalized);
    
    return normalized;
  }

  /**
   * Fix common manual input issues
   */
  fixManualInputIssues(text) {
    return text
      // Fix missing spaces after colons
      .replace(/:/g, ': ')
      // Fix missing spaces after equals
      .replace(/=/g, ' = ')
      // Fix leading/trailing spaces on lines first
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Fix double spaces WITHIN lines (but preserve line breaks)
      .replace(/ {2,}/g, ' ');
  }

  /**
   * Apply consistency rules across all sources
   */
  applyConsistencyRules(text) {
    return text
      // Ensure consistent variable declarations
      .replace(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*$/gm, '$1 = ')
      // Ensure consistent STORING/MELDING format
      .replace(/^\s*(STORING|MELDING)\s*:\s*([^=]+)\s*=\s*$/gm, '$1: $2 = ')
      // Ensure consistent TIJD/TIME format
      .replace(/^\s*(TIJD|TIME|ZEIT)\s*=\s*([^=]+)$/gm, '$1 = $2')
      // Ensure consistent condition formatting
      .replace(/^\s*-\s*/gm, '- ')
      .replace(/^\s*\+\s*/gm, '+ ')
      // Remove empty lines at start/end
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
  }

  /**
   * Apply comprehensive validation
   */
  applyValidation(parsed) {
    const result = { ...parsed };
    
    // Validate variables
    result.variables.forEach(variable => {
      const validation = validateVariableDefinition(variable, this.validationRules);
      if (validation.errors.length > 0) {
        result.errors.push(...validation.errors);
      }
      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }
      variable.validationResult = validation;
    });
    
    // Validate steps
    result.steps.forEach(step => {
      const validation = validateStepDefinition(step, this.validationRules);
      if (validation.errors.length > 0) {
        result.errors.push(...validation.errors);
      }
      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }
      step.validationResult = validation;
    });
    
    // Validate cross-references
    this.validateAllCrossReferences(result);
    
    // Validate RUST/SCHRITT logic consistency
    this.validateStepLogicConsistency(result);
    
    return result;
  }

  /**
   * Validate all cross-references
   */
  validateAllCrossReferences(result) {
    // Extract cross-references from conditions
    const crossReferences = [];
    
    result.steps.forEach(step => {
      step.entryConditions.forEach(conditionGroup => {
        conditionGroup.conditions.forEach(condition => {
          if (condition.crossReference) {
            crossReferences.push({
              ...condition.crossReference,
              lineNumber: condition.lineNumber,
              step: step.number,
            });
          }
        });
      });
    });
    
    // Validate each cross-reference
    crossReferences.forEach(crossRef => {
      const validation = validateCrossReference(crossRef, this.programRegistry, this.validationRules);
      if (validation.errors.length > 0) {
        result.errors.push(...validation.errors);
      }
      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }
    });
    
    result.crossReferences = crossReferences;
  }

  /**
   * Validate RUST/SCHRITT logic consistency
   */
  validateStepLogicConsistency(result) {
    const steps = result.steps;
    
    // Check for duplicate step numbers
    const stepNumbers = new Map();
    steps.forEach(step => {
      if (step.type === 'SCHRITT') {
        if (stepNumbers.has(step.number)) {
          result.errors.push({
            type: 'DUPLICATE_STEP',
            message: `Duplicate step number: ${step.number}`,
            lineNumber: step.lineNumber,
          });
        }
        stepNumbers.set(step.number, step);
      }
    });
    
    // Check for missing sequential steps
    const schrittSteps = steps.filter(s => s.type === 'SCHRITT').sort((a, b) => a.number - b.number);
    for (let i = 1; i < schrittSteps.length; i++) {
      const current = schrittSteps[i];
      const previous = schrittSteps[i - 1];
      
      if (current.number !== previous.number + 1 && current.transitions.length === 0) {
        result.warnings.push({
          type: 'MISSING_SEQUENTIAL_STEP',
          message: `Gap in sequential steps: ${previous.number} -> ${current.number}`,
          lineNumber: current.lineNumber,
        });
      }
    }
    
    // Validate VON SCHRITT references
    steps.forEach(step => {
      step.transitions.forEach(transition => {
        const sourceStep = steps.find(s => s.number === transition.fromStep);
        if (!sourceStep) {
          result.errors.push({
            type: 'INVALID_VON_SCHRITT',
            message: `VON SCHRITT ${transition.fromStep} references non-existent step`,
            lineNumber: step.lineNumber,
          });
        }
      });
    });
  }

  /**
   * Register a program for cross-reference validation
   */
  registerProgram(programName, programData) {
    this.programRegistry.set(programName, programData);
  }

  /**
   * Get validation rules
   */
  getValidationRules() {
    return this.validationRules;
  }

  /**
   * Update validation rules
   */
  updateValidationRules(newRules) {
    this.validationRules = { ...this.validationRules, ...newRules };
  }

  /**
   * Export validation configuration
   */
  exportValidationConfig() {
    return {
      validationRules: this.validationRules,
      programRegistry: Array.from(this.programRegistry.entries()).map(([name, data]) => ({
        name,
        steps: data.steps.map(s => ({ number: s.number, type: s.type, description: s.description })),
      })),
    };
  }

  /**
   * Import validation configuration
   */
  importValidationConfig(config) {
    if (config.validationRules) {
      this.validationRules = config.validationRules;
    }
    
    if (config.programRegistry) {
      this.programRegistry.clear();
      config.programRegistry.forEach(program => {
        this.programRegistry.set(program.name, program);
      });
    }
  }

  /**
   * Get parsing statistics
   */
  getParsingStatistics(results) {
    const stats = {
      totalPrograms: results.length,
      totalSteps: results.reduce((sum, r) => sum + r.steps.length, 0),
      totalVariables: results.reduce((sum, r) => sum + r.variables.length, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      totalCrossReferences: results.reduce((sum, r) => sum + (r.crossReferences?.length || 0), 0),
      
      stepTypeDistribution: {
        RUST: results.reduce((sum, r) => sum + r.steps.filter(s => s.type === 'RUST').length, 0),
        SCHRITT: results.reduce((sum, r) => sum + r.steps.filter(s => s.type === 'SCHRITT').length, 0),
      },
      
      variableTypeDistribution: {
        hulpmerker: results.reduce((sum, r) => sum + r.variables.filter(v => v.type === 'hulpmerker').length, 0),
        storing: results.reduce((sum, r) => sum + r.variables.filter(v => v.type === 'storing').length, 0),
        melding: results.reduce((sum, r) => sum + r.variables.filter(v => v.type === 'melding').length, 0),
        tijd: results.reduce((sum, r) => sum + r.variables.filter(v => v.type === 'tijd').length, 0),
        teller: results.reduce((sum, r) => sum + r.variables.filter(v => v.type === 'teller').length, 0),
      },
      
      errorTypeDistribution: {},
      warningTypeDistribution: {},
    };
    
    // Calculate error/warning type distributions
    results.forEach(result => {
      result.errors.forEach(error => {
        stats.errorTypeDistribution[error.type] = (stats.errorTypeDistribution[error.type] || 0) + 1;
      });
      
      result.warnings.forEach(warning => {
        stats.warningTypeDistribution[warning.type] = (stats.warningTypeDistribution[warning.type] || 0) + 1;
      });
    });
    
    return stats;
  }
}

/**
 * Convenience function for unified parsing
 */
export function parseUnified(text, source = 'manual', syntaxRules, metadata = {}) {
  const parser = new UnifiedTextParser(syntaxRules);
  return parser.parse(text, source, metadata);
}