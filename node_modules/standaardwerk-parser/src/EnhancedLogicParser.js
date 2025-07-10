// =====================================================================
// src/core/EnhancedLogicParser.js - Enhanced RUST/SCHRITT Logic Parser
// =====================================================================
// Implements the correct RUST/SCHRITT methodology where:
// - RUST = NICHT SCHRITT 1 AND NICHT SCHRITT 2 AND ... (implicit)
// - Conditions above a step are ENTRY conditions for that step
// - VON SCHRITT declarations enable non-sequential transitions
// - Cross-references follow the pattern: (ProgramName SCHRITT X+Y+Z)
// =====================================================================

import { LogicParser } from './LogicParser.js';

/**
 * Enhanced parsing engine implementing correct RUST/SCHRITT methodology
 */
export class EnhancedLogicParser extends LogicParser {
  constructor(syntaxRules) {
    super(syntaxRules);
    this.pendingTransitions = [];
    this.crossReferences = new Map();
    this.validationRules = this.loadValidationRules();
  }

  /**
   * Parse with enhanced RUST/SCHRITT logic
   */
  parse(code, metadata = {}) {
    // Reset state for new parsing
    this.result = this.createEmptyResult();
    this.pendingTransitions = [];
    this.crossReferences.clear();
    
    // Merge metadata
    Object.assign(this.result, metadata);

    const lines = code.split('\n');
    let currentStep = null;
    let pendingConditions = [];
    let currentVariableDefinition = null;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        this.handleEmptyLine(pendingConditions, currentVariableDefinition);
        return;
      }

      // Parse verschillende regel types
      if (this.tryParseHeader(line, lineNumber)) return;
      if (this.tryParseSymbolik(line, lineNumber)) return;
      if (this.tryParseVariable(line, lineNumber, currentVariableDefinition, pendingConditions)) {
        currentVariableDefinition = this.getLastVariableDefinition();
        pendingConditions = [];
        return;
      }
      if (this.tryParseStep(line, lineNumber, currentStep, pendingConditions)) {
        currentStep = this.getLastStep();
        pendingConditions = [];
        return;
      }
      
