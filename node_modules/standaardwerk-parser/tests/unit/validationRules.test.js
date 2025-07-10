import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  DEFAULT_VALIDATION_RULES,
  validateVariableDefinition,
  determineVariableGroup,
  validateStepDefinition,
  validateCrossReference,
  exportValidationRules,
  importValidationRules,
  mergeValidationRules,
} from '../../src/config/validationRules.js';

describe('validationRules Configuration', () => {
  describe('DEFAULT_VALIDATION_RULES structure', () => {
    test('should have correct version and metadata', () => {
      expect(DEFAULT_VALIDATION_RULES.version).toBe('1.1.0');
      expect(DEFAULT_VALIDATION_RULES.lastUpdated).toBe('2025-07-09');
    });
    
    test('should have all required top-level sections', () => {
      expect(DEFAULT_VALIDATION_RULES).toHaveProperty('groups');
      expect(DEFAULT_VALIDATION_RULES).toHaveProperty('stepValidation');
      expect(DEFAULT_VALIDATION_RULES).toHaveProperty('crossReferenceValidation');
      expect(DEFAULT_VALIDATION_RULES).toHaveProperty('transitionValidation');
      expect(DEFAULT_VALIDATION_RULES).toHaveProperty('conditionValidation');
    });
  });
  
  describe('Variable Groups', () => {
    test('should have all variable groups defined', () => {
      const expectedGroups = ['hulpmerker', 'storing', 'melding', 'tijd', 'teller', 'variabele'];
      expectedGroups.forEach(group => {
        expect(DEFAULT_VALIDATION_RULES.groups).toHaveProperty(group);
      });
    });
    
    test('each group should have required properties', () => {
      Object.entries(DEFAULT_VALIDATION_RULES.groups).forEach(([groupName, group]) => {
        expect(group).toHaveProperty('name');
        expect(group).toHaveProperty('description');
        expect(group).toHaveProperty('patterns');
        expect(group).toHaveProperty('implementation');
        expect(group).toHaveProperty('validation');
        expect(Array.isArray(group.patterns)).toBe(true);
      });
    });
    
    describe('hulpmerker group', () => {
      test('should have correct patterns', () => {
        const hulpmerker = DEFAULT_VALIDATION_RULES.groups.hulpmerker;
        expect(hulpmerker.patterns.length).toBeGreaterThan(5);
        expect(hulpmerker.excludePatterns).toBeDefined();
        expect(hulpmerker.excludePatterns.length).toBeGreaterThan(5);
      });
      
      test('should match hulpmerker patterns', () => {
        const hulpmerker = DEFAULT_VALIDATION_RULES.groups.hulpmerker;
        const testCases = [
          { input: 'Variable =', expected: true },
          { input: 'Freigabe Tank A =', expected: true },
          { input: 'Bereit System =', expected: true },
          { input: 'Ready to start =', expected: true },
          { input: 'STORING: Error =', expected: false }, // Should be excluded
          { input: 'TIJD =', expected: false }, // Should be excluded
        ];
        
        testCases.forEach(({ input, expected }) => {
          const excluded = hulpmerker.excludePatterns?.some(p => p.test(input)) || false;
          const matched = hulpmerker.patterns.some(p => p.test(input)) && !excluded;
          expect(matched).toBe(expected);
        });
      });
      
      test('should have correct implementation details', () => {
        const impl = DEFAULT_VALIDATION_RULES.groups.hulpmerker.implementation;
        expect(impl.type).toBe('coil');
        expect(impl.alternativeType).toBe('sr');
        expect(impl.dataType).toBe('Bool');
        expect(impl.arrayName).toBe('Hulp');
        expect(impl.arrayRange).toEqual([1, 32]);
      });
    });
    
    describe('storing group', () => {
      test('should match storing patterns', () => {
        const storing = DEFAULT_VALIDATION_RULES.groups.storing;
        const testCases = [
          { input: 'STORING: Motor fault =', expected: true },
          { input: 'STÖRUNG: Sensor error =', expected: true },
          { input: 'FAULT: System failure =', expected: true },
          { input: 'Tank Störung =', expected: true },
          { input: 'E01 Alarm =', expected: true },
          { input: 'Normal variable =', expected: false },
        ];
        
        testCases.forEach(({ input, expected }) => {
          const matched = storing.patterns.some(p => p.test(input));
          expect(matched).toBe(expected);
        });
      });
    });
    
    describe('melding group', () => {
      test('should match melding patterns', () => {
        const melding = DEFAULT_VALIDATION_RULES.groups.melding;
        const testCases = [
          { input: 'MELDING: Process started =', expected: true },
          { input: 'MESSAGE: Status update =', expected: true },
          { input: 'Info display active =', expected: true },
          { input: 'System Nachricht =', expected: true },
          { input: 'Normal variable =', expected: false },
        ];
        
        testCases.forEach(({ input, expected }) => {
          const matched = melding.patterns.some(p => p.test(input));
          expect(matched).toBe(expected);
        });
      });
    });
    
    describe('tijd group', () => {
      test('should match timer patterns', () => {
        const tijd = DEFAULT_VALIDATION_RULES.groups.tijd;
        const testCases = [
          { input: 'TIJD = 100s', expected: true },
          { input: 'TIME = PT5M', expected: true },
          { input: 'ZEIT = 30', expected: true },
          { input: 'Regular = value', expected: false },
        ];
        
        testCases.forEach(({ input, expected }) => {
          const matched = tijd.patterns.some(p => p.test(input));
          expect(matched).toBe(expected);
        });
      });
    });
  });
  
  describe('Step Validation', () => {
    test('should have rust and schritt validation rules', () => {
      expect(DEFAULT_VALIDATION_RULES.stepValidation).toHaveProperty('rust');
      expect(DEFAULT_VALIDATION_RULES.stepValidation).toHaveProperty('schritt');
    });
    
    test('rust validation should have correct properties', () => {
      const rust = DEFAULT_VALIDATION_RULES.stepValidation.rust;
      expect(rust.implementation.stepNumber).toBe(0);
      expect(rust.implementation.implicitLogic).toBe(true);
      expect(rust.implementation.negatesAllOtherSteps).toBe(true);
      expect(rust.validation.allowsExitConditions).toBe(true);
      expect(rust.validation.allowsEntryConditions).toBe(false);
    });
    
    test('schritt validation should have correct properties', () => {
      const schritt = DEFAULT_VALIDATION_RULES.stepValidation.schritt;
      expect(schritt.implementation.stepNumber).toBe('dynamic');
      expect(schritt.implementation.requiresPreviousStep).toBe(true);
      expect(schritt.validation.allowsVonSchritt).toBe(true);
      expect(schritt.validation.maxConditions).toBe(20);
    });
  });
  
  describe('Cross Reference Validation', () => {
    test('should have correct patterns', () => {
      const crossRef = DEFAULT_VALIDATION_RULES.crossReferenceValidation;
      expect(crossRef.patterns).toBeInstanceOf(Array);
      expect(crossRef.patterns.length).toBeGreaterThan(0);
      
      crossRef.patterns.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });
    
    test('should match cross-reference patterns', () => {
      const patterns = DEFAULT_VALIDATION_RULES.crossReferenceValidation.patterns;
      const testCases = [
        'Condition (Program SCHRITT 5)',
        'Check (FB102 STEP 3+5+7)',
        'Reference (Test STAP 10)',
      ];
      
      testCases.forEach(testCase => {
        const matched = patterns.some(p => p.test(testCase));
        expect(matched).toBe(true);
      });
    });
    
    test('should have correct validation settings', () => {
      const validation = DEFAULT_VALIDATION_RULES.crossReferenceValidation.validation;
      expect(validation.requiresProgramExists).toBe(false);
      expect(validation.requiresStepsExist).toBe(false);
      expect(validation.allowsMultipleSteps).toBe(true);
      expect(validation.separator).toBe('+');
    });
  });
  
  describe('Transition Validation', () => {
    test('should have vonSchritt pattern', () => {
      const vonSchritt = DEFAULT_VALIDATION_RULES.transitionValidation.vonSchritt;
      expect(vonSchritt.pattern).toBeInstanceOf(RegExp);
      
      const testCases = [
        { input: '+ VON SCHRITT 5', expected: true },
        { input: 'VON STEP 10', expected: true },
        { input: '+ VON STAP 3', expected: true },
        { input: 'Invalid transition', expected: false },
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(vonSchritt.pattern.test(input)).toBe(expected);
      });
    });
  });
  
  describe('Condition Validation', () => {
    test('should have operator definitions', () => {
      const operators = DEFAULT_VALIDATION_RULES.conditionValidation.operators;
      expect(operators.and).toEqual(['AND', 'EN', 'UND']);
      expect(operators.or).toEqual(['OR', 'OF', 'ODER']);
      expect(operators.not).toEqual(['NOT', 'NIET', 'NICHT']);
    });
    
    test('should have comparison operators', () => {
      const comparison = DEFAULT_VALIDATION_RULES.conditionValidation.comparison;
      expect(comparison.operators).toContain('==');
      expect(comparison.operators).toContain('!=');
      expect(comparison.operators).toContain('>=');
      expect(comparison.allowedTypes).toContain('Int');
      expect(comparison.allowedTypes).toContain('Bool');
    });
    
    test('should have timer pattern', () => {
      const timer = DEFAULT_VALIDATION_RULES.conditionValidation.timer;
      expect(timer.pattern).toBeInstanceOf(RegExp);
      
      const testCases = [
        { input: 'TIJD 300Sek ??', expected: true },
        { input: 'TIME 5Min ??', expected: true },
        { input: 'ZEIT 60s ??', expected: true },
        { input: 'Invalid timer', expected: false },
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(timer.pattern.test(input)).toBe(expected);
      });
    });
  });
});

