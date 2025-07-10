// =====================================================================
// src/config/validationRules.js - Validation Rules Configuration
// =====================================================================
// Defines validation rules for different variable groups and their
// implementation patterns in TIA Portal FBD format
// =====================================================================

export const DEFAULT_VALIDATION_RULES = {
  version: '1.1.0',
  lastUpdated: '2025-07-09',
  
  groups: {
    hulpmerker: {
      name: 'Hulpmerker',
      description: 'Standard auxiliary markers (Bool type)',
      patterns: [
        /^[a-zA-Z][a-zA-Z0-9_]*\s*=\s*$/,
        /^[^:]+\s*=\s*$/,  // Any text without colon followed by =
        // Auto-learned patterns from training v2 (optimized)
        /^([^=]+)\s*=$/,
        /^(Freigabe|Start|Aktuell|Aktuelle)\s+(.+)\s*=$/,
        /^(Einfuhr|Ausfuhr|Füllen|Entleeren|Umschwimmen|Freigabe)\s+(.+)\s*=$/,
        /^(Wartereihe|Beschäftigt|Gestartet|Fertig|Aktiv)\s+(.+)\s*=$/,
        // Detect "Freigabe" phrases
        /^[^=]*\b(Freigabe|Release|Enable|Enabled)\b[^=]*\s*=\s*$/,
        // Detect "von" phrases (like "Freigabe von Puffertanks")
        /^[^=]*\b(von|of|from)\b[^=]*\s*=\s*$/,
        // Detect common auxiliary marker keywords
        /^[^=]*\b(Bereit|Ready|Aktiv|Active|Verfügbar|Available|Besetzt|Occupied)\b[^=]*\s*=\s*$/,
      ],
      excludePatterns: [
        /^STORING:/,
        /^MELDING:/,
        /^TIJD\s*=/,
        /^Teller\s*=/,
        /^Variabele\s*=/,
        // Exclude störung patterns from hulpmerker
        /\b(Störung|Fault|Alarm|Error|Fehler)\b/i,
        // Exclude melding patterns from hulpmerker (but allow "Info" in specific contexts)
        /\b(Melding|Meldung|Message|Nachricht)\b/i,
        // Don't exclude "Info" alone as it could be part of other contexts
        /\b(Info|Information)\b.*\b(Display|Screen|Monitor|Anzeige)\b/i,
      ],
      implementation: {
        type: 'coil', // Default implementation
        alternativeType: 'sr', // If SET/RESET table follows
        dataType: 'Bool',
        arrayName: 'Hulp',
        arrayRange: [1, 32],
      },
      validation: {
        requiresConditions: true,
        allowsSetResetTable: true,
        maxConditions: 20,
      },
    },
    
    storing: {
      name: 'Storing',
      description: 'Fault/alarm variables (Bool type)',
      patterns: [
        /^STORING:\s*[^=]+\s*=\s*$/,
        /^STÖRUNG:\s*[^=]+\s*=\s*$/,
        /^FAULT:\s*[^=]+\s*=\s*$/,
        // Detect variables containing "Störung", "Fault", "Alarm", "Error" (with or without =)
        /^[^=]*\b(Störung|Fault|Alarm|Error|Fehler)\b[^=]*\s*(=\s*)?$/,
        // Detect technical codes with störung indicators
        /^[A-Z0-9]+\s+(Störung|Fault|Alarm|Error|Fehler)\s*(=\s*)?$/,
        // Detect störung in German text
        /^[^=]*\b(störung|fault|alarm|error|fehler)\b[^=]*\s*(=\s*)?$/i,
      ],
      implementation: {
        type: 'coil',
        dataType: 'Bool',
        arrayName: 'Storing',
        arrayRange: [1, 32],
      },
      validation: {
        requiresConditions: true,
        allowsSetResetTable: true,
        maxConditions: 10,
      },
    },
    
    melding: {
      name: 'Melding',
      description: 'Notification/message variables (Bool type)',
      patterns: [
        /^MELDING:\s*[^=]+\s*=\s*$/,
        /^MELDUNG:\s*[^=]+\s*=\s*$/,
        /^MESSAGE:\s*[^=]+\s*=\s*$/,
        // Detect variables containing "Melding", "Meldung", "Message", "Nachricht" (with or without =)
        /^[^=]*\b(Melding|Meldung|Message|Nachricht|Info|Information)\b[^=]*\s*(=\s*)?$/,
        // Detect technical codes with message indicators
        /^[A-Z0-9]+\s+(Melding|Meldung|Message|Nachricht)\s*(=\s*)?$/,
        // Detect melding in German/Dutch text
        /^[^=]*\b(melding|meldung|message|nachricht)\b[^=]*\s*(=\s*)?$/i,
      ],
      implementation: {
        type: 'coil',
        dataType: 'Bool',
        arrayName: 'Melding',
        arrayRange: [1, 32],
      },
      validation: {
        requiresConditions: true,
        allowsSetResetTable: true,
        maxConditions: 10,
      },
    },
    
    tijd: {
      name: 'Tijd',
      description: 'Timer variables (Time type)',
      patterns: [
        /^TIJD\s*=\s*[^=]+$/,
        /^ZEIT\s*=\s*[^=]+$/,
        /^TIME\s*=\s*[^=]+$/,
      ],
      implementation: {
        type: 'timer',
        dataType: 'IEC_TIMER',
        arrayName: 'Tijd',
        arrayRange: [1, 10],
      },
      validation: {
        requiresConditions: false,
        allowsSetResetTable: false,
        maxConditions: 0,
      },
    },
    
    teller: {
      name: 'Teller',
      description: 'Counter variables (Int type)',
      patterns: [
        /^Teller\s*=\s*[^=]+$/,
        /^TELLER\s*=\s*[^=]+$/,
        /^COUNTER\s*=\s*[^=]+$/,
        /^ZÄHLER\s*=\s*[^=]+$/,
      ],
      implementation: {
        type: 'counter',
        dataType: 'Int',
        arrayName: 'Teller',
        arrayRange: [1, 10],
      },
      validation: {
        requiresConditions: false,
        allowsSetResetTable: false,
        maxConditions: 0,
      },
    },
    
    variabele: {
      name: 'Variabele',
      description: 'General integer variables (Int type)',
      patterns: [
        /^Variabele\s*=\s*[^=]+$/,
        /^VARIABLE\s*=\s*[^=]+$/,
        /^VARIABELE\s*=\s*[^=]+$/,
      ],
      implementation: {
        type: 'variable',
        dataType: 'Int',
        arrayName: 'Variable',
        arrayRange: [1, 32],
      },
      validation: {
        requiresConditions: false,
        allowsSetResetTable: false,
        maxConditions: 0,
      },
    },
  },
  
  stepValidation: {
    rust: {
      name: 'RUST',
      description: 'Rest/idle state (implicit logic)',
      patterns: [
        /^(RUST|RUHE|IDLE):\s*(.*)$/,
      ],
      implementation: {
        stepNumber: 0,
        implicitLogic: true,
        negatesAllOtherSteps: true,
      },
      validation: {
        allowsExitConditions: true,
        allowsEntryConditions: false,
        maxConditions: 10,
      },
    },
    
    schritt: {
      name: 'SCHRITT',
      description: 'Sequential steps',
      patterns: [
        /^(SCHRITT|STAP|STEP)\s+(\d+):\s*(.*)$/,
        // Auto-learned patterns from training
        /^(\w+)\s+(\d+)\s*:\s*(.*)$/,
        /^(\d+\.?\d*)\s*([A-Z]\d*[x]?)\s*:\s*(.+)\s+FB\d+\s*\t?\d*$/,
      ],
      implementation: {
        stepNumber: 'dynamic',
        implicitLogic: false,
        requiresPreviousStep: true,
      },
      validation: {
        allowsExitConditions: true,
        allowsEntryConditions: true,
        allowsVonSchritt: true,
        maxConditions: 20,
      },
    },
  },
  
  crossReferenceValidation: {
    pattern: /^(.+?)\s*\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)\s*$/,
    // Auto-learned patterns from training
    patterns: [
      /^(.+?)\s*\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)\s*$/,
      /\([^)]+\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)/,
    ],
    validation: {
      requiresProgramExists: false, // Disable strict program validation
      requiresStepsExist: false,    // Disable strict step validation
      allowsMultipleSteps: true,
      separator: '+',
    },
  },
  
  transitionValidation: {
    vonSchritt: {
      pattern: /^\+?\s*VON\s+(SCHRITT|STAP|STEP)\s+(\d+)\s*$/,
      validation: {
        requiresSourceStep: true,
        allowsOrLogic: true,
        maxTransitions: 5,
      },
    },
    
    sequential: {
      validation: {
        implicitFromPrevious: true,
        requiresExitConditions: true,
        implicitNichtPrevious: true,
      },
    },
  },
  
  conditionValidation: {
    operators: {
      and: ['AND', 'EN', 'UND'],
      or: ['OR', 'OF', 'ODER'],
      not: ['NOT', 'NIET', 'NICHT'],
    },
    
    comparison: {
      operators: ['==', '!=', '<>', '>=', '<=', '>', '<'],
      allowedTypes: ['Int', 'Real', 'String', 'Bool'],
    },
    
    timer: {
      pattern: /(?:TIJD|ZEIT|TIME)\s+(\d+)\s*(Sek|Min|s|m)\s*\?\?/,
      validation: {
        requiresTimeValue: true,
        allowedUnits: ['Sek', 'Min', 's', 'm'],
        maxTimeValue: 3600,
      },
    },
    
    external: {
      pattern: /\*([^*]+)\*/,
      validation: {
        requiresValidation: true,
        allowsNesting: false,
      },
    },
  },
};

