#!/usr/bin/env node

import { AutoTrainer } from './src/core/AutoTrainer.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Mock CLI parser voor testing
class MockCLIParser {
  constructor() {
    this.syntaxRules = {
      stepKeywords: {
        step: ['STAP', 'SCHRITT', 'STEP'],
        rest: ['RUST', 'RUHE', 'IDLE'],
        end: ['KLAAR', 'FERTIG', 'END']
      },
      variableDetection: {
        timerKeywords: ['TIJD', 'TIME', 'ZEIT'],
        markerKeywords: ['MARKER', 'FLAG', 'MERKER'],
        storingKeywords: ['STORING', 'FAULT', 'STÖRUNG']
      }
    };
  }

  async parseFile(filePath) {
    console.log(`📄 Parsing file: ${filePath}`);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Simple parsing simulation
      const result = {
        steps: [],
        variables: [],
        errors: [],
        warnings: [],
        unknownPatterns: [],
        suggestions: []
      };
      
      let currentStep = null;
      let lineNumber = 0;
      
      for (const line of lines) {
        lineNumber++;
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('//')) continue;
        
        // Check for step patterns
        const stepMatch = trimmed.match(/^(RUHE|RUST|SCHRITT|STAP|STEP|KLAAR|FERTIG|END)(\s+(\d+))?\s*:\s*(.+)$/i);
        if (stepMatch) {
          currentStep = {
            type: stepMatch[1].toUpperCase(),
            number: stepMatch[3] ? parseInt(stepMatch[3]) : 0,
            description: stepMatch[4],
            conditions: [],
            line: lineNumber
          };
          result.steps.push(currentStep);
          continue;
        }
        
        // Check for variable assignments
        const variableMatch = trimmed.match(/^(.+?)\s*=\s*(.*)$/);
        if (variableMatch) {
          result.variables.push({
            name: variableMatch[1],
            value: variableMatch[2],
            line: lineNumber
          });
          continue;
        }
        
        // Check for conditions
        if (trimmed.startsWith('-') && currentStep) {
          currentStep.conditions.push(trimmed.substring(1).trim());
          continue;
        }
        
        // Check for timer patterns
        if (trimmed.match(/zeit\s+\d+.*\?\?/i)) {
          if (currentStep) {
            currentStep.timers = currentStep.timers || [];
            currentStep.timers.push({
              pattern: trimmed,
              line: lineNumber
            });
          }
          continue;
        }
        
        // Everything else is unknown
        if (trimmed.length > 0) {
          result.unknownPatterns.push({
            line: lineNumber,
            content: trimmed,
            context: currentStep ? `In ${currentStep.type} ${currentStep.number}` : 'Global'
          });
          
          // Generate suggestions for unknown patterns
          if (trimmed.includes('=')) {
            result.suggestions.push({
              type: 'variable_assignment',
              pattern: trimmed,
              suggestion: 'Possible variable assignment pattern',
              confidence: 0.7,
              line: lineNumber
            });
          }
          
          if (trimmed.includes('SCHRITT') || trimmed.includes('STAP')) {
            result.suggestions.push({
              type: 'cross_reference',
              pattern: trimmed,
              suggestion: 'Possible cross-reference pattern',
              confidence: 0.8,
              line: lineNumber
            });
          }
        }
      }
      
      // Add some realistic errors and warnings
      if (result.steps.length === 0) {
        result.errors.push({
          type: 'no_steps_found',
          message: 'No valid steps found in document',
          line: 0
        });
      }
      
      // Add warnings for missing conditions
      result.steps.forEach(step => {
        if (step.conditions.length === 0 && step.type !== 'RUHE') {
          result.warnings.push({
            type: 'missing_conditions',
            message: `Step ${step.number} has no conditions`,
            line: step.line
          });
        }
      });
      
      console.log(`✅ Parsed ${result.steps.length} steps, ${result.variables.length} variables`);
      console.log(`⚠️  ${result.errors.length} errors, ${result.warnings.length} warnings`);
      console.log(`❓ ${result.unknownPatterns.length} unknown patterns`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error parsing file ${filePath}:`, error.message);
      return {
        steps: [],
        variables: [],
        errors: [{ type: 'parse_error', message: error.message, line: 0 }],
        warnings: [],
        unknownPatterns: [],
        suggestions: []
      };
    }
  }
}

async function main() {
  console.log('🎓 Starting Enhanced AutoTrainer...');
  
  // Initialize trainer
  const cliParser = new MockCLIParser();
  const trainer = new AutoTrainer(cliParser, {
    maxIterations: 5,
    minConfidence: 0.7,
    convergenceThreshold: 0.03,
    backupOriginalRules: true
  });
  
  // Training files
  const trainingFiles = [
    '/home/sjoeaat/projects/standaardwerk-1/trainer-structure/training-data/sample-industrial-program.txt'
  ];
  
  // Add existing training files if they exist
  const existingFiles = [
    './results/auto-training-results-v2/iteration-1/Programmbeschreibung voorbeeld.xml',
    './results/auto-training-results-v2/iteration-1/Programmbeschreibung_Salzbad_5_V0.0.02.xml'
  ];
  
  existingFiles.forEach(file => {
    if (existsSync(file)) {
      console.log(`📁 Found existing training file: ${file}`);
      // Note: we would need to convert XML to text format for our parser
    }
  });
  
  try {
    // Start training
    const results = await trainer.startTraining(trainingFiles, './training-results-new');
    
    console.log('\n🎯 Training Results Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total iterations: ${results.totalIterations}`);
    console.log(`✅ Converged: ${results.converged ? 'Yes' : 'No'}`);
    console.log(`📈 Final accuracy: ${(results.finalMetrics.parsingEfficiency * 100).toFixed(2)}%`);
    console.log(`❌ Error rate: ${(results.finalMetrics.errorRate * 100).toFixed(2)}%`);
    console.log(`⚠️  Warning rate: ${(results.finalMetrics.warningRate * 100).toFixed(2)}%`);
    
    if (results.bestSuggestions && results.bestSuggestions.length > 0) {
      console.log('\n🔍 Best Pattern Suggestions:');
      results.bestSuggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.type} (confidence: ${suggestion.confidence})`);
        console.log(`   Frequency: ${suggestion.frequency}`);
        if (suggestion.examples && suggestion.examples.length > 0) {
          console.log(`   Example: "${suggestion.examples[0]}"`);
        }
      });
    }
    
    if (results.recommendations && results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.message} (Priority: ${rec.priority})`);
      });
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Review generated patterns in ./training-results-new/');
    console.log('2. Validate suggestions with domain experts');
    console.log('3. Integrate approved patterns into syntax rules');
    console.log('4. Run additional training iterations with more data');
    
  } catch (error) {
    console.error('❌ Training failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);