#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Comprehensive Analysis of Training Results
 * Analyzes existing training data and generates improved syntax rules
 */
class TrainingAnalyzer {
  constructor() {
    this.analysisResults = {
      patterns: {},
      accuracy: {},
      recommendations: [],
      improvedRules: {}
    };
  }

  /**
   * Analyze existing training results
   */
  analyzeExistingResults() {
    console.log('🔍 Analyzing existing training results...');
    
    // Load training report
    const reportPath = './results/auto-training-results-v2/training-report.json';
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      this.analyzeTrainingReport(report);
    }
    
    // Load optimized syntax rules
    const optimizedRulesPath = './results/auto-training-results-v2/optimized-syntax-rules.json';
    if (existsSync(optimizedRulesPath)) {
      const optimizedRules = JSON.parse(readFileSync(optimizedRulesPath, 'utf8'));
      this.analyzeOptimizedRules(optimizedRules);
    }
    
    // Analyze iteration results
    this.analyzeIterationResults();
    
    return this.analysisResults;
  }

  /**
   * Analyze training report metrics
   */
  analyzeTrainingReport(report) {
    console.log('📊 Analyzing training report...');
    
    const metrics = report.finalMetrics;
    const accuracy = {
      parsingEfficiency: metrics.parsingEfficiency,
      errorRate: metrics.errorRate,
      warningRate: metrics.warningRate,
      unknownPatternRate: metrics.unknownPatternRate
    };
    
    console.log(`📈 Final parsing efficiency: ${(accuracy.parsingEfficiency * 100).toFixed(2)}%`);
    console.log(`❌ Error rate: ${(accuracy.errorRate * 100).toFixed(2)}%`);
    console.log(`⚠️  Warning rate: ${(accuracy.warningRate * 100).toFixed(2)}%`);
    console.log(`❓ Unknown pattern rate: ${(accuracy.unknownPatternRate * 100).toFixed(2)}%`);
    
    this.analysisResults.accuracy = accuracy;
    
    // Analyze best suggestions
    if (report.bestSuggestions) {
      console.log('\n🎯 Best Pattern Suggestions:');
      report.bestSuggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.suggestedGroup} (confidence: ${suggestion.confidence})`);
        console.log(`   Frequency: ${suggestion.frequency}`);
        if (suggestion.examples) {
          console.log(`   Example: "${suggestion.examples[0]}"`);
        }
      });
      
      this.analysisResults.patterns.bestSuggestions = report.bestSuggestions;
    }
    
    // Generate recommendations based on metrics
    this.generateRecommendations(accuracy);
  }

  /**
   * Analyze optimized syntax rules
   */
  analyzeOptimizedRules(rules) {
    console.log('📋 Analyzing optimized syntax rules...');
    
    // Count pattern types
    const patternCounts = {
      stepPatterns: rules.stepPatterns ? rules.stepPatterns.length : 0,
      conditionPatterns: rules.conditionPatterns ? rules.conditionPatterns.length : 0,
      variablePatterns: rules.variablePatterns ? rules.variablePatterns.length : 0
    };
    
    console.log(`📌 Step patterns: ${patternCounts.stepPatterns}`);
    console.log(`📌 Condition patterns: ${patternCounts.conditionPatterns}`);
    console.log(`📌 Variable patterns: ${patternCounts.variablePatterns}`);
    
    this.analysisResults.patterns.counts = patternCounts;
    this.analysisResults.patterns.rules = rules;
  }

  /**
   * Analyze iteration results
   */
  analyzeIterationResults() {
    console.log('🔄 Analyzing iteration results...');
    
    const iterations = ['iteration-1', 'iteration-2'];
    const iterationAnalysis = [];
    
    iterations.forEach(iteration => {
      const iterationPath = `./results/auto-training-results-v2/${iteration}`;
      if (existsSync(iterationPath)) {
        const files = [
          'updated-syntax-rules.json',
          'updated-validation-rules.json'
        ];
        
        const iterationData = { name: iteration, files: {} };
        
        files.forEach(file => {
          const filePath = join(iterationPath, file);
          if (existsSync(filePath)) {
            try {
              iterationData.files[file] = JSON.parse(readFileSync(filePath, 'utf8'));
            } catch (error) {
              console.log(`⚠️  Could not parse ${file}: ${error.message}`);
            }
          }
        });
        
        iterationAnalysis.push(iterationData);
      }
    });
    
    this.analysisResults.iterations = iterationAnalysis;
  }

  /**
   * Generate recommendations for improvement
   */
  generateRecommendations(accuracy) {
    const recommendations = [];
    
    // High error rate
    if (accuracy.errorRate > 0.5) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: 'Error rate is very high (>50%). Consider reviewing validation rules and adding more specific patterns.',
        action: 'Review validation rules and add missing patterns'
      });
    }
    
    // High unknown pattern rate
    if (accuracy.unknownPatternRate > 5.0) {
      recommendations.push({
        type: 'unknown_patterns',
        priority: 'high',
        message: 'Many unknown patterns detected. Expand training data or create manual patterns.',
        action: 'Add more training examples or create manual pattern rules'
      });
    }
    
    // Low parsing efficiency
    if (accuracy.parsingEfficiency < 0.3) {
      recommendations.push({
        type: 'parsing_efficiency',
        priority: 'medium',
        message: 'Parsing efficiency is low. Consider improving step detection patterns.',
        action: 'Enhance step detection and condition parsing rules'
      });
    }
    
    // High warning rate
    if (accuracy.warningRate > 0.8) {
      recommendations.push({
        type: 'warnings',
        priority: 'medium',
        message: 'High warning rate indicates potential issues with validation rules.',
        action: 'Review and adjust validation rule thresholds'
      });
    }
    
    this.analysisResults.recommendations = recommendations;
    
    console.log('\n💡 Generated Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      console.log(`   Action: ${rec.action}`);
    });
  }

  /**
   * Generate improved syntax rules based on analysis
   */
  generateImprovedRules() {
    console.log('\n🔧 Generating improved syntax rules...');
    
    const baseRules = this.analysisResults.patterns.rules || {};
    const improvedRules = JSON.parse(JSON.stringify(baseRules)); // Deep copy
    
    // Add enhanced step patterns based on analysis
    if (!improvedRules.stepPatterns) {
      improvedRules.stepPatterns = [];
    }
    
    // Add high-confidence patterns from suggestions
    if (this.analysisResults.patterns.bestSuggestions) {
      this.analysisResults.patterns.bestSuggestions.forEach(suggestion => {
        if (suggestion.confidence >= 0.8) {
          // Create regex pattern from examples
          const pattern = this.createPatternFromExamples(suggestion.examples);
          if (pattern) {
            improvedRules.stepPatterns.push({
              pattern: pattern,
              type: suggestion.suggestedGroup,
              confidence: suggestion.confidence,
              frequency: suggestion.frequency,
              description: `Auto-generated from ${suggestion.frequency} examples`,
              examples: suggestion.examples.slice(0, 3)
            });
          }
        }
      });
    }
    
    // Add enhanced variable detection
    if (!improvedRules.variableDetection) {
      improvedRules.variableDetection = {};
    }
    
    // Add hulpmerker patterns (very common in industrial programs)
    if (!improvedRules.variableDetection.hulpmerkerKeywords) {
      improvedRules.variableDetection.hulpmerkerKeywords = [
        'HULP', 'HELP', 'AUX', 'AUXILIARY', 'MARKER', 'FLAG'
      ];
    }
    
    // Add cross-reference patterns
    if (!improvedRules.crossReferencePatterns) {
      improvedRules.crossReferencePatterns = [
        {
          pattern: /(.+?)\s*\(([^)]+)\s+(FB\d+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)/i,
          description: 'FB cross-reference with step numbers',
          confidence: 0.9
        },
        {
          pattern: /(.+?)\s*\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)/i,
          description: 'Simple cross-reference with step numbers',
          confidence: 0.8
        }
      ];
    }
    
    // Add timer patterns
    if (!improvedRules.timerPatterns) {
      improvedRules.timerPatterns = [
        {
          pattern: /(ZEIT|TIME|TIJD)\s+(\d+)(sek|sec|s|min|m|h)\s*\?\?/i,
          description: 'Timer with question marks',
          confidence: 0.9
        },
        {
          pattern: /(ZEIT|TIME|TIJD)\s*\[\s*(\d+)\s*\]\s*=\s*(\d+)(sek|sec|s|min|m|h)/i,
          description: 'Timer array assignment',
          confidence: 0.8
        }
      ];
    }
    
    // Add logical operator patterns
    if (!improvedRules.logicalOperators) {
      improvedRules.logicalOperators = {
        and: ['UND', 'AND', 'EN', '&', '&&'],
        or: ['ODER', 'OR', 'OF', '|', '||'],
        not: ['NICHT', 'NOT', 'NIET', '!']
      };
    }
    
    this.analysisResults.improvedRules = improvedRules;
    
    console.log('✅ Improved syntax rules generated');
    console.log(`📊 Total step patterns: ${improvedRules.stepPatterns.length}`);
    console.log(`📊 Cross-reference patterns: ${improvedRules.crossReferencePatterns.length}`);
    console.log(`📊 Timer patterns: ${improvedRules.timerPatterns.length}`);
    
    return improvedRules;
  }

  /**
   * Create regex pattern from examples
   */
  createPatternFromExamples(examples) {
    if (!examples || examples.length === 0) return null;
    
    // Simple pattern creation - in real implementation, this would be more sophisticated
    const firstExample = examples[0];
    
    // Look for common patterns in hulpmerker assignments
    if (firstExample.includes('=') && !firstExample.includes('(')) {
      return /^([A-Za-z_][A-Za-z0-9_\s]*)\s*=\s*(.*)$/;
    }
    
    // Look for cross-reference patterns
    if (firstExample.includes('(') && firstExample.includes('SCHRITT')) {
      return /^(.+?)\s*\(([^)]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)/i;
    }
    
    return null;
  }

  /**
   * Save analysis results
   */
  saveAnalysisResults() {
    const outputPath = './analysis-results.json';
    writeFileSync(outputPath, JSON.stringify(this.analysisResults, null, 2));
    
    const improvedRulesPath = './improved-syntax-rules.json';
    writeFileSync(improvedRulesPath, JSON.stringify(this.analysisResults.improvedRules, null, 2));
    
    console.log(`\n💾 Analysis results saved to: ${outputPath}`);
    console.log(`💾 Improved syntax rules saved to: ${improvedRulesPath}`);
  }
}

// Main execution
async function main() {
  console.log('🎯 Starting Training Results Analysis...');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const analyzer = new TrainingAnalyzer();
  
  try {
    // Analyze existing results
    const results = analyzer.analyzeExistingResults();
    
    // Generate improved rules
    const improvedRules = analyzer.generateImprovedRules();
    
    // Save results
    analyzer.saveAnalysisResults();
    
    console.log('\n🎉 Analysis Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    
    console.log('\n📋 Summary:');
    console.log(`🎯 Current parsing efficiency: ${(results.accuracy.parsingEfficiency * 100).toFixed(2)}%`);
    console.log(`📊 Total recommendations: ${results.recommendations.length}`);
    console.log(`🔧 Improved pattern count: ${improvedRules.stepPatterns.length}`);
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Review improved-syntax-rules.json');
    console.log('2. Test improved rules with sample data');
    console.log('3. Integrate approved patterns into main parser');
    console.log('4. Run additional training iterations');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}