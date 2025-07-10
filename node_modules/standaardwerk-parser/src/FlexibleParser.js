// =====================================================================
// src/core/FlexibleParser.js - Flexible Parser for Real-World Usage
// =====================================================================
// Combines EnhancedParser logic with flexible validation
// Based on test-real-parsing.html but adapted for production use
// =====================================================================

import { EnhancedParser } from './EnhancedParser.js';

/**
 * Flexible Parser that uses EnhancedParser with relaxed validation
 */
export class FlexibleParser {
  constructor(syntaxRules = {}, validationRules = {}) {
    this.enhancedParser = new EnhancedParser(syntaxRules, validationRules);
    this.syntaxRules = syntaxRules;
    this.validationRules = validationRules;
  }

  /**
   * Parse text with flexible validation (compatible with UnifiedTextParser interface)
   */
  parse(text, source = 'manual', metadata = {}) {
    // Use EnhancedParser for actual parsing
    const result = this.enhancedParser.parseText(text);
    
    // Apply flexible validation (less strict than original)
    const validatedResult = this.applyFlexibleValidation(result);
    
    // Add metadata to match UnifiedTextParser interface
    validatedResult.parsingMetadata = {
      source,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      parser: 'FlexibleParser',
      normalizedLineCount: text.split('\n').length,
      originalLineCount: text.split('\n').length,
    };
    
    return validatedResult;
  }

  /**
   * Apply flexible validation (less strict than original)
   */
  applyFlexibleValidation(result) {
    const validatedResult = {
      ...result,
      errors: [],
      warnings: [],
    };

    // Validate steps with flexible rules
    result.steps.forEach(step => {
      this.validateStepFlexibly(step, validatedResult);
    });

    // Validate cross-references with flexible rules
    result.crossReferences.forEach(crossRef => {
      this.validateCrossReferenceFlexibly(crossRef, validatedResult);
    });

    // Validate variables with flexible rules
    result.variables.forEach(variable => {
      this.validateVariableFlexibly(variable, validatedResult);
    });

    return validatedResult;
  }

  /**
   * Validate step with flexible rules
   */
  validateStepFlexibly(step, result) {
    // Don't complain about RUST steps having conditions
    // This is a common pattern in real programs
    
    // Only validate serious structural issues
    if (step.number < 0) {
      result.errors.push({
        type: 'INVALID_STEP_NUMBER',
        message: `Step number cannot be negative: ${step.number}`,
        lineNumber: step.lineNumber,
      });
    }

    // Check for reasonable step description
    if (!step.description || step.description.trim().length === 0) {
      result.warnings.push({
        type: 'EMPTY_STEP_DESCRIPTION',
        message: `Step ${step.type} ${step.number} has no description`,
        lineNumber: step.lineNumber,
      });
    }
  }

  /**
   * Validate cross-reference with flexible rules
   */
  validateCrossReferenceFlexibly(crossRef, result) {
    // Don't require programs to exist in registry
    // This is too strict for real-world usage
    
    // Only validate structural issues
    if (!crossRef.program || crossRef.program.trim().length === 0) {
      result.warnings.push({
        type: 'EMPTY_PROGRAM_REFERENCE',
        message: 'Cross-reference has empty program name',
        lineNumber: crossRef.lineNumber,
      });
    }

    if (!crossRef.steps || crossRef.steps.length === 0) {
      result.warnings.push({
        type: 'EMPTY_STEP_REFERENCE',
        message: 'Cross-reference has no step numbers',
        lineNumber: crossRef.lineNumber,
      });
    }
  }

  /**
   * Validate variable with flexible rules
   */
  validateVariableFlexibly(variable, result) {
    // Only validate basic structure
    if (!variable.name || variable.name.trim().length === 0) {
      result.errors.push({
        type: 'EMPTY_VARIABLE_NAME',
        message: 'Variable has empty name',
        lineNumber: variable.lineNumber,
      });
    }
  }

  /**
   * Get parsing metrics (compatible with EnhancedParser)
   */
  getMetrics() {
    return this.enhancedParser.getMetrics();
  }

  /**
   * Load training data (compatible with EnhancedParser)
   */
  loadTrainingData(jsonData) {
    return this.enhancedParser.loadTrainingData(jsonData);
  }

  /**
   * Export training data (compatible with EnhancedParser)
   */
  exportTrainingData() {
    return this.enhancedParser.exportTrainingData();
  }

  /**
   * Parse text directly (alias for compatibility)
   */
  parseText(text, options = {}) {
    return this.enhancedParser.parseText(text, options);
  }
}

export default FlexibleParser;