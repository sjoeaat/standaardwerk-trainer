// =====================================================================
// src/core/EnhancedParser.js - Enhanced Rule-Based Parser
// =====================================================================
// Advanced parser based on test-real-parsing.html logic
// Maintains flexibility for future training and optimization
// =====================================================================

import { determineVariableGroup } from './config/validationRules.js';

/**
 * Enhanced Parser with rule-based logic and training capabilities
 */
export class EnhancedParser {
  constructor(syntaxRules = {}, validationRules = {}) {
    this.syntaxRules = syntaxRules;
    this.validationRules = validationRules;
    
    // Core patterns (can be enhanced via training)
    this.patterns = {
      step: /^(RUST|RUHE|IDLE|STAP|SCHRITT|STEP)(?:\s+(\d+))?:\s*(.*)$/i,
      condition: {
        indentation: /^\s+/,
        orLogic: /^\s*\+/,
        andLogic: /^\s*-/,
        negation: /^(NIET|NOT|NICHT)\s+/i,
        timer: /(?:TIJD|ZEIT|TIME)\s+(\d+)\s*(Sek|sek|Min|min|s|m)\s*\?\?/i,
        crossReference: /^(.+?)\s*\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)\s*$/i,
        assignment: /^([^=]+)\s*=\s*(.*)$/,
        comparison: /^([^<>=!]+)\s*([<>=!]+)\s*(.*)$/,
      },
      variable: /^([A-Za-z][A-Za-z0-9_\s]*)\s*=\s*(.*)$/,
      program: /^([A-Za-z][A-Za-z0-9_\s]*)\s+(FB\d+)$/i,
    };
    
    // Training data storage
    this.trainingData = {
      steps: [],
      conditions: [],
      variables: [],
      crossReferences: [],
      patterns: new Map(),
    };
    
