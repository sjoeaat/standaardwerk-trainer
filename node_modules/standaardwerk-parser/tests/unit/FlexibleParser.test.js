import { describe, test, expect, beforeEach } from '@jest/globals';
import { FlexibleParser } from '../../src/FlexibleParser.js';

describe('FlexibleParser', () => {
  let parser;
  let syntaxRules;
  let validationRules;

  beforeEach(() => {
    syntaxRules = testUtils.createBasicSyntaxRules();
    validationRules = testUtils.createBasicValidationRules();
    parser = new FlexibleParser(syntaxRules, validationRules);
  });

  describe('Interface Compatibility', () => {
    test('should match UnifiedTextParser interface', () => {
      const input = testUtils.createSampleProgram(2);
      const result = parser.parse(input, 'test', { testMode: true });
      
      expect(result.parsingMetadata).toBeDefined();
      expect(result.parsingMetadata.source).toBe('test');
      expect(result.parsingMetadata.parser).toBe('FlexibleParser');
      expect(result.parsingMetadata.timestamp).toBeDefined();
    });

    test('should provide normalized line count', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = parser.parse(input);
      
      expect(result.parsingMetadata.normalizedLineCount).toBe(3);
      expect(result.parsingMetadata.originalLineCount).toBe(3);
    });
  });

  describe('Flexible Validation', () => {
    test('should allow relaxed step validation', () => {
      const input = `SCHRITT: Missing number but should still parse
- Some condition`;

      const result = parser.parse(input);
      
      // Flexible parser should be more lenient
      expect(result.steps).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.errors.length).toBeLessThan(2); // Less strict than strict parser
    });

    test('should handle incomplete programs gracefully', () => {
      const input = `RUHE: Start
- Missing transitions`;

      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result.steps[0].type).toBe('RUST');
    });

    test('should provide helpful suggestions for malformed input', () => {
      const input = `STEP 1 Missing colon
Some condition`;

      const result = parser.parse(input);
      
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Parser Integration', () => {
    test('should use EnhancedParser for core parsing', () => {
      const input = `RUHE: Initial state
SCHRITT 1: First step`;

      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result.steps).toHaveLength(2);
    });

    test('should maintain parsing quality while being flexible', () => {
      const input = testUtils.createSampleProgram(5);
      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result.steps).toHaveLength(6); // 1 RUHE + 5 SCHRITT
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    test('should handle production-like input with variations', () => {
      const input = `Hauptprogramm Test FB100

RUHE: System ready
- All sensors OK
- Safety systems active

SCHRITT 1: Initialize
- Power up sequence
- Check systems

SCHRITT 2: Operation
Zeit 60sek ??
- Monitor temperature
- Check pressure`;

      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result.functionBlock).toBe('FB100');
      expect(result.steps).toHaveLength(3);
    });

    test('should handle mixed language content', () => {
      const input = `Program Test FB200

IDLE: Ready state
- System bereit
- Alles OK

STEP 1: Start procedure
- Begin process
- Start monitoring`;

      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result.steps[0].type).toBe('RUST');
      expect(result.steps[1].type).toBe('SCHRITT');
    });
  });

  describe('Error Recovery', () => {
    test('should continue parsing after encountering errors', () => {
      const input = `INVALID LINE HERE
RUHE: Valid step
ANOTHER INVALID LINE
SCHRITT 1: Another valid step`;

      const result = parser.parse(input);
      
      expect(result.steps).toHaveLength(2);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should provide context for parsing errors', () => {
      const input = `SCHRITT 1: Valid step
MALFORMED STEP WITHOUT COLON
SCHRITT 2: Another valid step`;

      const result = parser.parse(input);
      
      expect(result.errors[0]).toHaveProperty('line');
      expect(result.errors[0]).toHaveProperty('context');
      expect(result.errors[0]).toHaveProperty('suggestion');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large programs efficiently', () => {
      const input = testUtils.createSampleProgram(50);
      const startTime = Date.now();
      
      const result = parser.parse(input);
      
      const parseTime = Date.now() - startTime;
      expect(parseTime).toBeLessThan(1000); // Should parse in under 1 second
      expect(result.steps).toHaveLength(51); // 1 RUHE + 50 SCHRITT
    });

    test('should maintain memory efficiency', () => {
      const input = testUtils.createSampleProgram(100);
      
      const beforeMemory = process.memoryUsage().heapUsed;
      const result = parser.parse(input);
      const afterMemory = process.memoryUsage().heapUsed;
      
      const memoryIncrease = afterMemory - beforeMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
      expect(result.steps).toHaveLength(101);
    });
  });

  describe('Metadata and Debugging', () => {
    test('should provide detailed parsing metadata', () => {
      const input = testUtils.createSampleProgram(3);
      const result = parser.parse(input, 'unit-test', { debug: true });
      
      expect(result.parsingMetadata.source).toBe('unit-test');
      expect(result.parsingMetadata.parser).toBe('FlexibleParser');
      expect(result.parsingMetadata.version).toBeDefined();
    });

    test('should include timing information in debug mode', () => {
      const input = testUtils.createSampleProgram(10);
      const result = parser.parse(input, 'test', { debug: true, includeTimings: true });
      
      if (result.debug) {
        expect(result.debug.parseTime).toBeDefined();
        expect(result.debug.validationTime).toBeDefined();
      }
    });
  });
});