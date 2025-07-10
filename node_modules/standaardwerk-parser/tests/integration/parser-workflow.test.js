import { describe, test, expect, beforeEach } from '@jest/globals';
import { AdvancedParser } from '../../src/AdvancedParser.js';
import { FlexibleParser } from '../../src/FlexibleParser.js';
import { ContentPreprocessor } from '../../src/ContentPreprocessor.js';

describe('Parser Workflow Integration', () => {
  let advancedParser;
  let flexibleParser;
  let preprocessor;

  beforeEach(() => {
    const syntaxRules = testUtils.createBasicSyntaxRules();
    const validationRules = testUtils.createBasicValidationRules();
    
    advancedParser = new AdvancedParser(syntaxRules, validationRules);
    flexibleParser = new FlexibleParser(syntaxRules, validationRules);
    preprocessor = new ContentPreprocessor();
  });

  describe('Complete Parsing Workflow', () => {
    test('should process complex industrial program end-to-end', () => {
      const rawInput = `Hauptprogramm Käseproduktion FB300
Symbolik IDB: Kaese_Produktion

// Initialisierung der Variablen
Variable 1 (Aktive Produktionslinie) =
= 1
Variable 2 (Maximale Kapazität) =
= 500

RUHE: Produktionssystem bereit
- Alle Sensoren OK
- Sicherheitssysteme aktiv
- Temperatur im Normalbereich

SCHRITT 1: Produktionsstart
- Freigabe Produktion
- Rohstoffe verfügbar
- Qualitätskontrolle OK

SCHRITT 2: Käseherstellung
Zeit 1800sek ??
- Temperatur &gt;= 32°C
- Druck &lt;= 2.5 bar
- NICHT Störung: Überlauf Tank A

SCHRITT 3: Qualitätskontrolle
[
  Qualität Charge A &amp; pH-Wert OK
  + Qualität Charge B &amp; pH-Wert OK
  + Qualität Charge C &amp; pH-Wert OK
]

+ von
SCHRITT 10
- Produktionsende erforderlich`;

      // Step 1: Preprocess
      const preprocessedInput = preprocessor.preprocess(rawInput);
      
      // Step 2: Parse with AdvancedParser
      const advancedResult = advancedParser.parse(preprocessedInput);
      
      // Step 3: Parse with FlexibleParser for comparison
      const flexibleResult = flexibleParser.parse(preprocessedInput);

      // Verify preprocessing worked
      expect(preprocessedInput).toContain('Variable 1 (Aktive Produktionslinie) = 1');
      expect(preprocessedInput).toContain('Variable 2 (Maximale Kapazität) = 500');
      expect(preprocessedInput).toContain('+ von SCHRITT 10');
      expect(preprocessedInput).toContain('Temperatur >= 32°C');
      expect(preprocessedInput).toContain('Druck <= 2.5 bar');
      expect(preprocessedInput).toContain('Qualität Charge A & pH-Wert OK');

      // Verify both parsers produced valid results
      expect(advancedResult).toHaveValidSteps();
      expect(flexibleResult).toHaveValidSteps();
      
      // Verify program structure
      expect(advancedResult.functionBlock).toBe('FB300');
      expect(advancedResult.programName).toContain('Käseproduktion');
      
      // Verify steps
      expect(advancedResult.steps).toHaveLength(4); // RUHE + 3 SCHRITT
      expect(advancedResult.steps[0].type).toBe('RUST');
      expect(advancedResult.steps[1].number).toBe(1);
      expect(advancedResult.steps[2].number).toBe(2);
      expect(advancedResult.steps[3].number).toBe(3);
      
      // Verify variables
      expect(advancedResult.variables).toHaveLength(2);
      expect(advancedResult.variables[0].value).toBe('1');
      expect(advancedResult.variables[1].value).toBe('500');
      
      // Verify timer detection
      expect(advancedResult.steps[2].timers).toBeDefined();
      expect(advancedResult.steps[2].timers[0].duration).toBe('1800sek');
      
      // Verify OR group parsing
      expect(advancedResult.steps[3].orGroups).toBeDefined();
      expect(advancedResult.steps[3].orGroups[0]).toHaveLength(3);
      
      // Verify transition rules
      expect(advancedResult.steps[3].transitions).toBeDefined();
      expect(advancedResult.steps[3].transitions[0]).toContain('von SCHRITT 10');
    });

    test('should handle real-world DOCX-like content', () => {
      const docxStyleInput = `3.1	O0W: Hauptprogramm Kraan FB300	9

// Variabelen declaraties
Stap: Array[0..31] of Bool	// Stappenbits
Hulp: Array[1..32] of Bool	// Hulpbits
Tijd: Array[1..10] of Time	// Timers

RUST: Kraan in rustpositie
- Alle sensoren gecontroleerd
- Veiligheidssysteem actief

STAP 1: Kraan naar positie A
- Startcommando ontvangen
- Positie A vrij
- NIET Storing: Kraan geblokkeerd

STAP 2: Wachten op lading
Tijd[1] = 30s
- Lading gedetecteerd
- Gewicht binnen grenzen

STAP 3: Transport naar positie B
[
  Positie B vrij
  + Noodstop NIET actief
  + Handmatige override
]`;

      const preprocessedInput = preprocessor.preprocess(docxStyleInput);
      const result = advancedParser.parse(preprocessedInput);

      expect(result).toHaveValidSteps();
      expect(result.functionBlock).toBe('FB300');
      expect(result.programName).toContain('Hoofdprogramma Kraan');
      
      // Should handle Dutch keywords
      expect(result.steps[0].type).toBe('RUST');
      expect(result.steps[1].type).toBe('SCHRITT'); // Normalized to SCHRITT
      expect(result.steps[2].type).toBe('SCHRITT');
      expect(result.steps[3].type).toBe('SCHRITT');
      
      // Should parse array variable declarations
      expect(result.variables).toBeDefined();
      expect(result.variables.some(v => v.name.includes('Stap'))).toBe(true);
      expect(result.variables.some(v => v.name.includes('Hulp'))).toBe(true);
      expect(result.variables.some(v => v.name.includes('Tijd'))).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    test('should gracefully handle corrupted input', () => {
      const corruptedInput = `Hauptprogramm\x00Corrupted\x01FB300

RUHE: \x02Invalid\x03characters
- Normal condition

SCHRITT: Missing number
- Should still parse somehow

SCHRITT 1: Valid step
- Valid condition`;

      const preprocessedInput = preprocessor.preprocess(corruptedInput);
      const result = flexibleParser.parse(preprocessedInput);

      // Should still extract valid parts
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should find the valid step
      expect(result.steps.some(s => s.number === 1)).toBe(true);
    });

    test('should provide comprehensive error reporting', () => {
      const problematicInput = `Invalid program structure
SCHRITT 999: Number too high
SCHRITT 1: Valid step
SCHRITT 1: Duplicate number
SCHRITT 2: Another valid step`;

      const result = flexibleParser.parse(problematicInput);

      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.suggestions).toBeDefined();
      
      // Should still parse valid steps
      expect(result.steps.length).toBeGreaterThan(0);
      
      // Should provide helpful error information
      expect(result.errors.some(e => e.type === 'duplicate_step')).toBe(true);
      expect(result.errors.some(e => e.type === 'invalid_step_number')).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    test('should handle large programs efficiently', () => {
      // Create a large program with many steps
      const largeProgram = ['Hauptprogramm Large FB999', '', 'RUHE: Initial state', '- System ready', ''];
      
      for (let i = 1; i <= 100; i++) {
        largeProgram.push(`SCHRITT ${i}: Step ${i}`);
        largeProgram.push(`- Condition ${i}A`);
        largeProgram.push(`- Condition ${i}B`);
        largeProgram.push(`Zeit ${i * 10}sek ??`);
        largeProgram.push('');
      }
      
      const largeInput = largeProgram.join('\n');
      
      const startTime = Date.now();
      const preprocessedInput = preprocessor.preprocess(largeInput);
      const result = advancedParser.parse(preprocessedInput);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(result.steps).toHaveLength(101); // 1 RUHE + 100 SCHRITT
      expect(result.steps.filter(s => s.timers && s.timers.length > 0)).toHaveLength(100);
    });

    test('should maintain memory efficiency during processing', () => {
      const beforeMemory = process.memoryUsage().heapUsed;
      
      const mediumProgram = testUtils.createSampleProgram(50);
      const preprocessedInput = preprocessor.preprocess(mediumProgram);
      const result = advancedParser.parse(preprocessedInput);
      
      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - beforeMemory;
      
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
      expect(result.steps).toHaveLength(51);
    });
  });

  describe('Cross-Parser Compatibility', () => {
    test('should produce consistent results across parsers', () => {
      const input = testUtils.createSampleProgram(10);
      
      const advancedResult = advancedParser.parse(input);
      const flexibleResult = flexibleParser.parse(input);

      // Both should parse the same number of steps
      expect(advancedResult.steps.length).toBe(flexibleResult.steps.length);
      
      // Step types should match
      for (let i = 0; i < advancedResult.steps.length; i++) {
        expect(advancedResult.steps[i].type).toBe(flexibleResult.steps[i].type);
        expect(advancedResult.steps[i].number).toBe(flexibleResult.steps[i].number);
      }
    });

    test('should handle different validation levels appropriately', () => {
      const strictInput = `RUHE: Perfect format
- All conditions met

SCHRITT 1: Perfect step
- Perfect condition`;

      const lenientInput = `RUHE: Relaxed format
- Conditions might be missing

SCHRITT: Number missing but parseable
- Condition exists`;

      const strictResult = advancedParser.parse(strictInput);
      const lenientResult = flexibleParser.parse(lenientInput);

      // Strict parser should handle perfect input well
      expect(strictResult.errors.length).toBe(0);
      expect(strictResult.steps).toHaveLength(2);
      
      // Flexible parser should handle imperfect input
      expect(lenientResult.steps.length).toBeGreaterThan(0);
      expect(lenientResult.warnings.length).toBeGreaterThan(0);
    });
  });
});