      // Parse voorwaarden
      this.tryParseCondition(line, lineNumber, currentStep, currentVariableDefinition, pendingConditions);
    });

    // Finaliseer laatste variabele definitie
    this.finalizeCurrentVariable(currentVariableDefinition, pendingConditions);

    // Process step logic according to RUST/SCHRITT methodology
    this.processStepLogic();

    // Validate cross-references
    this.validateCrossReferences();

    // Bereken statistieken
    this.calculateStatistics();

    return this.result;
  }

  /**
   * Enhanced step parsing with VON SCHRITT support
   */
  tryParseStep(line, lineNumber, currentStep, pendingConditions) {
    const trimmedLine = line.trim();
    
    // Debug output for step parsing
    if (trimmedLine.toLowerCase().includes('schritt') || trimmedLine.toLowerCase().includes('rust') || trimmedLine.toLowerCase().includes('stap')) {
      console.log(`🔍 Trying to parse step on line ${lineNumber}: "${trimmedLine}"`);
      console.log('Available step keywords:', this.syntaxRules.stepKeywords);
    }
    
    // Check for VON SCHRITT declarations (non-sequential transitions)
    const vonSchrittMatch = trimmedLine.match(/^\+?\s*VON\s+(SCHRITT|STAP|STEP)\s+(\d+)\s*$/i);
    if (vonSchrittMatch) {
      const fromStep = parseInt(vonSchrittMatch[2]);
      const isOr = trimmedLine.startsWith('+');
      
      console.log(`📝 Found VON SCHRITT: from step ${fromStep}, isOr: ${isOr}`);
      
      // Store this as transition metadata for the next step
      this.pendingTransitions.push({
        fromStep,
        isOr,
        conditions: [], // Will be filled by pending conditions
      });
      return true;
    }

    // Check for step declarations
    const stepPattern = new RegExp(
      `^(${this.syntaxRules.stepKeywords.rest.join('|')}|${this.syntaxRules.stepKeywords.step.join('|')})(?:\\s+(\\d+))?:\\s*(.*)$`, 
      'i',
    );
    const stepMatch = trimmedLine.match(stepPattern);
    
    if (trimmedLine.toLowerCase().includes('schritt') || trimmedLine.toLowerCase().includes('rust') || trimmedLine.toLowerCase().includes('stap')) {
      console.log('🎯 Step pattern source:', stepPattern.source);
      console.log(`🎯 Testing line: "${trimmedLine}" (length: ${trimmedLine.length})`);
      console.log('🎯 Character codes:', [...trimmedLine].map(c => c.charCodeAt(0)));
      console.log('🎯 Step match result:', stepMatch);
    }

    if (stepMatch) {
      console.log(`✅ Successfully parsed step: ${stepMatch[1]} ${stepMatch[2] || ''} - ${stepMatch[3] || ''}`);
      
      // Finaliseer vorige stap met zijn conditions
      this.finalizeCurrentStep(currentStep, pendingConditions);

      const type = this.syntaxRules.stepKeywords.rest.some(k =>
        k.toLowerCase() === stepMatch[1].toLowerCase()) ? 'RUST' : 'SCHRITT';

      const stepNumber = type === 'RUST' ? 0 : parseInt(stepMatch[2]) || 1; // Default to 1 if no number

      const newStep = {
        type: type,
        number: stepNumber,
        description: stepMatch[3] || '',
        entryConditions: [], // Conditions to enter this step (from previous steps)
        exitConditions: [], // Conditions to exit this step (stored above next step)
        transitions: [], // Non-sequential transitions (VON SCHRITT)
        timers: [],
        markers: [],
        storingen: [],
        lineNumber,
      };

      // Apply any pending VON SCHRITT transitions
      if (this.pendingTransitions.length > 0) {
        newStep.transitions = [...this.pendingTransitions];
        this.pendingTransitions = [];
      }

      console.log('📝 Created step:', { type, number: stepNumber, description: newStep.description });
      this.result.steps.push(newStep);
      return true;
    }
    return false;
  }

  /**
   * Enhanced condition parsing with cross-reference support
   */
  tryParseCondition(line, lineNumber, currentStep, currentVariableDefinition, pendingConditions) {
    if (!currentStep && !currentVariableDefinition) return false;

    const trimmedLine = line.trim();
    if (!trimmedLine) return false;

    // Enhanced condition detection for Word documents without explicit markers
    const hasIndentation = /^\s+/.test(line);
    const hasExplicitMarkers = trimmedLine.startsWith('-') || trimmedLine.startsWith('+');
    
    // Check for implicit condition indicators
    const hasNegation = /^(NIET|NOT|NICHT)\s+/i.test(trimmedLine);
    const hasTimer = /(?:TIJD|ZEIT|TIME)\s+\d+/i.test(trimmedLine);
    const hasAssignment = trimmedLine.includes('=') && !trimmedLine.match(/^(RUST|RUHE|IDLE|STAP|SCHRITT|STEP)/i);
    const hasCrossRef = trimmedLine.includes('(') && trimmedLine.includes('SCHRITT');
    const hasComparison = /:\s*\w+/.test(trimmedLine) && !trimmedLine.includes('SCHRITT');
    
    // A line is a condition if it has explicit markers, indentation, OR implicit indicators
    const isConditionLine = hasExplicitMarkers || 
                           (hasIndentation && currentStep && trimmedLine.length > 0) ||
                           (currentStep && (hasNegation || hasTimer || hasAssignment || hasCrossRef || hasComparison));

    if (!isConditionLine) return false;

    console.log(`🔍 Detected condition on line ${lineNumber}: "${trimmedLine}" (markers: ${hasExplicitMarkers}, indented: ${hasIndentation}, implicit: ${hasNegation || hasTimer || hasAssignment || hasCrossRef || hasComparison})`);

    let conditionText = trimmedLine;
    
    // Remove condition markers
    if (conditionText.startsWith('-')) {
      conditionText = conditionText.substring(1).trim();
    }
    
    const isOr = conditionText.startsWith('+ ') || trimmedLine.startsWith('+ ');
    if (isOr) {
      conditionText = conditionText.replace(/^\+\s*/, '').trim();
    }

    const isNegated = /^(NIET|NOT|NICHT)\s+/i.test(conditionText);
    if (isNegated) {
      conditionText = conditionText.replace(/^(NIET|NOT|NICHT)\s+/i, '').trim();
    }

    console.log(`🔍 Parsing condition on line ${lineNumber}: "${conditionText}" (OR: ${isOr}, NOT: ${isNegated})`);

    // Check for variable assignments (ending with =)
    const isAssignment = conditionText.endsWith('=') || conditionText.includes('= ');
    if (isAssignment) {
      console.log(`📝 Found variable assignment: "${conditionText}"`);
      // This might be a variable definition within a step
      const variableName = conditionText.replace(/\s*=.*$/, '').trim();
      if (currentStep && variableName) {
        currentStep.assignments = currentStep.assignments || [];
        currentStep.assignments.push({
          variable: variableName,
          value: conditionText.includes('= ') ? conditionText.split('= ')[1].trim() : 'RUHE',
          lineNumber,
        });
      }
    }

    // Parse cross-references to other step programs
    const crossRefMatch = conditionText.match(/^(.+?)\s*\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)\s*$/i);
    let crossReference = null;
    if (crossRefMatch) {
      const steps = crossRefMatch[4].split('+').map(s => parseInt(s.trim()));
      crossReference = {
        description: crossRefMatch[1].trim(),
        program: crossRefMatch[2].trim(),
        steps: steps,
      };
      
      // Store for validation
      this.crossReferences.set(`${crossReference.program}:${crossReference.steps?.join('+') || 'unknown'}`, {
        ...crossReference,
        lineNumber,
        validated: false,
      });
    }

    const hasExternalRef = /\*([^*]+)\*/.test(conditionText);
    if (hasExternalRef) {
      this.result.statistics.externalReferences++;
    }

    // Timer conditions (Zeit 10sek ??)
    const timeMatch = conditionText.match(/(?:TIJD|ZEIT|TIME)\s+(\d+)\s*(Sek|sek|Min|min|s|m)\s*\??\??/i);
    const isTimeCondition = !!timeMatch;
    
    if (isTimeCondition) {
      console.log(`⏰ Found timer condition: ${timeMatch[1]} ${timeMatch[2]}`);
    }

    const comparisonMatch = conditionText.match(/^([a-zA-Z0-9_.\[\]]+)\s*(==|!=|<>|>=|<=|>|<)\s*(.+)$/);
    let comparisonData = null;
    if (comparisonMatch) {
      comparisonData = {
        variable: comparisonMatch[1].trim(),
        operator: comparisonMatch[2],
        value: comparisonMatch[3].trim().replace(/["']/g, ''),
      };
    }

    const condition = {
      text: conditionText,
      negated: isNegated,
      hasExternalRef: hasExternalRef,
      crossReference: crossReference,
      isTimeCondition: isTimeCondition,
      timeValue: timeMatch ? parseInt(timeMatch[1]) : null,
      timeUnit: timeMatch ? timeMatch[2] : null,
      hasComparison: !!comparisonData,
      comparison: comparisonData,
      lineNumber,
      operator: isOr ? 'OR' : 'AND',
    };

    // Add condition to appropriate target
    if (currentStep) {
      this.addConditionToStep(currentStep, condition, isOr);
      this.result.statistics.totalConditions++;
      
      // Extract and categorize variables from condition
      this.extractVariablesFromCondition(condition, currentStep);
    } else if (currentVariableDefinition) {
      pendingConditions.push(condition);
    }

    // If we have pending transitions, add condition to the latest one
    if (this.pendingTransitions.length > 0) {
      const lastTransition = this.pendingTransitions[this.pendingTransitions.length - 1];
      lastTransition.conditions.push(condition);
    }

    return true;
  }

  /**
   * Add condition to step according to RUST/SCHRITT logic
   */
  addConditionToStep(step, condition, isOr) {
    // According to RUST/SCHRITT logic: conditions above a step are ENTRY conditions
    // These are the conditions needed to ENTER this step (exit conditions from previous step)
    
    if (isOr && step.entryConditions.length > 0) {
      step.entryConditions.push({
        type: 'group',
        operator: 'OR',
        conditions: [condition],
      });
    } else if (step.entryConditions.length === 0) {
      step.entryConditions.push({
        type: 'group',
        operator: 'AND',
        conditions: [condition],
      });
    } else {
      const lastGroup = step.entryConditions[step.entryConditions.length - 1];
      lastGroup.conditions.push(condition);
    }
  }

  /**
   * Finalize current step with exit conditions
   */
  finalizeCurrentStep(currentStep, pendingConditions) {
    if (currentStep && pendingConditions.length > 0) {
      // These pending conditions become the EXIT conditions of the current step
      // They will be used to transition to the next step
      currentStep.exitConditions = [{
        type: 'group',
        operator: 'AND',
        conditions: [...pendingConditions],
      }];
      pendingConditions.length = 0;
    }
  }

  /**
   * Process step logic according to RUST/SCHRITT methodology
   */
  processStepLogic() {
    const steps = this.result.steps;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      if (step.type === 'RUST') {
        // RUST logic: NICHT SCHRITT 1 AND NICHT SCHRITT 2 AND ...
        step.implicitConditions = steps
          .filter(s => s.type === 'SCHRITT')
          .map(s => ({
            type: 'implicit',
            text: `NICHT SCHRITT ${s.number}`,
            negated: true,
            stepReference: s.number,
          }));
      } else if (step.type === 'SCHRITT') {
        // Regular step logic
        const prevStep = i > 0 ? steps[i - 1] : null;
        
        if (prevStep && step.transitions.length === 0) {
          // Sequential transition: add implicit "from previous step" condition
          step.implicitFromStep = prevStep.number;
        }
        
        // Process non-sequential transitions
        step.transitions.forEach(transition => {
          const fromStep = steps.find(s => s.number === transition.fromStep);
          if (fromStep) {
            transition.fromStepRef = fromStep;
            transition.implicitConditions = [
              {
                type: 'implicit',
                text: `SCHRITT ${transition.fromStep}`,
                negated: false,
                stepReference: transition.fromStep,
              },
              {
                type: 'implicit',
                text: `NICHT SCHRITT ${transition.fromStep - 1}`,
                negated: true,
                stepReference: transition.fromStep - 1,
              },
            ];
          }
        });
      }
    }
  }

  /**
   * Validate cross-references to other programs
   */
  validateCrossReferences() {
    const errors = [];
    const warnings = [];
    
    this.crossReferences.forEach((ref, key) => {
      // Check if referenced program exists (would need external program registry)
      // For now, just mark as warning
      warnings.push({
        type: 'CROSS_REFERENCE',
        message: `Cross-reference to program '${ref.program}' steps [${ref.steps.join(', ')}] needs validation`,
        lineNumber: ref.lineNumber,
        severity: 'warning',
      });
    });
    
    this.result.warnings.push(...warnings);
    this.result.errors.push(...errors);
  }

  /**
   * Enhanced variable detection with group validation
   */
  detectVariableType(name) {
    if (!name) return 'hulpmerker';
    const lowerName = name.toLowerCase();

    // Check for STORING prefix
    if (lowerName.startsWith('storing')) {
      return 'storing';
    }

    // Check for MELDING prefix
    if (lowerName.startsWith('melding')) {
      return 'melding';
    }

    // Check for TIJD/TIME keywords
    if (this.syntaxRules.variableDetection.timerKeywords.some(keyword =>
      lowerName.includes(keyword.toLowerCase()))) {
      return 'tijd';
    }

    // Check for TELLER keywords
    if (lowerName.includes('teller') || lowerName.includes('counter')) {
      return 'teller';
    }

    // Check for MARKER keywords
    if (this.syntaxRules.variableDetection.markerKeywords.some(keyword =>
      lowerName.includes(keyword.toLowerCase()))) {
      return 'marker';
    }

    // Default to hulpmerker
    return 'hulpmerker';
  }

  /**
   * Load validation rules from configuration
   */
  loadValidationRules() {
    return {
      groups: {
        hulpmerker: {
          pattern: /^[a-zA-Z][a-zA-Z0-9_]*\\s*=\\s*$/,
          implementation: 'coil', // or 'sr' if SET/RESET table follows
          arrayName: 'Hulp',
          arrayRange: [1, 32],
        },
        storing: {
          pattern: /^STORING:\\s*[^=]+\\s*=\\s*$/,
          implementation: 'coil',
          arrayName: 'Storing',
          arrayRange: [1, 32],
        },
        melding: {
          pattern: /^MELDING:\\s*[^=]+\\s*=\\s*$/,
          implementation: 'coil',
          arrayName: 'Melding',
          arrayRange: [1, 32],
        },
        tijd: {
          pattern: /^TIJD\\s*=\\s*[^=]+$/,
          implementation: 'timer',
          arrayName: 'Tijd',
          arrayRange: [1, 10],
        },
        teller: {
          pattern: /^Teller\\s*=\\s*[^=]+$/,
          implementation: 'counter',
          arrayName: 'Teller',
          arrayRange: [1, 10],
        },
        variabele: {
          pattern: /^Variabele\\s*=\\s*[^=]+$/,
          implementation: 'variable',
          arrayName: 'Variable',
          arrayRange: [1, 32],
        },
      },
    };
  }

  /**
   * Export validation rules to JSON
   */
  exportValidationRules() {
    return JSON.stringify(this.validationRules, null, 2);
  }

  /**
   * Import validation rules from JSON
   */
  importValidationRules(jsonString) {
    try {
      this.validationRules = JSON.parse(jsonString);
      return true;
    } catch (error) {
      console.error('Failed to import validation rules:', error);
      return false;
    }
  }

  /**
   * Enhanced statistics calculation
   */
  calculateStatistics() {
    super.calculateStatistics();
    
    // Add RUST/SCHRITT specific statistics
    this.result.statistics.rustSteps = this.result.steps.filter(s => s.type === 'RUST').length;
    this.result.statistics.schrittSteps = this.result.steps.filter(s => s.type === 'SCHRITT').length;
    this.result.statistics.nonSequentialTransitions = this.result.steps
      .reduce((total, step) => total + step.transitions.length, 0);
    this.result.statistics.crossReferences = this.crossReferences.size;
  }
}

/**
 * Convenience function for backward compatibility
 */
export function parseStandaardwerkEnhanced(code, syntaxRules) {
  const parser = new EnhancedLogicParser(syntaxRules);
  return parser.parse(code);
}