describe('validateVariableDefinition', () => {
  test('should validate hulpmerker variable correctly', () => {
    const definition = {
      name: 'Freigabe Tank A =',
      conditions: ['Tank ready', 'Process active'],
      lineNumber: 10,
    };
    
    const result = validateVariableDefinition(definition);
    
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.group).toBe('hulpmerker');
    expect(result.groupRules).toBeDefined();
  });
  
  test('should require conditions for hulpmerker', () => {
    const definition = {
      name: 'Test Variable =',
      conditions: [],
      lineNumber: 20,
    };
    
    const result = validateVariableDefinition(definition);
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('MISSING_CONDITIONS');
    expect(result.group).toBe('hulpmerker');
  });
  
  test('should warn about too many conditions', () => {
    const definition = {
      name: 'Test Variable =',
      conditions: Array(25).fill('Condition'),
      lineNumber: 30,
    };
    
    const result = validateVariableDefinition(definition);
    
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('TOO_MANY_CONDITIONS');
  });
  
  test('should handle unknown variable group', () => {
    const definition = {
      name: 'Unknown type',
      conditions: [],
      lineNumber: 40,
    };
    
    const result = validateVariableDefinition(definition);
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('MISSING_CONDITIONS'); // It defaults to hulpmerker which requires conditions
    expect(result.group).toBe('hulpmerker'); // Default fallback
  });
});

