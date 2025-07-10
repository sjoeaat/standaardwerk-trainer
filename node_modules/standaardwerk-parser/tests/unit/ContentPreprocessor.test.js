import { describe, test, expect, beforeEach } from '@jest/globals';
import { ContentPreprocessor } from '../../src/ContentPreprocessor.js';

describe('ContentPreprocessor', () => {
  let preprocessor;

  beforeEach(() => {
    preprocessor = new ContentPreprocessor();
  });

  describe('HTML Entity Decoding', () => {
    test('should decode common HTML entities', () => {
      const input = 'SCHRITT 1 &amp; NICHT RUHE\nCondition &lt; 10\n"Text with &quot;quotes&quot;"';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('SCHRITT 1 & NICHT RUHE');
      expect(result).toContain('Condition < 10');
      expect(result).toContain('"Text with "quotes""');
    });

    test('should handle numeric HTML entities', () => {
      const input = 'Temperature &#62; 25&#176;C';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('Temperature > 25°C');
    });

    test('should preserve valid HTML in context', () => {
      const input = 'Valid &amp; necessary encoding';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('Valid & necessary encoding');
    });
  });

  describe('Line Break Normalization', () => {
    test('should handle Windows line breaks', () => {
      const input = 'Line 1\r\nLine 2\r\nLine 3';
      const result = preprocessor.preprocess(input);
      
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should handle Mac line breaks', () => {
      const input = 'Line 1\rLine 2\rLine 3';
      const result = preprocessor.preprocess(input);
      
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should preserve Unix line breaks', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = preprocessor.preprocess(input);
      
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Variable Assignment Fixing', () => {
    test('should fix split assignments', () => {
      const input = `Variable 1 (Description) =
= 21
Variable 2 (Another) =
= 100`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('Variable 1 (Description) = 21');
      expect(result).toContain('Variable 2 (Another) = 100');
    });

    test('should handle multiple line breaks in assignments', () => {
      const input = `Variable 1 =


= 42`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('Variable 1 = 42');
    });

    test('should preserve valid multi-line assignments', () => {
      const input = `Variable 1 = complex expression
that spans multiple lines
but is valid`;
      
      const result = preprocessor.preprocess(input);
      
      // Should not modify valid multi-line content
      expect(result).toContain('Variable 1 = complex expression');
      expect(result).toContain('that spans multiple lines');
    });
  });

  describe('Transition Rule Reconstruction', () => {
    test('should fix split transition rules', () => {
      const input = `SCHRITT 1: Start
+ von
SCHRITT 13
- Normal condition`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('+ von SCHRITT 13');
    });

    test('should handle multiple split transitions', () => {
      const input = `SCHRITT 1: Start
+ von
SCHRITT 5
+ nach
SCHRITT 10`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('+ von SCHRITT 5');
      expect(result).toContain('+ nach SCHRITT 10');
    });

    test('should preserve correctly formatted transitions', () => {
      const input = `SCHRITT 1: Start
+ von SCHRITT 5
- Normal condition`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('+ von SCHRITT 5');
      expect(result).toContain('- Normal condition');
    });
  });

  describe('Whitespace Normalization', () => {
    test('should normalize excessive whitespace', () => {
      const input = `SCHRITT  1:    First   step
-     Condition    with   spaces`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('SCHRITT 1: First step');
      expect(result).toContain('- Condition with spaces');
    });

    test('should preserve meaningful indentation', () => {
      const input = `SCHRITT 1: Parent step
    - Indented condition
        - Deeply indented subcondition`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('    - Indented condition');
      expect(result).toContain('        - Deeply indented subcondition');
    });

    test('should remove trailing whitespace', () => {
      const input = 'SCHRITT 1: Step with trailing spaces   \n- Condition   ';
      const result = preprocessor.preprocess(input);
      
      expect(result).toBe('SCHRITT 1: Step with trailing spaces\n- Condition');
    });
  });

  describe('Tab Handling', () => {
    test('should convert tabs to spaces consistently', () => {
      const input = 'SCHRITT\t1:\tFirst\tstep\n-\tCondition\twith\ttabs';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('SCHRITT 1: First step');
      expect(result).toContain('- Condition with tabs');
    });

    test('should preserve structural tabs', () => {
      const input = 'SCHRITT 1: Main step\n\t- Indented condition\n\t\t- Sub-condition';
      const result = preprocessor.preprocess(input);
      
      // Should preserve meaningful indentation structure
      expect(result).toContain('- Indented condition');
      expect(result).toContain('- Sub-condition');
    });
  });

  describe('Comment Preservation', () => {
    test('should preserve single-line comments', () => {
      const input = `// This is a comment
SCHRITT 1: Step // Inline comment`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('// This is a comment');
      expect(result).toContain('// Inline comment');
    });

    test('should preserve multi-line comments', () => {
      const input = `/* Multi-line
comment block */
SCHRITT 1: Step`;
      
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('/* Multi-line');
      expect(result).toContain('comment block */');
    });
  });

  describe('Special Character Handling', () => {
    test('should handle German umlauts correctly', () => {
      const input = 'SCHRITT 1: Überwachung der Käseproduktion\n- Prüfen der Qualität';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('Überwachung der Käseproduktion');
      expect(result).toContain('Prüfen der Qualität');
    });

    test('should handle special industrial symbols', () => {
      const input = 'Temperature ≥ 25°C\nPressure ≤ 2.5 bar';
      const result = preprocessor.preprocess(input);
      
      expect(result).toContain('Temperature ≥ 25°C');
      expect(result).toContain('Pressure ≤ 2.5 bar');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty input gracefully', () => {
      const result = preprocessor.preprocess('');
      
      expect(result).toBe('');
    });

    test('should handle null/undefined input', () => {
      expect(preprocessor.preprocess(null)).toBe('');
      expect(preprocessor.preprocess(undefined)).toBe('');
    });

    test('should handle malformed content', () => {
      const input = 'Invalid\x00null\x01characters\x02here';
      const result = preprocessor.preprocess(input);
      
      // Should remove or handle control characters
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x01');
      expect(result).not.toContain('\x02');
    });
  });

  describe('Performance', () => {
    test('should handle large content efficiently', () => {
      const largeInput = testUtils.createSampleProgram(1000);
      const startTime = Date.now();
      
      const result = preprocessor.preprocess(largeInput);
      
      const processTime = Date.now() - startTime;
      expect(processTime).toBeLessThan(500); // Should process in under 500ms
      expect(result.length).toBeGreaterThan(0);
    });

    test('should maintain memory efficiency', () => {
      const largeInput = 'A'.repeat(100000); // 100KB string
      
      const beforeMemory = process.memoryUsage().heapUsed;
      const result = preprocessor.preprocess(largeInput);
      const afterMemory = process.memoryUsage().heapUsed;
      
      const memoryIncrease = afterMemory - beforeMemory;
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
      expect(result).toBeDefined();
    });
  });
});