/**
 * Validates a variable definition against the configured rules
 */
export function validateVariableDefinition(definition, rules = DEFAULT_VALIDATION_RULES) {
  const errors = [];
  const warnings = [];
  
  // Determine group
  const group = determineVariableGroup(definition.name, rules);
  if (!group) {
    errors.push({
      type: 'UNKNOWN_GROUP',
      message: `Cannot determine group for variable: ${definition.name}`,
      lineNumber: definition.lineNumber,
    });
    return { errors, warnings, group: null };
  }
  
  // Validate against group rules
  const groupRules = rules.groups[group];
  
  // Check conditions requirement
  if (groupRules.validation.requiresConditions && (!definition.conditions || definition.conditions.length === 0)) {
    errors.push({
      type: 'MISSING_CONDITIONS',
      message: `Variable ${definition.name} of group ${group} requires conditions`,
      lineNumber: definition.lineNumber,
    });
  }
  
  // Check max conditions
  if (definition.conditions && definition.conditions.length > groupRules.validation.maxConditions) {
    warnings.push({
      type: 'TOO_MANY_CONDITIONS',
      message: `Variable ${definition.name} has ${definition.conditions.length} conditions, maximum is ${groupRules.validation.maxConditions}`,
      lineNumber: definition.lineNumber,
    });
  }
  
  return { errors, warnings, group, groupRules };
}