describe('determineVariableGroup', () => {
  test('should determine correct group for variables', () => {
    const testCases = [
      { name: 'Simple Variable =', expected: 'hulpmerker' },
      { name: 'STORING: Motor fault =', expected: 'storing' },
      { name: 'MELDING: Status =', expected: 'melding' },
      { name: 'TIJD = 100s', expected: 'tijd' },
      { name: 'Teller = 5', expected: 'teller' },
      { name: 'Variabele = 42', expected: 'variabele' },
      { name: 'Freigabe System =', expected: 'hulpmerker' },
      { name: 'Tank Störung =', expected: 'storing' },
    ];
    
    testCases.forEach(({ name, expected }) => {
      expect(determineVariableGroup(name)).toBe(expected);
    });
  });
  
  test('should handle null or empty names', () => {
    expect(determineVariableGroup(null)).toBe(null);
    expect(determineVariableGroup('')).toBe(null);
    expect(determineVariableGroup(undefined)).toBe(null);
  });
  
  test('should respect exclude patterns', () => {
    // These should be excluded from hulpmerker even though they end with =
    expect(determineVariableGroup('STORING: Test =')).toBe('storing');
    expect(determineVariableGroup('TIJD = 100s')).toBe('tijd'); // TIJD needs a value to match tijd pattern
  });
});

