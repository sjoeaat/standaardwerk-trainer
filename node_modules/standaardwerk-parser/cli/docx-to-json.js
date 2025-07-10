#!/usr/bin/env node
// =====================================================================
// docx-to-json.js - Convert DOCX to JSON Training Data
// =====================================================================
// Converts Word documents to JSON format for pattern generation training
// Usage: node docx-to-json.js --input document.docx --output training-data.json
// =====================================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { UnifiedTextParser } from '../src/UnifiedTextParser.js';
import { EnhancedParser } from '../src/EnhancedParser.js';
import { FlexibleParser } from '../src/FlexibleParser.js';
import { AdvancedParser } from '../src/AdvancedParser.js';
import { defaultSyntaxRules } from '../src/config/syntaxRules.js';
import { DEFAULT_VALIDATION_RULES } from '../src/config/validationRules.js';
import { DocxParser } from '../src/DocxParser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  input: null,
  output: 'training-data.json',
  format: 'suggestions', // or 'structured'
  parser: 'flexible', // enhanced, flexible, or unified
};

// Merge options
const config = { ...defaultOptions, ...options };

/**
 * DOCX to JSON Converter
 */
class DocxToJsonConverter {
  constructor(parserType = 'flexible') {
    this.docxParser = new DocxParser();
    
    // Choose parser based on type
    if (parserType === 'flexible') {
      this.parser = new FlexibleParser(defaultSyntaxRules, DEFAULT_VALIDATION_RULES);
      console.log('🎯 Using FlexibleParser (EnhancedParser with relaxed validation)');
    } else if (parserType === 'enhanced') {
      this.parser = new EnhancedParser(defaultSyntaxRules, DEFAULT_VALIDATION_RULES);
      console.log('🎯 Using EnhancedParser (rule-based with training support)');
    } else if (parserType === 'advanced') {
      this.parser = new AdvancedParser(defaultSyntaxRules, DEFAULT_VALIDATION_RULES);
      console.log('🚀 Using AdvancedParser (industrial program structure support)');
    } else {
      this.parser = new UnifiedTextParser(defaultSyntaxRules, DEFAULT_VALIDATION_RULES);
      console.log('🔄 Using UnifiedTextParser (original)');
    }
  }

