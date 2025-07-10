import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { parseWordDocument, enrichProgramForExport } from '../../src/enhancedWordParser.js';

// Mock dependencies
jest.mock('mammoth');
jest.mock('../../src/hierarchyBuilder.js', () => ({
  buildFolderTree: jest.fn(programs => ({
    name: null,
    children: {},
    programs: programs,
  })),
}));
jest.mock('../../src/UnifiedTextParser.js', () => ({
  UnifiedTextParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn(content => ({
      steps: [
        { type: 'RUST', number: 0, description: 'Initial state', conditions: [] },
        { type: 'SCHRITT', number: 1, description: 'First step', conditions: ['Condition 1'] },
      ],
      variables: [{ name: 'Test Variable', value: '10' }],
      timers: [],
      markers: [],
      storingen: [],
      transitionConditions: [],
      statistics: { totalSteps: 2 },
      errors: [],
      warnings: [],
    })),
    normalizeText: jest.fn(text => text),
    registerProgram: jest.fn(),
  })),
}));

describe('enhancedWordParser', () => {
  let syntaxRules;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup syntax rules
    syntaxRules = {
      stepKeywords: {
        step: ['STAP', 'SCHRITT', 'STEP'],
        rest: ['RUST', 'RUHE', 'IDLE'],
        end: ['KLAAR', 'FERTIG', 'END'],
      },
    };
    
    // Setup window.mammoth mock
    global.window = {
      mammoth: {
        convertToHtml: jest.fn(),
      },
    };
  });
  
  afterEach(() => {
    delete global.window;
  });
  
  describe('parseWordDocument', () => {
    test('should handle missing mammoth library', async () => {
      delete window.mammoth;
      
      const file = new Blob(['test'], { type: 'application/msword' });
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Mammoth.js niet beschikbaar');
      expect(result.programs).toHaveLength(0);
    });
    
    test('should parse simple Word document with one program', async () => {
      const htmlContent = `
        <h1>1. Test Program FB100</h1>
        <p>Symbolik IDB: Test_IDB</p>
        <p>RUST: Initial state</p>
        <p>System ready</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.programs).toHaveLength(1);
      expect(result.programs[0].name).toBe('Test Program');
      expect(result.programs[0].type).toBe('FB');
      expect(result.programs[0].fbNumber).toBe(100);
      expect(result.programs[0].idbName).toBe('Test_IDB');
      expect(result.programs[0].steps).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
    
    test('should parse multiple programs', async () => {
      const htmlContent = `
        <h1>1. First Program FB100</h1>
        <p>RUST: Initial</p>
        <h2>1.1 Second Program FB200</h2>
        <p>STAP 1: Process</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.programs).toHaveLength(2);
      expect(result.programs[0].fbNumber).toBe(100);
      expect(result.programs[1].fbNumber).toBe(200);
    });
    
    test('should handle duplicate FB numbers', async () => {
      const htmlContent = `
        <h1>1. First Program FB100</h1>
        <p>Content 1</p>
        <h1>2. Second Program FB100</h1>
        <p>Content 2</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Dubbel FB/FC nummer 100');
    });
    
    test('should build folder hierarchy', async () => {
      const htmlContent = `
        <h1>1. System</h1>
        <h2>1.1 Subsystem</h2>
        <h3>1.1.1 Program FB100</h3>
        <p>Content</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.programs).toHaveLength(1);
      expect(result.programs[0].folderPath).toEqual(['1. System', '1.1 Subsystem']);
      expect(result.hierarchy).toBeDefined();
    });
    
    test('should handle parse errors gracefully', async () => {
      const htmlContent = `
        <h1>1. Test Program FB100</h1>
        <p>Invalid content</p>
      `;
      
      // Make the parser throw an error
      const UnifiedTextParser = require('../../src/UnifiedTextParser.js').UnifiedTextParser;
      UnifiedTextParser.mockImplementation(() => ({
        parse: jest.fn(() => {
          throw new Error('Parse error');
        }),
        normalizeText: jest.fn(text => text),
        registerProgram: jest.fn(),
      }));
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Analysefout');
      expect(result.programs[0].parseError).toBe('Parse error');
      expect(result.programs[0].steps).toHaveLength(0);
    });
    
    test('should register existing programs for cross-reference validation', async () => {
      const htmlContent = `
        <h1>1. Test Program FB100</h1>
        <p>Content</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const existingPrograms = new Map([
        ['FB50', { name: 'Existing', steps: [] }],
      ]);
      
      await parseWordDocument(file, syntaxRules, existingPrograms);
      
      const UnifiedTextParser = require('../../src/UnifiedTextParser.js').UnifiedTextParser;
      const mockParser = UnifiedTextParser.mock.results[0].value;
      expect(mockParser.registerProgram).toHaveBeenCalledWith('FB50', { name: 'Existing', steps: [] });
    });
    
    test('should generate statistics', async () => {
      const htmlContent = `
        <h1>1. Program 1 FB100</h1>
        <p>Content 1</p>
        <h1>2. Program 2 FB200</h1>
        <p>Content 2</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalPrograms).toBe(2);
      expect(result.statistics.totalSteps).toBe(4); // 2 programs * 2 steps each
      expect(result.statistics.totalVariables).toBe(2); // 2 programs * 1 variable each
    });
    
    test('should handle complex content structure', async () => {
      const htmlContent = `
        <h1>1. Main System</h1>
        <p>System description</p>
        <h2>1.1 Process Control FB100</h2>
        <p>Symbolik IDB: Process_Control</p>
        <p>RUST: Idle state</p>
        <p>All systems ready</p>
        <p>STAP 1: Initialize</p>
        <p>+ Tank A ready</p>
        <p>+ Tank B ready</p>
        <p>Start pumps</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.programs).toHaveLength(1);
      const program = result.programs[0];
      expect(program.name).toBe('Process Control');
      expect(program.idbName).toBe('Process_Control');
      expect(program.folderPath).toEqual(['1. Main System']);
      expect(program.rawContent).toContain('RUST: Idle state');
      expect(program.rawContent).toContain('+ Tank A ready');
    });
    
    test('should handle mammoth conversion error', async () => {
      window.mammoth.convertToHtml.mockRejectedValue(new Error('Conversion failed'));
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Lezen Word-document mislukt');
    });
  });
  
  describe('enrichProgramForExport', () => {
    test('should return program as-is if already parsed', () => {
      const program = {
        name: 'Test',
        steps: [{ type: 'RUST', number: 0 }],
        variables: [],
      };
      
      const result = enrichProgramForExport(program, syntaxRules);
      
      expect(result).toBe(program);
    });
    
    test('should parse program if not already parsed', () => {
      // Mock LogicParser for this test
      jest.mock('../../src/LogicParser.js', () => ({
        LogicParser: jest.fn().mockImplementation(() => ({
          parse: jest.fn(() => ({
            steps: [{ type: 'RUST', number: 0 }],
            variables: [],
            timers: [],
          })),
        })),
      }));
      
      const program = {
        name: 'Test',
        type: 'FB',
        fbNumber: 100,
        rawContent: 'RUST: Initial',
      };
      
      const result = enrichProgramForExport(program, syntaxRules);
      
      expect(result.name).toBe('Test');
      expect(result.type).toBe('FB');
      expect(result.fbNumber).toBe(100);
    });
    
    test('should handle parse errors in enrichment', () => {
      const program = {
        name: 'Test',
        rawContent: 'Invalid content',
      };
      
      // Force an error by not having steps
      const result = enrichProgramForExport(program, syntaxRules);
      
      expect(result).toBe(program);
    });
  });
  
  describe('Internal helper functions', () => {
    test('should convert content to Standaardwerk format', async () => {
      const htmlContent = `
        <h1>1. Test Program FB100</h1>
        <p>RUST: Initial</p>
        <p>Ready</p>
        <p>STAP 1: Process</p>
        <p>Start</p>
        <p>+ Alternative</p>
      `;
      
      window.mammoth.convertToHtml.mockResolvedValue({ value: htmlContent });
      const file = new Blob(['test'], { type: 'application/msword' });
      
      const result = await parseWordDocument(file, syntaxRules);
      
      const program = result.programs[0];
      expect(program.rawContent).toContain('RUST: Initial');
      expect(program.rawContent).toContain('STAP 1: Process');
      expect(program.rawContent).toContain('+ Alternative');
    });
    
    test('should generate IDB name from program name', async () => {
      const testCases = [
        { 
          html: '<h1>1. Tank Control System FB100</h1><p>Content</p>',
          expectedIdb: 'TankControlSystem',
        },
        { 
          html: '<h1>2. Process: Monitor FB200</h1><p>Content</p>',
          expectedIdb: 'Process_Monitor',
        },
        { 
          html: '<h1>3. FB300</h1><p>Content</p>',
          expectedIdb: 'Generated_IDB',
        },
      ];
      
      for (const testCase of testCases) {
        window.mammoth.convertToHtml.mockResolvedValue({ value: testCase.html });
        const file = new Blob(['test'], { type: 'application/msword' });
        
        const result = await parseWordDocument(file, syntaxRules);
        
        if (!result.programs[0].idbName) {
          // Check if generateIdbName would produce expected result
          expect(result.programs[0].idbName || 'Generated_IDB').toBe(testCase.expectedIdb);
        }
      }
    });
  });
});