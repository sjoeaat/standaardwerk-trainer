import { describe, test, expect, beforeEach } from '@jest/globals';
import { XmlComparisonValidator } from '../../src/XmlComparisonValidator.js';

describe('XmlComparisonValidator', () => {
  let validator;
  
  beforeEach(() => {
    validator = new XmlComparisonValidator();
  });
  
  describe('Constructor', () => {
    test('should initialize with correct patterns', () => {
      expect(validator.xmlPatterns).toBeDefined();
      expect(validator.xmlPatterns.stepPattern).toBeInstanceOf(RegExp);
      expect(validator.xmlPatterns.variablePattern).toBeInstanceOf(RegExp);
      expect(validator.xmlPatterns.fbReference).toBeInstanceOf(RegExp);
      expect(validator.xmlPatterns.conditionPattern).toBeInstanceOf(RegExp);
      expect(validator.xmlPatterns.crossRefPattern).toBeInstanceOf(RegExp);
    });
    
    test('should initialize with validation rules', () => {
      expect(validator.validationRules).toBeDefined();
      expect(validator.validationRules.stepNumberSequence).toBe(true);
      expect(validator.validationRules.variableTypeConsistency).toBe(true);
      expect(validator.validationRules.crossReferenceIntegrity).toBe(true);
      expect(validator.validationRules.commentPreservation).toBe(true);
    });
  });
  
  describe('parseXmlContent', () => {
    test('should parse steps from XML', () => {
      const xmlContent = `
        <Network Title="SCHRITT 1">
          <Comment>First step</Comment>
        </Network>
        <Network Title="SCHRITT 2">
          <Comment>Second step</Comment>
        </Network>
      `;
      
      const result = validator.parseXmlContent(xmlContent);
      
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].number).toBe(1);
      expect(result.steps[1].number).toBe(2);
    });
    
    test('should parse variables from XML', () => {
      const xmlContent = `
        <Member Name="Temperature" Datatype="Real"/>
        <Member Name="Pressure" Datatype="Int"/>
        <Member Name="Active" Datatype="Bool"/>
      `;
      
      const result = validator.parseXmlContent(xmlContent);
      
      expect(result.variables).toHaveLength(3);
      expect(result.variables[0]).toEqual({ name: 'Temperature', datatype: 'Real' });
      expect(result.variables[1]).toEqual({ name: 'Pressure', datatype: 'Int' });
      expect(result.variables[2]).toEqual({ name: 'Active', datatype: 'Bool' });
    });
    
    test('should parse cross-references from XML', () => {
      const xmlContent = `
        <Call FB="FB102" Step="SCHRITT 5"/>
        <Call FB="FB200" Step="SCHRITT 10"/>
      `;
      
      const result = validator.parseXmlContent(xmlContent);
      
      expect(result.crossReferences).toHaveLength(2);
      expect(result.crossReferences[0]).toEqual({ fb: 'FB102', step: 'SCHRITT 5' });
      expect(result.crossReferences[1]).toEqual({ fb: 'FB200', step: 'SCHRITT 10' });
    });
    
    test('should parse comments from XML', () => {
      const xmlContent = `
        <Network Title="SCHRITT 1">
          <Comment>Initialize system</Comment>
        </Network>
        <Network Title="SCHRITT 2">
          <Comment>Start process</Comment>
        </Network>
      `;
      
      const result = validator.parseXmlContent(xmlContent);
      
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0]).toEqual({ stepNumber: 1, comment: 'Initialize system' });
      expect(result.comments[1]).toEqual({ stepNumber: 2, comment: 'Start process' });
    });
    
    test('should handle empty XML content', () => {
      const result = validator.parseXmlContent('');
      
      expect(result.steps).toHaveLength(0);
      expect(result.variables).toHaveLength(0);
      expect(result.crossReferences).toHaveLength(0);
      expect(result.comments).toHaveLength(0);
    });
  });
  
  describe('validateSteps', () => {
    test('should pass when step counts match', () => {
      const parseResult = {
        steps: [
          { type: 'SCHRITT', number: 1 },
          { type: 'SCHRITT', number: 2 },
        ],
      };
      
      const xmlData = {
        steps: [
          { number: 1 },
          { number: 2 },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateSteps(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Step Validation'].passed).toBe(true);
      expect(validationResult.statistics.passedTests).toBe(1);
      expect(validationResult.statistics.failedTests).toBe(0);
    });
    
    test('should fail when step counts mismatch', () => {
      const parseResult = {
        steps: [
          { type: 'SCHRITT', number: 1 },
        ],
      };
      
      const xmlData = {
        steps: [
          { number: 1 },
          { number: 2 },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateSteps(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Step Validation'].passed).toBe(false);
      expect(validationResult.details['Step Validation'].issues).toHaveLength(1);
      expect(validationResult.statistics.failedTests).toBe(1);
    });
    
    test('should fail when step numbers mismatch', () => {
      const parseResult = {
        steps: [
          { type: 'SCHRITT', number: 1 },
          { type: 'SCHRITT', number: 3 },
        ],
      };
      
      const xmlData = {
        steps: [
          { number: 1 },
          { number: 2 },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateSteps(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Step Validation'].passed).toBe(false);
      const issues = validationResult.details['Step Validation'].issues;
      expect(issues.some(i => i.type === 'step_number_mismatch')).toBe(true);
    });
  });
  
  describe('validateVariables', () => {
    test('should pass when common variables are found', () => {
      const parseResult = {
        variables: [
          { name: 'Stap' },
          { name: 'Hulp' },
          { name: 'Tijd' },
        ],
      };
      
      const xmlData = {
        variables: [
          { name: 'Stap', datatype: 'Int' },
          { name: 'Hulp', datatype: 'Bool' },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateVariables(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Variable Validation'].passed).toBe(true);
      expect(validationResult.statistics.passedTests).toBe(1);
    });
    
    test('should fail when common variables are missing', () => {
      const parseResult = {
        variables: [],
      };
      
      const xmlData = {
        variables: [
          { name: 'Stap', datatype: 'Int' },
          { name: 'Hulp', datatype: 'Bool' },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateVariables(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Variable Validation'].passed).toBe(false);
      expect(validationResult.details['Variable Validation'].issues).toHaveLength(2);
    });
  });
  
  describe('validateCrossReferences', () => {
    test('should pass when cross-references are found', () => {
      const parseResult = {
        crossReferences: [
          { program: 'FB102', rawText: 'Reference to FB102 SCHRITT 5' },
        ],
      };
      
      const xmlData = {
        crossReferences: [
          { fb: 'FB102', step: '5' },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateCrossReferences(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Cross Reference Validation'].passed).toBe(true);
    });
    
    test('should fail when cross-references are missing', () => {
      const parseResult = {
        crossReferences: [],
      };
      
      const xmlData = {
        crossReferences: [
          { fb: 'FB102', step: '5' },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateCrossReferences(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Cross Reference Validation'].passed).toBe(false);
      expect(validationResult.details['Cross Reference Validation'].issues).toHaveLength(1);
    });
  });
  
  describe('validateComments', () => {
    test('should warn when comments are missing', () => {
      const parseResult = {
        comments: [],
      };
      
      const xmlData = {
        comments: [
          { stepNumber: 1, comment: 'This is a test comment for step 1' },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateComments(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Comment Validation'].passed).toBe(false);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.statistics.passedTests).toBe(1); // Comments are warnings, not failures
    });
    
    test('should pass when comments are preserved', () => {
      const parseResult = {
        comments: [
          { content: 'This is a test comment for step 1 with more text' },
        ],
      };
      
      const xmlData = {
        comments: [
          { stepNumber: 1, comment: 'This is a test comment for step 1' },
        ],
      };
      
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: { passedTests: 0, failedTests: 0 },
        details: {},
      };
      
      validator.validateComments(parseResult, xmlData, validationResult);
      
      expect(validationResult.details['Comment Validation'].passed).toBe(true);
    });
  });
  
  describe('validateAgainstXml', () => {
    test('should run all validations and return complete result', () => {
      const parseResult = {
        steps: [
          { type: 'SCHRITT', number: 1 },
        ],
        variables: [
          { name: 'Stap' },
        ],
        crossReferences: [],
        comments: [],
      };
      
      const xmlContent = `
        <Network Title="SCHRITT 1">
          <Comment>First step</Comment>
        </Network>
        <Member Name="Stap" Datatype="Int"/>
      `;
      
      const result = validator.validateAgainstXml(parseResult, xmlContent);
      
      expect(result.passed).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.statistics.totalTests).toBeGreaterThan(0);
      expect(result.details).toBeDefined();
    });
    
    test('should fail validation when there are errors', () => {
      const parseResult = {
        steps: [], // No steps parsed
        variables: [],
        crossReferences: [],
        comments: [],
      };
      
      const xmlContent = `
        <Network Title="SCHRITT 1"/>
        <Network Title="SCHRITT 2"/>
      `;
      
      const result = validator.validateAgainstXml(parseResult, xmlContent);
      
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('generateReport', () => {
    test('should generate report for passed validation', () => {
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        statistics: {
          totalTests: 4,
          passedTests: 4,
          failedTests: 0,
        },
        details: {
          'Step Validation': { passed: true, issues: [] },
          'Variable Validation': { passed: true, issues: [] },
        },
      };
      
      const report = validator.generateReport(validationResult);
      
      expect(report).toContain('✅ PASSED');
      expect(report).toContain('4/4 passed');
      expect(report).not.toContain('💡 Recommendations');
    });
    
    test('should generate report for failed validation', () => {
      const validationResult = {
        passed: false,
        errors: [
          { message: 'Step count mismatch' },
        ],
        warnings: [],
        statistics: {
          totalTests: 4,
          passedTests: 3,
          failedTests: 1,
        },
        details: {
          'Step Validation': { 
            passed: false, 
            issues: [{ message: 'Step count mismatch' }], 
          },
        },
      };
      
      const report = validator.generateReport(validationResult);
      
      expect(report).toContain('❌ FAILED');
      expect(report).toContain('3/4 passed');
      expect(report).toContain('💡 Recommendations');
      expect(report).toContain('Step count mismatch');
    });
  });
  
  describe('createTestCases', () => {
    test('should create test cases from XML samples', () => {
      const xmlSamples = [
        '<Network Title="SCHRITT 1"/>',
        '<Network Title="SCHRITT 2"/><Member Name="Test" Datatype="Bool"/>',
      ];
      
      const testCases = validator.createTestCases(xmlSamples);
      
      expect(testCases).toHaveLength(2);
      expect(testCases[0].name).toBe('Sample 1');
      expect(testCases[0].expectedSteps).toBe(1);
      expect(testCases[1].expectedVariables).toBe(1);
      expect(typeof testCases[0].validate).toBe('function');
    });
    
    test('should validate function work correctly in test cases', () => {
      const xmlSamples = [
        '<Network Title="SCHRITT 1"/>',
      ];
      
      const testCases = validator.createTestCases(xmlSamples);
      const parseResult = {
        steps: [{ type: 'SCHRITT', number: 1 }],
        variables: [],
        crossReferences: [],
        comments: [],
      };
      
      const validationResult = testCases[0].validate(parseResult);
      
      expect(validationResult.passed).toBe(true);
    });
  });
});