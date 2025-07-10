import { describe, test, expect } from '@jest/globals';
import { defaultSyntaxRules } from '../../src/config/syntaxRules.js';

describe('syntaxRules Configuration', () => {
  describe('defaultSyntaxRules structure', () => {
    test('should have all required top-level properties', () => {
      expect(defaultSyntaxRules).toHaveProperty('stepKeywords');
      expect(defaultSyntaxRules).toHaveProperty('variableDetection');
      expect(defaultSyntaxRules).toHaveProperty('conditions');
      expect(defaultSyntaxRules).toHaveProperty('format');
      expect(defaultSyntaxRules).toHaveProperty('stepPatterns');
      expect(defaultSyntaxRules).toHaveProperty('conditionPatterns');
      expect(defaultSyntaxRules).toHaveProperty('variablePatterns');
    });
  });
  
  describe('stepKeywords', () => {
    test('should contain multilingual step keywords', () => {
      expect(defaultSyntaxRules.stepKeywords.step).toEqual(['STAP', 'SCHRITT', 'STEP']);
      expect(defaultSyntaxRules.stepKeywords.rest).toEqual(['RUST', 'RUHE', 'IDLE']);
      expect(defaultSyntaxRules.stepKeywords.end).toEqual(['KLAAR', 'FERTIG', 'END']);
    });
    
    test('should have arrays for all keyword types', () => {
      expect(Array.isArray(defaultSyntaxRules.stepKeywords.step)).toBe(true);
      expect(Array.isArray(defaultSyntaxRules.stepKeywords.rest)).toBe(true);
      expect(Array.isArray(defaultSyntaxRules.stepKeywords.end)).toBe(true);
    });
  });
  
  describe('variableDetection', () => {
    test('should contain multilingual variable keywords', () => {
      expect(defaultSyntaxRules.variableDetection.timerKeywords).toEqual(['TIJD', 'TIME', 'ZEIT']);
      expect(defaultSyntaxRules.variableDetection.markerKeywords).toEqual(['MARKER', 'FLAG', 'MERKER']);
      expect(defaultSyntaxRules.variableDetection.storingKeywords).toEqual(['STORING', 'FAULT', 'STÖRUNG']);
    });
  });
  
  describe('conditions', () => {
    test('should have correct condition prefixes', () => {
      expect(defaultSyntaxRules.conditions.orPrefix).toBe('+');
      expect(defaultSyntaxRules.conditions.notPrefix).toEqual(['NIET', 'NICHT', 'NOT']);
      expect(defaultSyntaxRules.conditions.transitionPrefix).toBe('->');
    });
  });
  
  describe('format', () => {
    test('should have format rules', () => {
      expect(defaultSyntaxRules.format.requireColon).toBe(true);
      expect(defaultSyntaxRules.format.allowSpaces).toBe(true);
    });
  });
  
  describe('stepPatterns', () => {
    test('should have at least one step pattern', () => {
      expect(defaultSyntaxRules.stepPatterns).toBeInstanceOf(Array);
      expect(defaultSyntaxRules.stepPatterns.length).toBeGreaterThan(0);
    });
    
    test('each step pattern should have required properties', () => {
      defaultSyntaxRules.stepPatterns.forEach(pattern => {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('examples');
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.confidence).toBe('number');
        expect(Array.isArray(pattern.examples)).toBe(true);
      });
    });
    
    test('step patterns should match their examples', () => {
      const pattern1 = defaultSyntaxRules.stepPatterns[0];
      expect(pattern1.pattern.test('STAP 1: Description')).toBe(true);
      expect(pattern1.pattern.test('SCHRITT 25: Another description')).toBe(true);
      
      const pattern2 = defaultSyntaxRules.stepPatterns[1];
      const example = pattern2.examples[0];
      expect(pattern2.pattern.test(example)).toBe(true);
    });
    
    test('FB-referenced step pattern should match examples', () => {
      const fbPattern = defaultSyntaxRules.stepPatterns.find(p => 
        p.description.includes('FB-referenced'),
      );
      
      expect(fbPattern).toBeDefined();
      fbPattern.examples.forEach(example => {
        expect(fbPattern.pattern.test(example)).toBe(true);
      });
    });
    
    test('enhanced FB-reference pattern should match complex examples', () => {
      const enhancedPattern = defaultSyntaxRules.stepPatterns.find(p => 
        p.description.includes('Enhanced FB-reference'),
      );
      
      expect(enhancedPattern).toBeDefined();
      expect(enhancedPattern.pattern.test('3.2.1\tN10: Blockierung Einfuhrrinne FB130\t27')).toBe(true);
      expect(enhancedPattern.pattern.test('3.2.3\tT10: Füllen Horde  FB134\t29')).toBe(true);
    });
  });
  
  describe('conditionPatterns', () => {
    test('should have cross-reference pattern', () => {
      expect(defaultSyntaxRules.conditionPatterns).toBeInstanceOf(Array);
      const crossRefPattern = defaultSyntaxRules.conditionPatterns.find(p => 
        p.type === 'cross_reference',
      );
      
      expect(crossRefPattern).toBeDefined();
      expect(crossRefPattern.pattern).toBeInstanceOf(RegExp);
      expect(crossRefPattern.confidence).toBe(0.9);
    });
    
    test('cross-reference pattern should match parenthetical references', () => {
      const crossRefPattern = defaultSyntaxRules.conditionPatterns[0];
      
      expect(crossRefPattern.pattern.test('(Program SCHRITT 5)')).toBe(true);
      expect(crossRefPattern.pattern.test('(Test STEP 10)')).toBe(true);
      expect(crossRefPattern.pattern.test('(Another STAP 3+5+8)')).toBe(true);
    });
  });
  
  describe('variablePatterns', () => {
    test('should have at least one variable pattern', () => {
      expect(defaultSyntaxRules.variablePatterns).toBeInstanceOf(Array);
      expect(defaultSyntaxRules.variablePatterns.length).toBeGreaterThan(0);
    });
    
    test('each variable pattern should have required properties', () => {
      defaultSyntaxRules.variablePatterns.forEach(pattern => {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('group');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('description');
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(pattern.group).toBe('hulpmerker');
      });
    });
    
    test('basic variable assignment pattern should match', () => {
      const basicPattern = defaultSyntaxRules.variablePatterns[0];
      
      expect(basicPattern.pattern.test('Variable Name =')).toBe(true);
      expect(basicPattern.pattern.test('Some_Variable =')).toBe(true);
      expect(basicPattern.pattern.test('Test Variable with Spaces =')).toBe(true);
    });
    
    test('control variable pattern should match specific keywords', () => {
      const controlPattern = defaultSyntaxRules.variablePatterns.find(p => 
        p.description.includes('control variable'),
      );
      
      expect(controlPattern).toBeDefined();
      expect(controlPattern.pattern.test('Freigabe Tank A =')).toBe(true);
      expect(controlPattern.pattern.test('Start Process =')).toBe(true);
      expect(controlPattern.pattern.test('Aktuell Status =')).toBe(true);
      expect(controlPattern.pattern.test('Aktuelle Position =')).toBe(true);
    });
    
    test('process control variable pattern should match', () => {
      const processPattern = defaultSyntaxRules.variablePatterns.find(p => 
        p.description.includes('process control variable'),
      );
      
      expect(processPattern).toBeDefined();
      expect(processPattern.pattern.test('Einfuhr Tank =')).toBe(true);
      expect(processPattern.pattern.test('Ausfuhr Process =')).toBe(true);
      expect(processPattern.pattern.test('Füllen Container =')).toBe(true);
      expect(processPattern.pattern.test('Entleeren Tank =')).toBe(true);
      expect(processPattern.pattern.test('Umschwimmen Active =')).toBe(true);
      expect(processPattern.pattern.test('Freigabe System =')).toBe(true);
    });
  });
  
  describe('Pattern matching real-world examples', () => {
    test('should match various step formats', () => {
      const testCases = [
        { input: 'STAP 1: Initialize', expected: true },
        { input: 'SCHRITT 99: Complex step', expected: true },
        { input: 'STEP 42: English step', expected: true },
        { input: '3.1\tA01: Process FB100\t5', expected: true },
        { input: 'INVALID STEP', expected: false },
      ];
      
      testCases.forEach(({ input, expected }) => {
        const matched = defaultSyntaxRules.stepPatterns.some(p => 
          p.pattern.test(input),
        );
        expect(matched).toBe(expected);
      });
    });
    
    test('should match various variable formats', () => {
      const testCases = [
        { input: 'Simple Variable =', expected: true },
        { input: 'Freigabe Tank A =', expected: true },
        { input: 'Einfuhr Process =', expected: true },
        { input: 'No equals sign', expected: false },
        { input: '= Invalid start', expected: false },
      ];
      
      testCases.forEach(({ input, expected }) => {
        const matched = defaultSyntaxRules.variablePatterns.some(p => 
          p.pattern.test(input),
        );
        expect(matched).toBe(expected);
      });
    });
  });
  
  describe('Confidence values', () => {
    test('all patterns should have confidence between 0 and 1', () => {
      const allPatterns = [
        ...defaultSyntaxRules.stepPatterns,
        ...defaultSyntaxRules.conditionPatterns,
        ...defaultSyntaxRules.variablePatterns,
      ];
      
      allPatterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });
    
    test('auto-learned patterns should have appropriate confidence', () => {
      const autoLearnedPatterns = [
        ...defaultSyntaxRules.stepPatterns,
        ...defaultSyntaxRules.variablePatterns,
      ].filter(p => p.description.includes('Auto-learned'));
      
      expect(autoLearnedPatterns.length).toBeGreaterThan(0);
      autoLearnedPatterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });
  });
});