  /**
   * Convert DOCX file to JSON training data
   */
  async convertDocxToJson(inputPath, outputPath, format = 'suggestions', parserType = 'enhanced') {
    console.log(`🔄 Converting ${inputPath} to JSON training data...`);
    
    try {
      // Parse DOCX file
      const docxResult = await this.docxParser.parseDocxFile(inputPath);
      console.log(`📄 Extracted ${docxResult.rawText.length} characters from DOCX`);
      
      // Parse with UnifiedTextParser to get structured data
      const parseResult = this.parser.parseText(docxResult.normalizedText);
      
      console.log('📊 Parsing results:');
      console.log(`  Steps: ${parseResult.steps.length}`);
      console.log(`  Variables: ${parseResult.variables.length}`);
      console.log(`  Conditions: ${parseResult.conditions.length}`);
      console.log(`  Cross-references: ${parseResult.crossReferences.length}`);
      console.log(`  Errors: ${parseResult.errors.length}`);
      console.log(`  Warnings: ${parseResult.warnings.length}`);
      
      // Show parser metrics if available
      if (this.parser.getMetrics) {
        const metrics = this.parser.getMetrics();
        console.log(`  Parser efficiency: ${(metrics.parsingEfficiency * 100).toFixed(1)}%`);
        console.log(`  Cross-refs detected: ${metrics.crossReferences}`);
        console.log(`  Timers detected: ${metrics.timers}`);
      }
      
      // Generate training data in requested format
      let trainingData;
      
      if (format === 'suggestions') {
        trainingData = this.generateSuggestionsFormat(parseResult, docxResult);
      } else {
        trainingData = this.generateStructuredFormat(parseResult, docxResult);
      }
      
      // Write JSON file
      writeFileSync(outputPath, JSON.stringify(trainingData, null, 2));
      console.log(`✅ Training data saved to: ${outputPath}`);
      
      return trainingData;
      
    } catch (error) {
      console.error(`❌ Error converting DOCX to JSON: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate suggestions format (compatible with PatternGenerator)
   */
  generateSuggestionsFormat(parseResult, docxResult) {
    const suggestions = [];
    
    // Process variables as hulpmerker suggestions
    parseResult.variables.forEach(variable => {
      if (variable.name && variable.name.trim()) {
        suggestions.push({
          suggestedGroup: 'hulpmerker',
          potentialType: 'variable',
          originalLine: variable.name,
          confidence: 0.8,
          frequency: 1,
          examples: [variable.name],
        });
      }
    });
    
    // Process steps as schritt suggestions
    parseResult.steps.forEach(step => {
      if (step.description && step.description.trim()) {
        suggestions.push({
          suggestedGroup: 'schritt',
          potentialType: 'step',
          originalLine: `${step.type} ${step.number}: ${step.description}`,
          confidence: 0.9,
          frequency: 1,
          examples: [`${step.type} ${step.number}: ${step.description}`],
        });
      }
    });
    
    // Process cross-references
    parseResult.crossReferences?.forEach(crossRef => {
      if (crossRef.rawText && crossRef.rawText.trim()) {
        suggestions.push({
          suggestedGroup: 'cross_reference',
          potentialType: 'cross_reference',
          originalLine: crossRef.rawText,
          confidence: 0.9,
          frequency: 1,
          examples: [crossRef.rawText],
        });
      }
    });
    
    // Process conditions as various types
    parseResult.conditions?.forEach(condition => {
      if (condition.rawText && condition.rawText.trim()) {
        let groupType = 'hulpmerker'; // default
        
        // Try to classify condition type
        if (condition.rawText.toLowerCase().includes('störung') || 
            condition.rawText.toLowerCase().includes('fault') ||
            condition.rawText.toLowerCase().includes('alarm')) {
          groupType = 'storing';
        } else if (condition.rawText.toLowerCase().includes('melding') || 
                   condition.rawText.toLowerCase().includes('message')) {
          groupType = 'melding';
        }
        
        suggestions.push({
          suggestedGroup: groupType,
          potentialType: 'condition',
          originalLine: condition.rawText,
          confidence: 0.7,
          frequency: 1,
          examples: [condition.rawText],
        });
      }
    });
    
    // Group similar suggestions and calculate frequencies
    const groupedSuggestions = this.groupSimilarSuggestions(suggestions);
    
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      sourceFile: docxResult.metadata?.filename || 'unknown',
      summary: {
        totalSuggestions: groupedSuggestions.length,
        totalSteps: parseResult.steps.length,
        totalVariables: parseResult.variables.length,
        totalErrors: parseResult.errors.length,
        totalWarnings: parseResult.warnings.length,
      },
      bestSuggestions: groupedSuggestions,
      progressMetrics: [{
        iteration: 1,
        metrics: {
          totalFiles: 1,
          totalSteps: parseResult.steps.length,
          totalVariables: parseResult.variables.length,
          totalErrors: parseResult.errors.length,
          totalWarnings: parseResult.warnings.length,
          totalUnknownPatterns: parseResult.unknownPatterns || 0,
          totalSuggestions: groupedSuggestions.length,
          errorRate: parseResult.errors.length / Math.max(parseResult.steps.length, 1),
          warningRate: parseResult.warnings.length / Math.max(parseResult.steps.length, 1),
          unknownPatternRate: 0,
          parsingEfficiency: 0.8,
        },
        appliedSuggestions: 0,
        timestamp: new Date().toISOString(),
      }],
    };
  }

  /**
   * Generate structured format (detailed breakdown)
   */
  generateStructuredFormat(parseResult, docxResult) {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      sourceFile: docxResult.metadata?.filename || 'unknown',
      
      rawContent: {
        text: docxResult.rawText,
        normalizedText: docxResult.normalizedText,
        html: docxResult.html,
      },
      
      parsedData: {
        steps: parseResult.steps.map(step => ({
          number: step.number,
          type: step.type,
          description: step.description,
          entryConditions: step.entryConditions || [],
          exitConditions: step.exitConditions || [],
          lineNumber: step.lineNumber,
        })),
        
        variables: parseResult.variables.map(variable => ({
          name: variable.name,
          type: variable.type,
          group: variable.group,
          conditions: variable.conditions || [],
          lineNumber: variable.lineNumber,
        })),
        
        crossReferences: parseResult.crossReferences || [],
        
        conditions: parseResult.conditions || [],
        
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      },
      
      statistics: {
        totalLines: docxResult.rawText.split('\\n').length,
        totalSteps: parseResult.steps.length,
        totalVariables: parseResult.variables.length,
        totalCrossReferences: parseResult.crossReferences?.length || 0,
        totalConditions: parseResult.conditions?.length || 0,
        totalErrors: parseResult.errors.length,
        totalWarnings: parseResult.warnings.length,
      },
    };
  }

  /**
   * Group similar suggestions together
   */
  groupSimilarSuggestions(suggestions) {
    const groups = new Map();
    
    suggestions.forEach(suggestion => {
      const key = `${suggestion.suggestedGroup}-${suggestion.originalLine}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          ...suggestion,
          frequency: 1,
          examples: [suggestion.originalLine],
        });
      } else {
        const group = groups.get(key);
        group.frequency++;
        group.confidence = Math.max(group.confidence, suggestion.confidence);
        if (group.examples.length < 5 && !group.examples.includes(suggestion.originalLine)) {
          group.examples.push(suggestion.originalLine);
        }
      }
    });
    
    return Array.from(groups.values())
      .sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency));
  }
}

