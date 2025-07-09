#!/usr/bin/env node
// =====================================================================
// generate-patterns.js - CLI for Pattern Generation
// =====================================================================
// Command-line interface for generating regex patterns from training data
// Usage: node generate-patterns.js --input training-report.json --output validation-config.json
// =====================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PatternGenerator } from '../src/core/PatternGenerator.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  options[key] = value;
}

// Default options
const defaultOptions = {
  input: './documentatie/auto-training-results-v2/training-report.json',
  output: './validation-config.json',
  report: './pattern-generation-report.json',
  minFrequency: '3',
  minPrecision: '0.7',
  minRecall: '0.7',
  maxPatterns: '5'
};

// Merge options
const config = { ...defaultOptions, ...options };

// Convert string numbers to numbers
const numericOptions = {
  minFrequency: parseInt(config.minFrequency),
  minPrecision: parseFloat(config.minPrecision),
  minRecall: parseFloat(config.minRecall),
  maxPatterns: parseInt(config.maxPatterns)
};

async function main() {
  console.log('🚀 Starting Pattern Generation...');
  console.log('📋 Configuration:');
  console.log(`  Input: ${config.input}`);
  console.log(`  Output: ${config.output}`);
  console.log(`  Report: ${config.report}`);
  console.log(`  Min Frequency: ${numericOptions.minFrequency}`);
  console.log(`  Min Precision: ${numericOptions.minPrecision}`);
  console.log(`  Min Recall: ${numericOptions.minRecall}`);
  console.log(`  Max Patterns: ${numericOptions.maxPatterns}`);
  console.log('');

  // Check if input file exists
  if (!existsSync(config.input)) {
    console.error(`❌ Input file not found: ${config.input}`);
    process.exit(1);
  }

  try {
    // Load training data
    console.log('📚 Loading training data...');
    const trainingData = JSON.parse(readFileSync(config.input, 'utf8'));
    
    // Initialize pattern generator
    const generator = new PatternGenerator(numericOptions);
    
    // Load training data from multiple sources
    const allResults = [];
    
    // Load from progress metrics if available
    if (trainingData.progressMetrics) {
      trainingData.progressMetrics.forEach(progress => {
        // Simulate training results structure
        allResults.push({
          suggestions: trainingData.bestSuggestions || []
        });
      });
    }
    
    // Load best suggestions directly
    if (trainingData.bestSuggestions) {
      allResults.push({
        suggestions: trainingData.bestSuggestions
      });
    }
    
    // Load training data
    generator.loadTrainingData(allResults);
    
    // Generate patterns
    console.log('🔧 Generating patterns...');
    const patterns = await generator.generateAllPatterns();
    
    // Export to validation config
    console.log('💾 Exporting patterns...');
    const validationConfig = generator.exportToValidationConfig(config.output);
    
    // Generate report
    console.log('📊 Generating report...');
    const report = generator.generatePatternReport(config.report);
    
    // Summary
    console.log('');
    console.log('✅ Pattern Generation Complete!');
    console.log('📊 Summary:');
    console.log(`  Total Groups: ${patterns.size}`);
    console.log(`  Total Patterns: ${Array.from(patterns.values()).reduce((sum, p) => sum + p.length, 0)}`);
    console.log(`  Average Precision: ${(report.summary.averagePrecision * 100).toFixed(1)}%`);
    console.log(`  Average Recall: ${(report.summary.averageRecall * 100).toFixed(1)}%`);
    console.log('');
    
    // Show patterns by group
    patterns.forEach((groupPatterns, groupType) => {
      console.log(`📋 ${groupType.toUpperCase()} (${groupPatterns.length} patterns):`);
      groupPatterns.forEach(pattern => {
        console.log(`  • ${pattern.pattern} (F1: ${(pattern.f1Score * 100).toFixed(1)}%)`);
        console.log(`    ${pattern.description}`);
      });
      console.log('');
    });
    
    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  ${rec.priority === 'high' ? '🔴' : '🟡'} ${rec.message}`);
      });
    }
    
    console.log('📁 Files generated:');
    console.log(`  Validation Config: ${config.output}`);
    console.log(`  Pattern Report: ${config.report}`);
    
  } catch (error) {
    console.error('❌ Error during pattern generation:', error);
    process.exit(1);
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log('🎯 Pattern Generation CLI');
  console.log('');
  console.log('Usage:');
  console.log('  node generate-patterns.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --input <file>        Input training report JSON file');
  console.log('  --output <file>       Output validation config JSON file');
  console.log('  --report <file>       Pattern generation report file');
  console.log('  --minFrequency <n>    Minimum pattern frequency (default: 3)');
  console.log('  --minPrecision <n>    Minimum pattern precision (default: 0.7)');
  console.log('  --minRecall <n>       Minimum pattern recall (default: 0.7)');
  console.log('  --maxPatterns <n>     Maximum patterns per group (default: 5)');
  console.log('  --help, -h            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node generate-patterns.js');
  console.log('  node generate-patterns.js --input training-report.json --output patterns.json');
  console.log('  node generate-patterns.js --minFrequency 5 --minPrecision 0.8');
  process.exit(0);
}

// Run main function
main().catch(console.error);