/**
 * Determines the variable group based on name and patterns
 */
export function determineVariableGroup(name, rules = DEFAULT_VALIDATION_RULES) {
  if (!name) return null;
  
  // Check each group's patterns
  for (const [groupName, groupConfig] of Object.entries(rules.groups)) {
    // Check exclude patterns first
    if (groupConfig.excludePatterns) {
      const excluded = groupConfig.excludePatterns.some(pattern => pattern.test(name));
      if (excluded) continue;
    }
    
    // Check include patterns
    const matched = groupConfig.patterns.some(pattern => pattern.test(name));
    if (matched) {
      return groupName;
    }
  }
  
  return 'hulpmerker'; // Default fallback
}

/**
 * Validates a step definition
 */
export function validateStepDefinition(step, rules = DEFAULT_VALIDATION_RULES) {
  const errors = [];
  const warnings = [];
  
  const stepType = step.type === 'RUST' ? 'rust' : 'schritt';
  const stepRules = rules.stepValidation[stepType];
  
  // Validate conditions
  if (step.entryConditions && step.entryConditions.length > 0 && !stepRules.validation.allowsEntryConditions) {
    errors.push({
      type: 'INVALID_ENTRY_CONDITIONS',
      message: `Step ${step.type} ${step.number} should not have entry conditions`,
      lineNumber: step.lineNumber,
    });
  }
  
  return { errors, warnings, stepRules };
}

/**
 * Validates cross-references
 */
export function validateCrossReference(crossRef, availablePrograms, rules = DEFAULT_VALIDATION_RULES) {
  const errors = [];
  const warnings = [];
  
  // Check if program exists
  if (rules.crossReferenceValidation.validation.requiresProgramExists) {
    if (!availablePrograms.has(crossRef.program)) {
      errors.push({
        type: 'PROGRAM_NOT_FOUND',
        message: `Referenced program '${crossRef.program}' not found`,
        lineNumber: crossRef.lineNumber,
      });
    }
  }
  
  // Check if steps exist
  if (rules.crossReferenceValidation.validation.requiresStepsExist) {
    const program = availablePrograms.get(crossRef.program);
    if (program) {
      const availableSteps = new Set(program.steps.map(s => s.number));
      crossRef.steps.forEach(stepNum => {
        if (!availableSteps.has(stepNum)) {
          errors.push({
            type: 'STEP_NOT_FOUND',
            message: `Step ${stepNum} not found in program '${crossRef.program}'`,
            lineNumber: crossRef.lineNumber,
          });
        }
      });
    }
  }
  
  return { errors, warnings };
}

/**
 * Export validation rules to JSON
 */
export function exportValidationRules(rules = DEFAULT_VALIDATION_RULES) {
  return JSON.stringify(rules, null, 2);
}

/**
 * Import validation rules from JSON
 */
export function importValidationRules(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    
    // Validate structure
    if (!imported.groups || !imported.stepValidation || !imported.crossReferenceValidation) {
      throw new Error('Invalid validation rules structure');
    }
    
    return imported;
  } catch (error) {
    console.error('Failed to import validation rules:', error);
    return null;
  }
}

/**
 * Merge custom rules with default rules
 */
export function mergeValidationRules(customRules, defaultRules = DEFAULT_VALIDATION_RULES) {
  return {
    ...defaultRules,
    ...customRules,
    groups: {
      ...defaultRules.groups,
      ...customRules.groups,
    },
    stepValidation: {
      ...defaultRules.stepValidation,
      ...customRules.stepValidation,
    },
  };
}