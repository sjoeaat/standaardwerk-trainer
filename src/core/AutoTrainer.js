// =====================================================================
// src/core/AutoTrainer.js - Automatic Training System
// =====================================================================
// Implements automatic iterative training using parsing suggestions
// to continuously improve syntax rules and validation accuracy
// =====================================================================

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Automatic Training System for iterative syntax rule improvement
 */
export class AutoTrainer {
  constructor(cliParser, options = {}) {
    this.cliParser = cliParser;
    this.options = {
      maxIterations: options.maxIterations || 10,
      minConfidence: options.minConfidence || 0.8,
      convergenceThreshold: options.convergenceThreshold || 0.05,
      backupOriginalRules: options.backupOriginalRules !== false,
      ...options
    };
    
    this.trainingHistory = [];
    this.currentIteration = 0;
    this.converged = false;
  }

  /**
   * Start automatic training process
   */
  async startTraining(inputFiles, outputDir = './training-results') {
    console.log('🎓 Starting automatic training process...');
    console.log(`📁 Input files: ${Array.isArray(inputFiles) ? inputFiles.join(', ') : inputFiles}`);
    console.log(`📊 Max iterations: ${this.options.maxIterations}`);
    console.log(`🎯 Min confidence: ${this.options.minConfidence}`);
    
    // Backup original rules
    if (this.options.backupOriginalRules) {
      this.backupOriginalRules(outputDir);
    }
    
    // Initialize training metrics
    let previousMetrics = null;
    
    // Training loop
    for (let iteration = 1; iteration <= this.options.maxIterations; iteration++) {
      this.currentIteration = iteration;
      
      console.log(`\n🔄 === Training Iteration ${iteration} ===`);
      
      // Parse files with current rules
      const results = await this.parseFiles(inputFiles, outputDir, iteration);
      
      // Calculate metrics
      const metrics = this.calculateTrainingMetrics(results);
      console.log(`📊 Iteration ${iteration} metrics:`, metrics);
      
      // Check convergence
      if (previousMetrics && this.hasConverged(previousMetrics, metrics)) {
        console.log(`✅ Training converged after ${iteration} iterations`);
        this.converged = true;
        break;
      }
      
      // Extract high-confidence suggestions
      const suggestions = this.extractHighConfidenceSuggestions(results);
      
      if (suggestions.length === 0) {
        console.log(`⚠️  No high-confidence suggestions found. Stopping at iteration ${iteration}`);
        break;
      }
      
      // Apply suggestions to syntax rules
      const appliedCount = await this.applySuggestions(suggestions, outputDir, iteration);
      console.log(`🔧 Applied ${appliedCount} suggestions to syntax rules`);
      
      // Store iteration results
      this.trainingHistory.push({
        iteration,
        metrics,
        suggestions,
        appliedCount,
        timestamp: new Date().toISOString()
      });
      
      previousMetrics = metrics;
      
      // Short delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate final training report
    const finalReport = await this.generateTrainingReport(outputDir);
    console.log(`📋 Training completed. Final report: ${finalReport}`);
    
    return {
      totalIterations: this.currentIteration,
      converged: this.converged,
      finalMetrics: previousMetrics || {},
      trainingHistory: this.trainingHistory,
      reportPath: finalReport
    };
  }

  /**
   * Parse files with current syntax rules
   */
  async parseFiles(inputFiles, outputDir, iteration) {
    const iterationDir = join(outputDir, `iteration-${iteration}`);
    const files = Array.isArray(inputFiles) ? inputFiles : [inputFiles];
    const results = [];
    
    for (const file of files) {
      console.log(`📄 Parsing ${file}...`);
      
      // Reset CLI parser state for this iteration
      this.cliParser.processedFiles = [];
      this.cliParser.pendingSuggestions = [];
      this.cliParser.metrics = {
        totalFiles: 0,
        totalSteps: 0,
        totalVariables: 0,
        totalErrors: 0,
        totalWarnings: 0,
        unknownPatterns: 0,
        processingTime: 0
      };
      
      const parseResult = await this.cliParser.parseFile(file);
      
      results.push({
        filename: file,
        metrics: { ...this.cliParser.metrics },
        suggestions: parseResult.suggestions || [],
        processedFiles: [parseResult],
        parseResult: parseResult
      });
    }
    
    return results;
  }

  /**
   * Calculate training metrics for convergence detection
   */
  calculateTrainingMetrics(results) {
    const totalFiles = results.length;
    const totalSteps = results.reduce((sum, r) => sum + (r.parseResult?.steps?.length || 0), 0);
    const totalVariables = results.reduce((sum, r) => sum + (r.parseResult?.variables?.length || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.parseResult?.errors?.length || 0), 0);
    const totalWarnings = results.reduce((sum, r) => sum + (r.parseResult?.warnings?.length || 0), 0);
    const totalUnknownPatterns = results.reduce((sum, r) => sum + (r.parseResult?.unknownPatterns?.length || 0), 0);
    const totalSuggestions = results.reduce((sum, r) => sum + (r.parseResult?.suggestions?.length || 0), 0);
    
    // Calculate quality metrics
    const errorRate = totalSteps > 0 ? totalErrors / totalSteps : 0;
    const warningRate = totalSteps > 0 ? totalWarnings / totalSteps : 0;
    const unknownPatternRate = totalUnknownPatterns > 0 ? totalUnknownPatterns / (totalSteps + totalVariables) : 0;
    const parsingEfficiency = totalSteps > 0 ? (totalSteps + totalVariables) / (totalSteps + totalVariables + totalUnknownPatterns) : 0;
    
    return {
      totalFiles,
      totalSteps,
      totalVariables,
      totalErrors,
      totalWarnings,
      totalUnknownPatterns,
      totalSuggestions,
      errorRate,
      warningRate,
      unknownPatternRate,
      parsingEfficiency
    };
  }

  /**
   * Check if training has converged
   */
  hasConverged(previousMetrics, currentMetrics) {
    const efficiencyImprovement = currentMetrics.parsingEfficiency - previousMetrics.parsingEfficiency;
    const errorReduction = previousMetrics.errorRate - currentMetrics.errorRate;
    const unknownPatternReduction = previousMetrics.unknownPatternRate - currentMetrics.unknownPatternRate;
    
    console.log(`🔍 Convergence check: efficiency +${efficiencyImprovement.toFixed(4)}, errors -${errorReduction.toFixed(4)}, unknowns -${unknownPatternReduction.toFixed(4)}`);
    
    // Consider converged if improvements are below threshold
    return Math.abs(efficiencyImprovement) < this.options.convergenceThreshold &&
           Math.abs(errorReduction) < this.options.convergenceThreshold &&
           Math.abs(unknownPatternReduction) < this.options.convergenceThreshold;
  }

  /**
   * Extract high-confidence suggestions from parsing results
   */
  extractHighConfidenceSuggestions(results) {
    const allSuggestions = results.flatMap(r => r.parseResult?.suggestions || []);
    
    // Filter by confidence threshold
    const highConfidenceSuggestions = allSuggestions.filter(s => 
      s.confidence >= this.options.minConfidence
    );
    
    // Group similar suggestions
    const groupedSuggestions = this.groupSimilarSuggestions(highConfidenceSuggestions);
    
    // Sort by confidence and frequency
    return groupedSuggestions
      .sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency))
      .slice(0, 10); // Limit to top 10 suggestions per iteration
  }

  /**
   * Group similar suggestions together
   */
  groupSimilarSuggestions(suggestions) {
    const groups = new Map();
    
    suggestions.forEach(suggestion => {
      const key = `${suggestion.type || suggestion.suggestedGroup}-${suggestion.potentialType || suggestion.type}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          ...suggestion,
          frequency: 1,
          examples: [suggestion.pattern || suggestion.originalLine]
        });
      } else {
        const group = groups.get(key);
        group.frequency++;
        group.confidence = Math.max(group.confidence, suggestion.confidence);
        if (group.examples.length < 5) {
          group.examples.push(suggestion.pattern || suggestion.originalLine);
        }
      }
    });
    
    return Array.from(groups.values());
  }

  /**
   * Apply suggestions to syntax rules
   */
  async applySuggestions(suggestions, outputDir, iteration) {
    let appliedCount = 0;
    
    // Load current syntax rules
    const currentRules = { ...this.cliParser.syntaxRules };
    const currentValidationRules = this.cliParser.validationRules ? { ...this.cliParser.validationRules } : {};
    
    for (const suggestion of suggestions) {
      if (this.shouldApplySuggestion(suggestion)) {
        // Apply suggestion based on type
        const suggestionType = suggestion.type || suggestion.suggestedGroup;
        const displayText = suggestion.pattern || suggestion.originalLine || suggestion.suggestion || 'Unknown';
        console.log(`🔧 Applying suggestion: ${suggestionType} - ${displayText.substring(0, 50)}...`);
        
        if (suggestionType === 'cross_reference') {
          this.applyCrossReferenceSuggestion(currentRules, suggestion);
        } else if (suggestionType === 'variable_assignment') {
          this.applyVariableSuggestion(currentValidationRules, suggestion);
        } else if (suggestionType === 'condition') {
          this.applyConditionSuggestion(currentRules, suggestion);
        } else if (suggestionType === 'schritt') {
          this.applySCHRITTSuggestion(currentRules, suggestion);
        }
        
        appliedCount++;
      }
    }
    
    // Update CLI parser rules
    this.cliParser.syntaxRules = currentRules;
    if (this.cliParser.validationRules) {
      this.cliParser.validationRules = currentValidationRules;
    }
    if (this.cliParser.parser) {
      this.cliParser.parser.syntaxRules = currentRules;
      if (this.cliParser.parser.validationRules) {
        this.cliParser.parser.validationRules = currentValidationRules;
      }
    }
    
    // Save updated rules
    await this.saveUpdatedRules(currentRules, currentValidationRules, outputDir, iteration);
    
    return appliedCount;
  }

  /**
   * Determine if a suggestion should be applied
   */
  shouldApplySuggestion(suggestion) {
    // Apply suggestions with high confidence and frequency
    return suggestion.confidence >= this.options.minConfidence && 
           suggestion.frequency >= 2;
  }

  /**
   * Apply SCHRITT-related suggestions
   */
  applySCHRITTSuggestion(rules, suggestion) {
    // Add or enhance step detection patterns
    if (!rules.stepPatterns) {
      rules.stepPatterns = [];
    }
    
    // Add pattern for step detection
    const newPattern = {
      pattern: suggestion.suggestedRegex || suggestion.pattern,
      description: `Auto-learned from ${suggestion.frequency} examples`,
      confidence: suggestion.confidence,
      examples: suggestion.examples
    };
    
    rules.stepPatterns.push(newPattern);
  }

  /**
   * Apply variable-related suggestions
   */
  applyVariableSuggestion(validationRules, suggestion) {
    // Enhance variable detection patterns
    if (!validationRules.groups.autoLearned) {
      validationRules.groups.autoLearned = {
        name: "AutoLearned",
        description: "Automatically learned patterns",
        patterns: [],
        implementation: {
          type: "coil",
          dataType: "Bool",
          arrayName: "AutoLearned",
          arrayRange: [1, 50]
        },
        validation: {
          requiresConditions: false,
          allowsSetResetTable: true,
          maxConditions: 10
        }
      };
    }
    
    // Add new pattern
    const regexPattern = new RegExp(suggestion.suggestedRegex || suggestion.pattern);
    validationRules.groups.autoLearned.patterns.push(regexPattern);
  }

  /**
   * Apply condition-related suggestions
   */
  applyConditionSuggestion(rules, suggestion) {
    // Enhance condition detection
    if (!rules.conditionPatterns) {
      rules.conditionPatterns = [];
    }
    
    const newPattern = {
      pattern: suggestion.suggestedRegex || suggestion.pattern,
      type: suggestion.potentialType || suggestion.type,
      confidence: suggestion.confidence
    };
    
    rules.conditionPatterns.push(newPattern);
  }

  /**
   * Apply cross-reference suggestions
   */
  applyCrossReferenceSuggestion(rules, suggestion) {
    // Add cross-reference patterns
    if (!rules.crossReferencePatterns) {
      rules.crossReferencePatterns = [];
    }
    
    const newPattern = {
      pattern: suggestion.suggestedRegex || suggestion.pattern,
      description: `Auto-learned cross-reference from ${suggestion.frequency || 1} examples`,
      confidence: suggestion.confidence,
      examples: suggestion.examples
    };
    
    rules.crossReferencePatterns.push(newPattern);
  }

  /**
   * Save updated rules to files
   */
  async saveUpdatedRules(syntaxRules, validationRules, outputDir, iteration) {
    const rulesDir = join(outputDir, `iteration-${iteration}`);
    
    // Ensure rules directory exists
    mkdirSync(rulesDir, { recursive: true });
    
    // Save syntax rules
    writeFileSync(
      join(rulesDir, 'updated-syntax-rules.json'),
      JSON.stringify(syntaxRules, null, 2)
    );
    
    // Save validation rules
    writeFileSync(
      join(rulesDir, 'updated-validation-rules.json'),
      JSON.stringify(validationRules, null, 2)
    );
    
    console.log(`💾 Updated rules saved to ${rulesDir}`);
  }

  /**
   * Backup original rules
   */
  backupOriginalRules(outputDir) {
    const backupDir = join(outputDir, 'original-rules');
    
    // Ensure backup directory exists
    mkdirSync(backupDir, { recursive: true });
    
    writeFileSync(
      join(backupDir, 'original-syntax-rules.json'),
      JSON.stringify(this.cliParser.syntaxRules, null, 2)
    );
    
    if (this.cliParser.validationRules) {
      writeFileSync(
        join(backupDir, 'original-validation-rules.json'),
        JSON.stringify(this.cliParser.validationRules, null, 2)
      );
    }
    
    console.log(`💾 Original rules backed up to ${backupDir}`);
  }

  /**
   * Generate comprehensive training report
   */
  async generateTrainingReport(outputDir) {
    const reportPath = join(outputDir, 'training-report.json');
    
    const report = {
      summary: {
        totalIterations: this.currentIteration,
        converged: this.converged,
        maxIterations: this.options.maxIterations,
        minConfidence: this.options.minConfidence,
        convergenceThreshold: this.options.convergenceThreshold,
        trainingStarted: this.trainingHistory[0]?.timestamp,
        trainingCompleted: new Date().toISOString()
      },
      
      progressMetrics: this.trainingHistory.map(h => ({
        iteration: h.iteration,
        metrics: h.metrics,
        appliedSuggestions: h.appliedCount,
        timestamp: h.timestamp
      })),
      
      finalMetrics: this.trainingHistory[this.trainingHistory.length - 1]?.metrics,
      
      improvementSummary: this.calculateImprovementSummary(),
      
      bestSuggestions: this.getBestSuggestions(),
      
      recommendations: this.generateRecommendations()
    };
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }

  /**
   * Calculate improvement summary
   */
  calculateImprovementSummary() {
    if (this.trainingHistory.length < 2) return {};
    
    const first = this.trainingHistory[0].metrics;
    const last = this.trainingHistory[this.trainingHistory.length - 1].metrics;
    
    return {
      parsingEfficiencyImprovement: last.parsingEfficiency - first.parsingEfficiency,
      errorRateReduction: first.errorRate - last.errorRate,
      unknownPatternReduction: first.unknownPatternRate - last.unknownPatternRate,
      totalSuggestionsApplied: this.trainingHistory.reduce((sum, h) => sum + h.appliedCount, 0)
    };
  }

  /**
   * Get best suggestions across all iterations
   */
  getBestSuggestions() {
    const allSuggestions = this.trainingHistory.flatMap(h => h.suggestions);
    
    return allSuggestions
      .sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency))
      .slice(0, 20)
      .map(s => ({
        suggestedGroup: s.type || s.suggestedGroup,
        confidence: s.confidence,
        frequency: s.frequency,
        examples: s.examples ? s.examples.slice(0, 3) : []
      }));
  }

  /**
   * Generate recommendations for further improvement
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.converged) {
      recommendations.push({
        type: 'convergence',
        message: 'Training did not converge. Consider increasing max iterations or adjusting convergence threshold.',
        priority: 'high'
      });
    }
    
    const finalMetrics = this.trainingHistory[this.trainingHistory.length - 1]?.metrics;
    
    if (finalMetrics?.errorRate > 0.1) {
      recommendations.push({
        type: 'error_rate',
        message: 'High error rate detected. Consider manual review of validation rules.',
        priority: 'medium'
      });
    }
    
    if (finalMetrics?.unknownPatternRate > 0.2) {
      recommendations.push({
        type: 'unknown_patterns',
        message: 'Many unknown patterns remain. Consider expanding training data or manual rule creation.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Reset training state
   */
  reset() {
    this.trainingHistory = [];
    this.currentIteration = 0;
    this.converged = false;
  }
}

export default AutoTrainer;