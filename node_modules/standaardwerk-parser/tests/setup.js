// Jest setup file
// Global test configuration and utilities

import { jest, beforeEach, afterEach } from '@jest/globals';

// Increase timeout for complex parsing operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging
  warn: console.warn,
  error: console.error,
};

// Global test utilities
global.testUtils = {
  // Create sample industrial program text
  createSampleProgram: (steps = 3) => {
    const program = ['RUHE: Initial state', '- System ready', '- All sensors OK', ''];
    
    for (let i = 1; i <= steps; i++) {
      program.push(`SCHRITT ${i}: Step ${i} description`);
      program.push(`- Condition ${i}`);
      program.push('');
    }
    
    return program.join('\n');
  },
  
  // Create sample parser configuration
  createBasicSyntaxRules: () => ({
    stepKeywords: {
      step: ['STAP', 'SCHRITT', 'STEP'],
      rest: ['RUST', 'RUHE', 'IDLE'],
      end: ['KLAAR', 'FERTIG', 'END'],
    },
    variableDetection: {
      timerKeywords: ['TIJD', 'TIME', 'ZEIT'],
      markerKeywords: ['MARKER', 'FLAG', 'MERKER'],
      storingKeywords: ['STORING', 'FAULT', 'STÖRUNG'],
    },
    conditions: {
      orPrefix: '+',
      notPrefix: ['NIET', 'NICHT', 'NOT'],
      transitionPrefix: '->',
    },
  }),
  
  // Create sample validation rules
  createBasicValidationRules: () => ({
    steps: {
      requireDescription: true,
      allowEmptyConditions: false,
      maxStepsPerProgram: 100,
    },
    variables: {
      requireTypeDeclaration: false,
      allowDuplicateNames: false,
    },
  }),
};

import { expect } from '@jest/globals';

// Custom matchers
expect.extend({
  toHaveValidSteps(received) {
    const pass = received.steps && Array.isArray(received.steps) && received.steps.length > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid steps`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid steps`,
        pass: false,
      };
    }
  },
  
  toHaveStep(received, stepNumber) {
    const hasStep = received.steps && received.steps.some(step => step.number === stepNumber);
    if (hasStep) {
      return {
        message: () => `expected ${received} not to have step ${stepNumber}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have step ${stepNumber}`,
        pass: false,
      };
    }
  },
});

// Error suppression for expected errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' && 
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});