describe('validateStepDefinition', () => {
  test('should validate RUST step correctly', () => {
    const step = {
      type: 'RUST',
      number: 0,
      entryConditions: [],
      lineNumber: 10,
    };
    
    const result = validateStepDefinition(step);
    
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.stepRules).toBeDefined();
  });
  
  test('should error on RUST with entry conditions', () => {
    const step = {
      type: 'RUST',
      number: 0,
      entryConditions: ['Invalid condition'],
      lineNumber: 20,
    };
    
    const result = validateStepDefinition(step);
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('INVALID_ENTRY_CONDITIONS');
  });
  
  test('should validate SCHRITT step correctly', () => {
    const step = {
      type: 'SCHRITT',
      number: 5,
      entryConditions: ['Valid entry'],
      lineNumber: 30,
    };
    
    const result = validateStepDefinition(step);
    
    expect(result.errors).toHaveLength(0);
    expect(result.stepRules.validation.allowsEntryConditions).toBe(true);
  });
});

describe('validateCrossReference', () => {
  test('should pass when validation is disabled', () => {
    const crossRef = {
      program: 'FB999',
      steps: [1, 2, 3],
      lineNumber: 10,
    };
    
    const availablePrograms = new Map();
    const result = validateCrossReference(crossRef, availablePrograms);
    
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
  
  test('should validate with custom rules requiring program exists', () => {
    const crossRef = {
      program: 'FB100',
      steps: [1, 2],
      lineNumber: 20,
    };
    
    const availablePrograms = new Map();
    const customRules = {
      ...DEFAULT_VALIDATION_RULES,
      crossReferenceValidation: {
        ...DEFAULT_VALIDATION_RULES.crossReferenceValidation,
        validation: {
          requiresProgramExists: true,
          requiresStepsExist: false,
        },
      },
    };
    
    const result = validateCrossReference(crossRef, availablePrograms, customRules);
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('PROGRAM_NOT_FOUND');
  });
});

describe('exportValidationRules', () => {
  test('should export rules as JSON string', () => {
    const exported = exportValidationRules();
    
    expect(typeof exported).toBe('string');
    const parsed = JSON.parse(exported);
    expect(parsed.version).toBe(DEFAULT_VALIDATION_RULES.version);
    expect(parsed.groups).toBeDefined();
  });
  
  test('should export custom rules', () => {
    const customRules = {
      version: '2.0.0',
      groups: { test: { name: 'Test' } },
    };
    
    const exported = exportValidationRules(customRules);
    const parsed = JSON.parse(exported);
    
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.groups.test).toBeDefined();
  });
});

describe('importValidationRules', () => {
  test('should import valid JSON rules', () => {
    const validJson = JSON.stringify({
      groups: { test: {} },
      stepValidation: {},
      crossReferenceValidation: {},
    });
    
    const imported = importValidationRules(validJson);
    
    expect(imported).not.toBe(null);
    expect(imported.groups.test).toBeDefined();
  });
  
  test('should return null for invalid JSON', () => {
    const result = importValidationRules('invalid json');
    expect(result).toBe(null);
  });
  
  test('should return null for invalid structure', () => {
    const invalidStructure = JSON.stringify({ invalid: 'structure' });
    const result = importValidationRules(invalidStructure);
    expect(result).toBe(null);
  });
});

describe('mergeValidationRules', () => {
  test('should merge custom rules with defaults', () => {
    const customRules = {
      version: '2.0.0',
      groups: {
        customGroup: { name: 'Custom' },
      },
    };
    
    const merged = mergeValidationRules(customRules);
    
    expect(merged.version).toBe('2.0.0');
    expect(merged.groups.customGroup).toBeDefined();
    expect(merged.groups.hulpmerker).toBeDefined(); // Default still exists
  });
  
  test('should override existing groups', () => {
    const customRules = {
      groups: {
        hulpmerker: { name: 'Modified Hulpmerker' },
      },
    };
    
    const merged = mergeValidationRules(customRules);
    
    expect(merged.groups.hulpmerker.name).toBe('Modified Hulpmerker');
  });
  
  test('should handle empty custom rules', () => {
    const merged = mergeValidationRules({});
    
    expect(merged.groups).toBeDefined();
    expect(merged.stepValidation).toBeDefined();
  });
});