import { describe, test, expect, beforeEach } from '@jest/globals';
import { AdvancedParser } from '../../src/AdvancedParser.js';

describe('AdvancedParser', () => {
  let parser;
  let syntaxRules;
  let validationRules;

  beforeEach(() => {
    syntaxRules = testUtils.createBasicSyntaxRules();
    validationRules = testUtils.createBasicValidationRules();
    parser = new AdvancedParser(syntaxRules, validationRules);
  });

  describe('Basic Parsing', () => {
    test('should parse simple step program', () => {
      const input = `RUHE: Initial state
- System ready

SCHRITT 1: First step
- Start condition`;

      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result).toHaveStep(0); // RUHE
      expect(result).toHaveStep(1); // SCHRITT 1
      expect(result.steps).toHaveLength(2);
    });

    test('should handle German keywords correctly', () => {
      const input = `RUHE: Anfangszustand
- System bereit

SCHRITT 1: Erster Schritt
- Startbedingung`;

      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result.steps[0].type).toBe('RUST');
      expect(result.steps[1].type).toBe('SCHRITT');
    });

    test('should parse multi-language keywords', () => {
      const input = `IDLE: Initial state
- System ready

STEP 1: First step
- Start condition`;

      const result = parser.parse(input);
      
      expect(result).toHaveValidSteps();
      expect(result.steps[0].type).toBe('RUST');
      expect(result.steps[1].type).toBe('SCHRITT');
    });
  });

  describe('Advanced Features', () => {
    test('should parse FB program headers', () => {
      const input = `Hauptprogramm Salzbad Steuerung FB300
Symbolik IDB: Salzbad_Steuerung

RUHE: Initial state`;

      const result = parser.parse(input);
      
      expect(result.functionBlock).toBe('FB300');
      expect(result.programName).toContain('Salzbad Steuerung');
    });

    test('should parse variable assignments', () => {
      const input = `Variable 1 (Aktive Einfuhrhorde) = 21
Variable 2 (Maximale Kapazität) = 100

RUHE: Initial state`;

      const result = parser.parse(input);
      
      expect(result.variables).toBeDefined();
      expect(result.variables).toHaveLength(2);
      expect(result.variables[0].name).toContain('Variable 1');
      expect(result.variables[0].value).toBe('21');
    });

    test('should parse complex matrix assignments', () => {
      const input = `Horde[Vorselektierte Horde 1e Befüllung].Etage_Daten[1].Status = 0

RUHE: Initial state`;

      const result = parser.parse(input);
      
      expect(result.variables).toBeDefined();
      expect(result.variables[0].type).toBe('matrix');
    });

    test('should parse cross-references correctly', () => {
      const input = `SCHRITT 1: First step
Horde vorselektiert (Selektionsprogramm Horde FB102 SCHRITT 2+5+8)`;

      const result = parser.parse(input);
      
      expect(result.steps[0].conditions).toBeDefined();
      expect(result.steps[0].conditions[0]).toContain('Selektionsprogramm Horde FB102');
    });
  });

  describe('OR Conditions and Complex Logic', () => {
    test('should parse OR conditions with brackets', () => {
      const input = `SCHRITT 1: Wait for release
[
  Freigabe Salzbad Tank A
  + Freigabe Salzbad Tank B  
  + Freigabe Salzbad Tank C
]`;

      const result = parser.parse(input);
      
      expect(result.steps[0].conditions).toBeDefined();
      expect(result.steps[0].orGroups).toBeDefined();
      expect(result.steps[0].orGroups).toHaveLength(1);
      expect(result.steps[0].orGroups[0]).toHaveLength(3);
    });

    test('should parse transition rules', () => {
      const input = `SCHRITT 1: First step
+ von SCHRITT 13
- Normal condition`;

      const result = parser.parse(input);
      
      expect(result.steps[0].transitions).toBeDefined();
      expect(result.steps[0].transitions).toContain('von SCHRITT 13');
    });

    test('should handle NICHT (NOT) conditions', () => {
      const input = `SCHRITT 1: Test step
NICHT Störung: Käse am Blockierung Tank A`;

      const result = parser.parse(input);
      
      expect(result.steps[0].conditions[0]).toContain('NICHT');
    });
  });

  describe('Comments and Descriptions', () => {
    test('should parse single line comments', () => {
      const input = `// Initialisierung der Käsezähler
RUHE: Initial state`;

      const result = parser.parse(input);
      
      expect(result.comments).toBeDefined();
      expect(result.comments[0]).toContain('Initialisierung der Käsezähler');
    });

    test('should parse inline comments', () => {
      const input = 'SCHRITT 1: First step // This is an inline comment';

      const result = parser.parse(input);
      
      expect(result.steps[0].description).toBe('First step');
      expect(result.steps[0].comment).toContain('This is an inline comment');
    });

    test('should parse description blocks', () => {
      const input = `Käsezähler Anfang T10B: Zählt die Käseeinheiten am Anfang

RUHE: Initial state`;

      const result = parser.parse(input);
      
      expect(result.descriptions).toBeDefined();
      expect(result.descriptions[0]).toContain('Käsezähler Anfang T10B');
    });
  });

  describe('Timer and Special Variables', () => {
    test('should parse timer conditions', () => {
      const input = `SCHRITT 1: Monitoring
Zeit 300sek ??
Temperatur < 25.0`;

      const result = parser.parse(input);
      
      expect(result.steps[0].conditions).toContain('Zeit 300sek ??');
      expect(result.steps[0].timers).toBeDefined();
      expect(result.steps[0].timers[0].duration).toBe('300sek');
    });

    test('should detect variable types correctly', () => {
      const input = `TIJD Timer1 = 10s
STORING Fault1 = Sensor Error
MARKER Flag1 = Active

RUHE: Initial state`;

      const result = parser.parse(input);
      
      expect(result.variables).toHaveLength(3);
      expect(result.variables.find(v => v.type === 'timer')).toBeDefined();
      expect(result.variables.find(v => v.type === 'storing')).toBeDefined();
      expect(result.variables.find(v => v.type === 'marker')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle empty input gracefully', () => {
      const result = parser.parse('');
      
      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    test('should handle malformed step syntax', () => {
      const input = `SCHRITT: Missing number
SCHRITT 999999: Too high number`;

      const result = parser.parse(input);
      
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle invalid variable assignments', () => {
      const input = `Invalid Variable = 
= Empty assignment

RUHE: Initial state`;

      const result = parser.parse(input);
      
      // Should still parse the RUHE step despite invalid variables
      expect(result).toHaveStep(0);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('Preprocessing Issues', () => {
    test('should handle HTML entities', () => {
      const input = `SCHRITT 1 &amp; NICHT RUHE
Condition &lt; 10
"Text with &quot;quotes&quot;"`;

      const result = parser.parse(input);
      
      expect(result.steps[0].conditions[0]).toContain('&');
      expect(result.steps[0].conditions[1]).toContain('<');
      expect(result.steps[0].conditions[2]).toContain('"quotes"');
    });

    test('should handle split assignments across lines', () => {
      const input = `Variable 1 (Aktive Einfuhrhorde) =
= 21
Variable 2 (Maximale Kapazität) =
= 100`;

      const result = parser.parse(input);
      
      expect(result.variables).toHaveLength(2);
      expect(result.variables[0].value).toBe('21');
      expect(result.variables[1].value).toBe('100');
    });

    test('should handle transition rules split across lines', () => {
      const input = `SCHRITT 1: Start process
+ von
SCHRITT 13`;

      const result = parser.parse(input);
      
      expect(result.steps[0].transitions).toBeDefined();
      expect(result.steps[0].transitions[0]).toContain('von SCHRITT 13');
    });
  });
});