    // Performance metrics
    this.metrics = {
      totalSteps: 0,
      totalConditions: 0,
      totalVariables: 0,
      crossReferences: 0,
      timers: 0,
      parseErrors: 0,
      patternMatches: new Map(),
    };
  }

  /**
   * Parse text with enhanced rule-based logic
   */
  parseText(text, options = {}) {
    const lines = text.split('\n');
    const result = {
      steps: [],
      variables: [],
      conditions: [],
      crossReferences: [],
      errors: [],
      warnings: [],
      metadata: {
        totalLines: lines.length,
        parseTime: Date.now(),
        parser: 'EnhancedParser',
      },
    };

    let currentStep = null;
    let pendingConditions = [];
    let globalVariables = [];

    // Reset metrics
    this.resetMetrics();

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        // Try to parse as step
        const stepResult = this.parseStep(trimmed, index + 1);
        if (stepResult) {
          // Save previous step with its conditions
          if (currentStep) {
            currentStep.conditions = [...pendingConditions];
            result.steps.push(currentStep);
            this.metrics.totalSteps++;
          }
          
          currentStep = stepResult;
          pendingConditions = [];
          return;
        }

        // Try to parse as variable (outside of steps)
        const variableResult = this.parseVariable(trimmed, index + 1);
        if (variableResult && !currentStep) {
          globalVariables.push(variableResult);
          this.metrics.totalVariables++;
          return;
        }

        // Try to parse as condition (within steps)
        if (currentStep) {
          const conditionResult = this.parseCondition(trimmed, line, index + 1);
          if (conditionResult) {
            pendingConditions.push(conditionResult);
            this.metrics.totalConditions++;
            
            // Track cross-references
            if (conditionResult.crossReference) {
              result.crossReferences.push(conditionResult.crossReference);
              this.metrics.crossReferences++;
            }
            
            // Track timers
            if (conditionResult.timer) {
              this.metrics.timers++;
            }
            
            return;
          }
        }

        // If nothing matched, add to training data for future optimization
        this.addToTrainingData('unknown', {
          text: trimmed,
          lineNumber: index + 1,
          context: currentStep ? 'within_step' : 'global',
        });

      } catch (error) {
        result.errors.push({
          line: index + 1,
          message: error.message,
          text: trimmed,
        });
        this.metrics.parseErrors++;
      }
    });

    // Save last step
    if (currentStep) {
      currentStep.conditions = [...pendingConditions];
      result.steps.push(currentStep);
      this.metrics.totalSteps++;
    }

    // Add global variables
    result.variables = globalVariables;

    // Add all conditions to result
    result.conditions = result.steps.flatMap(step => step.conditions || []);

    return result;
  }

  /**
   * Parse step with enhanced pattern matching
   */
  parseStep(text, lineNumber) {
    const match = text.match(this.patterns.step);
    if (!match) return null;

    const [, keyword, number, description] = match;
    
    const step = {
      type: keyword.toUpperCase(),
      number: number ? parseInt(number) : 0,
      description: description.trim(),
      lineNumber,
      conditions: [],
      metadata: {
        originalText: text,
        parser: 'EnhancedParser',
      },
    };

    // Add to training data
    this.addToTrainingData('step', step);
    this.recordPatternMatch('step', this.patterns.step);

    return step;
  }

  /**
   * Parse condition with multiple detection methods
   */
  parseCondition(trimmed, originalLine, lineNumber) {
    const hasIndentation = this.patterns.condition.indentation.test(originalLine);
    const startsWithPlus = this.patterns.condition.orLogic.test(trimmed);
    const startsWithMinus = this.patterns.condition.andLogic.test(trimmed);
    const isNegated = this.patterns.condition.negation.test(trimmed);
    const hasTimer = this.patterns.condition.timer.test(trimmed);
    const hasAssignment = this.patterns.condition.assignment.test(trimmed);
    const hasComparison = this.patterns.condition.comparison.test(trimmed);
    const hasCrossRef = this.patterns.condition.crossReference.test(trimmed);

    // Check if this looks like a condition
    const isConditionLine = hasIndentation || startsWithPlus || startsWithMinus || 
                           isNegated || hasTimer || hasAssignment || hasCrossRef;

    if (!isConditionLine) return null;

    let conditionText = trimmed;
    
    // Clean condition text
    if (conditionText.startsWith('-')) conditionText = conditionText.substring(1).trim();
    const isOr = conditionText.startsWith('+');
    if (isOr) conditionText = conditionText.substring(1).trim();
    
    const negated = this.patterns.condition.negation.test(conditionText);
    if (negated) conditionText = conditionText.replace(this.patterns.condition.negation, '').trim();

    // Parse cross-reference
    const crossRefMatch = conditionText.match(this.patterns.condition.crossReference);
    let crossReference = null;
    if (crossRefMatch) {
      crossReference = {
        description: crossRefMatch[1].trim(),
        program: crossRefMatch[2].trim(),
        steps: crossRefMatch[4].split('+').map(s => parseInt(s.trim())),
        rawText: conditionText,
      };
    }

    // Parse timer
    const timerMatch = conditionText.match(this.patterns.condition.timer);
    let timer = null;
    if (timerMatch) {
      timer = {
        value: parseInt(timerMatch[1]),
        unit: timerMatch[2].toLowerCase(),
        rawText: conditionText,
      };
    }

    // Parse assignment
    const assignmentMatch = conditionText.match(this.patterns.condition.assignment);
    let assignment = null;
    if (assignmentMatch) {
      assignment = {
        variable: assignmentMatch[1].trim(),
        value: assignmentMatch[2].trim(),
        rawText: conditionText,
      };
    }

    const condition = {
      text: conditionText,
      operator: isOr ? 'OR' : 'AND',
      negated: negated,
      lineNumber,
      crossReference,
      timer,
      assignment,
      metadata: {
        originalText: trimmed,
        hasIndentation,
        detectionMethods: {
          indentation: hasIndentation,
          orLogic: startsWithPlus,
          andLogic: startsWithMinus,
          negation: isNegated,
          timer: hasTimer,
          assignment: hasAssignment,
          crossReference: hasCrossRef,
        },
      },
    };

    // Add to training data
    this.addToTrainingData('condition', condition);
    
    // Record pattern matches
    if (crossReference) this.recordPatternMatch('crossReference', this.patterns.condition.crossReference);
    if (timer) this.recordPatternMatch('timer', this.patterns.condition.timer);
    if (assignment) this.recordPatternMatch('assignment', this.patterns.condition.assignment);

    return condition;
  }

  /**
   * Parse variable with group detection
   */
  parseVariable(text, lineNumber) {
    const match = text.match(this.patterns.variable);
    if (!match) return null;

    const [, name, value] = match;
    const cleanName = name.trim();
    const cleanValue = value.trim();

    // Determine variable group using existing validation rules
    const group = determineVariableGroup(cleanName, this.validationRules);

    const variable = {
      name: cleanName,
      value: cleanValue,
      group,
      lineNumber,
      metadata: {
        originalText: text,
        parser: 'EnhancedParser',
      },
    };

    // Add to training data
    this.addToTrainingData('variable', variable);
    this.recordPatternMatch('variable', this.patterns.variable);

    return variable;
  }

  /**
   * Add training data for future optimization
   */
  addToTrainingData(type, data) {
    if (!this.trainingData[type]) {
      this.trainingData[type] = [];
    }
    
    this.trainingData[type].push({
      ...data,
      timestamp: Date.now(),
      confidence: this.calculateConfidence(type, data),
    });
  }

  /**
   * Calculate confidence score for training data
   */
  calculateConfidence(type, data) {
    switch (type) {
    case 'step':
      return data.number ? 0.95 : 0.85; // Numbered steps more confident
    case 'condition':
      let confidence = 0.7;
      if (data.crossReference) confidence += 0.15;
      if (data.timer) confidence += 0.1;
      if (data.assignment) confidence += 0.1;
      return Math.min(confidence, 1.0);
    case 'variable':
      return data.group !== 'hulpmerker' ? 0.8 : 0.6; // Non-default groups more confident
    default:
      return 0.5;
    }
  }

  /**
   * Record pattern match for metrics
   */
  recordPatternMatch(patternName, pattern) {
    if (!this.metrics.patternMatches.has(patternName)) {
      this.metrics.patternMatches.set(patternName, 0);
    }
    this.metrics.patternMatches.set(patternName, 
      this.metrics.patternMatches.get(patternName) + 1,
    );
  }

  /**
   * Load training data from JSON for pattern enhancement
   */
  loadTrainingData(jsonData) {
    console.log('🎓 Loading training data for pattern enhancement...');
    
    if (jsonData.bestSuggestions) {
      jsonData.bestSuggestions.forEach(suggestion => {
        this.enhancePatterns(suggestion);
      });
    }
    
    if (jsonData.patterns) {
      this.mergePatterns(jsonData.patterns);
    }
    
    console.log('✅ Training data loaded successfully');
  }

  /**
   * Enhance patterns based on training suggestions
   */
  enhancePatterns(suggestion) {
    const groupType = suggestion.suggestedGroup;
    const examples = suggestion.examples || [];
    
    // Generate new patterns based on examples
    examples.forEach(example => {
      if (groupType === 'hulpmerker' && example.includes('=')) {
        // Extract variable assignment patterns
        const pattern = this.generateVariablePattern(example);
        if (pattern) {
          this.addCustomPattern('variable', pattern);
        }
      } else if (groupType === 'cross_reference' && example.includes('SCHRITT')) {
        // Enhance cross-reference patterns
        const pattern = this.generateCrossRefPattern(example);
        if (pattern) {
          this.addCustomPattern('crossReference', pattern);
        }
      }
    });
  }

  /**
   * Generate variable pattern from example
   */
  generateVariablePattern(example) {
    // Extract common patterns from variable examples
    const words = example.split(/\s+/);
    const firstWord = words[0];
    
    if (firstWord && firstWord.match(/^[A-Za-z]/)) {
      return new RegExp(`^${firstWord}\\s+.*=`, 'i');
    }
    
    return null;
  }

  /**
   * Generate cross-reference pattern from example
   */
  generateCrossRefPattern(example) {
    // Extract program name and step reference patterns
    const match = example.match(/\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)/i);
    if (match) {
      const programName = match[1];
      // Create pattern for this program type
      return new RegExp(`\\(${programName}\\s+.*\\s+(SCHRITT|STAP|STEP)\\s+[0-9+]+\\)`, 'i');
    }
    
    return null;
  }

  /**
   * Add custom pattern for enhanced detection
   */
  addCustomPattern(type, pattern) {
    if (!this.patterns.custom) {
      this.patterns.custom = {};
    }
    
    if (!this.patterns.custom[type]) {
      this.patterns.custom[type] = [];
    }
    
    this.patterns.custom[type].push(pattern);
  }

  /**
   * Merge patterns from external source
   */
  mergePatterns(externalPatterns) {
    Object.keys(externalPatterns).forEach(key => {
      if (this.patterns[key] && typeof this.patterns[key] === 'object') {
        // Merge pattern objects
        this.patterns[key] = { ...this.patterns[key], ...externalPatterns[key] };
      }
    });
  }

  /**
   * Export training data for pattern generation
   */
  exportTrainingData() {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      parser: 'EnhancedParser',
      trainingData: this.trainingData,
      metrics: this.metrics,
      patterns: this.serializePatterns(),
    };
  }

  /**
   * Serialize patterns for JSON export
   */
  serializePatterns() {
    const serialized = {};
    
    Object.keys(this.patterns).forEach(key => {
      if (this.patterns[key] instanceof RegExp) {
        serialized[key] = this.patterns[key].source;
      } else if (typeof this.patterns[key] === 'object') {
        serialized[key] = {};
        Object.keys(this.patterns[key]).forEach(subKey => {
          if (this.patterns[key][subKey] instanceof RegExp) {
            serialized[key][subKey] = this.patterns[key][subKey].source;
          } else {
            serialized[key][subKey] = this.patterns[key][subKey];
          }
        });
      }
    });
    
    return serialized;
  }

  /**
   * Reset metrics for new parsing session
   */
  resetMetrics() {
    this.metrics = {
      totalSteps: 0,
      totalConditions: 0,
      totalVariables: 0,
      crossReferences: 0,
      timers: 0,
      parseErrors: 0,
      patternMatches: new Map(),
    };
  }

  /**
   * Get parsing performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      patternMatches: Object.fromEntries(this.metrics.patternMatches),
      parsingEfficiency: this.calculateParsingEfficiency(),
    };
  }

  /**
   * Calculate parsing efficiency score
   */
  calculateParsingEfficiency() {
    const total = this.metrics.totalSteps + this.metrics.totalConditions + this.metrics.totalVariables;
    const errors = this.metrics.parseErrors;
    
    return total > 0 ? (total - errors) / total : 0;
  }
}

export default EnhancedParser;