async function main() {
  console.log('🚀 DOCX to JSON Training Data Converter');
  console.log('📋 Configuration:');
  console.log(`  Input: ${config.input || 'Not specified'}`);
  console.log(`  Output: ${config.output}`);
  console.log(`  Format: ${config.format}`);
  console.log('');

  // Validate input
  if (!config.input) {
    console.error('❌ Error: --input parameter is required');
    console.log('');
    printUsage();
    process.exit(1);
  }

  if (!existsSync(config.input)) {
    console.error(`❌ Error: Input file not found: ${config.input}`);
    process.exit(1);
  }

  // Check file extension
  const fileExt = extname(config.input).toLowerCase();
  if (fileExt !== '.docx') {
    console.error(`❌ Error: Input file must be a .docx file, got: ${fileExt}`);
    process.exit(1);
  }

  try {
    // Convert DOCX to JSON
    const converter = new DocxToJsonConverter(config.parser);
    const trainingData = await converter.convertDocxToJson(
      config.input,
      config.output,
      config.format,
      config.parser,
    );

    console.log('');
    console.log('✅ Conversion Complete!');
    console.log('📊 Summary:');
    console.log(`  Total Suggestions: ${trainingData.bestSuggestions?.length || 0}`);
    console.log(`  Total Steps: ${trainingData.summary?.totalSteps || 0}`);
    console.log(`  Total Variables: ${trainingData.summary?.totalVariables || 0}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log(`  1. Review the generated training data: ${config.output}`);
    console.log(`  2. Generate patterns: node generate-patterns.js --input ${config.output}`);
    console.log('  3. Import patterns into your validation config');
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

function printUsage() {
  console.log('🎯 DOCX to JSON Training Data Converter');
  console.log('');
  console.log('Usage:');
  console.log('  node docx-to-json.js --input <docx-file> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --input <file>       Input DOCX file (required)');
  console.log('  --output <file>      Output JSON file (default: training-data.json)');
  console.log('  --format <format>    Output format: suggestions|structured (default: suggestions)');
  console.log('  --parser <type>      Parser type: flexible|enhanced|advanced|unified (default: flexible)');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node docx-to-json.js --input document.docx');
  console.log('  node docx-to-json.js --input document.docx --output my-training.json');
  console.log('  node docx-to-json.js --input document.docx --format structured');
  console.log('');
  console.log('Full Workflow:');
  console.log('  1. Convert DOCX to JSON: node docx-to-json.js --input document.docx');
  console.log('  2. Generate patterns: node generate-patterns.js --input training-data.json');
  console.log('  3. Import patterns into validation config');
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

// Run main function
main().catch(console.error);