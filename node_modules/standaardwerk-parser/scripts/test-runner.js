#!/usr/bin/env node

/**
 * Test Runner Script for Standaardwerk Parser
 * Provides comprehensive testing options with coverage reporting
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure coverage directory exists
if (!existsSync('./coverage')) {
  mkdirSync('./coverage', { recursive: true });
}

const args = process.argv.slice(2);
const command = args[0] || 'help';

// Test configurations
const testConfigs = {
  unit: {
    description: 'Run unit tests only',
    command: 'jest',
    args: ['tests/unit', '--verbose']
  },
  integration: {
    description: 'Run integration tests only',
    command: 'jest',
    args: ['tests/integration', '--verbose']
  },
  all: {
    description: 'Run all tests',
    command: 'jest',
    args: ['--verbose']
  },
  watch: {
    description: 'Run tests in watch mode',
    command: 'jest',
    args: ['--watch', '--verbose']
  },
  coverage: {
    description: 'Run tests with coverage report',
    command: 'c8',
    args: ['--reporter=html', '--reporter=text', '--reporter=lcov', 'jest']
  },
  'coverage-unit': {
    description: 'Run unit tests with coverage',
    command: 'c8',
    args: ['--reporter=html', '--reporter=text', 'jest', 'tests/unit']
  },
  'coverage-integration': {
    description: 'Run integration tests with coverage',
    command: 'c8',
    args: ['--reporter=html', '--reporter=text', 'jest', 'tests/integration']
  },
  legacy: {
    description: 'Run legacy test files',
    command: 'node',
    args: ['tests/unit/test-advanced-parser.js']
  }
};

function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${cmd} ${args.join(' ')}\n`);
    
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  const startTime = Date.now();
  
  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        console.log('📋 Standaardwerk Parser Test Runner\n');
        console.log('Available commands:');
        Object.entries(testConfigs).forEach(([cmd, config]) => {
          console.log(`  ${cmd.padEnd(20)} - ${config.description}`);
        });
        console.log('\nExamples:');
        console.log('  npm run test:script unit');
        console.log('  npm run test:script coverage');
        console.log('  npm run test:script watch');
        break;

      case 'quick':
        console.log('🏃‍♂️ Running quick test suite...');
        await runCommand('jest', ['tests/unit', '--passWithNoTests']);
        break;

      case 'full':
        console.log('🎯 Running full test suite with coverage...');
        await runCommand('c8', ['--reporter=html', '--reporter=text', 'jest']);
        console.log('\n📊 Coverage report generated in ./coverage/');
        break;

      case 'ci':
        console.log('🤖 Running CI test suite...');
        await runCommand('c8', [
          '--reporter=lcov',
          '--reporter=text',
          '--check-coverage',
          '--lines', '80',
          '--functions', '80',
          '--branches', '75',
          '--statements', '80',
          'jest'
        ]);
        break;

      default:
        if (testConfigs[command]) {
          const config = testConfigs[command];
          console.log(`🧪 ${config.description}...`);
          await runCommand(config.command, config.args);
        } else {
          console.error(`❌ Unknown command: ${command}`);
          console.log('Run "npm run test:script help" for available commands.');
          process.exit(1);
        }
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Tests completed in ${duration}ms`);
    
    if (command === 'coverage' || command === 'full' || command === 'ci') {
      console.log('📊 Coverage report: ./coverage/index.html');
    }

  } catch (error) {
    console.error(`\n❌ Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Add test result summary
function printTestSummary() {
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  
  // This would be populated by actual test results
  console.log('Unit Tests: ✅ Passed');
  console.log('Integration Tests: ✅ Passed');
  console.log('Coverage: ✅ Above threshold');
  console.log('='.repeat(50));
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Test execution interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test execution terminated');
  process.exit(143);
});

// Run the tests
runTests().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});