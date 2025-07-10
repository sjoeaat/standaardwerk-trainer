// =====================================================================
// src/core/PatternGenerator.js - Automatic Pattern Generation
// =====================================================================
// Generates regex patterns from training data for improved recognition
// of variables and conditions during parsing
// =====================================================================

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Automatic Pattern Generation System
 * Learns regex patterns from labeled training data
 */
export class PatternGenerator {
  constructor(options = {}) {
    this.options = {
      minFrequency: options.minFrequency || 3,
      minPrecision: options.minPrecision || 0.7,
      minRecall: options.minRecall || 0.7,
      maxPatterns: options.maxPatterns || 5,
      ngramSize: options.ngramSize || 3,
      ...options,
    };
    
    this.trainingData = new Map(); // groupType -> [{text, type, ...}]
    this.generatedPatterns = new Map(); // groupType -> [patterns]
    this.patternStats = new Map(); // pattern -> {precision, recall, frequency}
  }

  /**
   * Load training data from AutoTrainer results
   */
  loadTrainingData(trainingResults) {
    console.log('📚 Loading training data for pattern generation...');
    
    this.trainingData.clear();
    
    // Process suggestions from training results
    trainingResults.forEach(result => {
      if (result.suggestions) {
        result.suggestions.forEach(suggestion => {
          const groupType = suggestion.suggestedGroup;
          
          if (!this.trainingData.has(groupType)) {
            this.trainingData.set(groupType, []);
          }
          
          // Add each example as training data
          suggestion.examples.forEach(example => {
            this.trainingData.get(groupType).push({
              text: example,
              type: suggestion.potentialType,
              confidence: suggestion.confidence,
              frequency: suggestion.frequency,
            });
          });
        });
      }
    });
    
    console.log(`📊 Loaded training data for ${this.trainingData.size} group types`);
    this.trainingData.forEach((data, groupType) => {
      console.log(`  ${groupType}: ${data.length} examples`);
    });
  }

  /**
   * Generate patterns for all group types
   */
  async generateAllPatterns() {
    console.log('🔧 Generating patterns for all group types...');
    
    this.generatedPatterns.clear();
    
    for (const [groupType, examples] of this.trainingData) {
      console.log(`\n🎯 Processing group: ${groupType}`);
      const patterns = await this.generatePatternsForGroup(groupType, examples);
      this.generatedPatterns.set(groupType, patterns);
    }
    
    return this.generatedPatterns;
  }

  /**
   * Generate patterns for a specific group type
   */
  async generatePatternsForGroup(groupType, examples) {
    if (examples.length < this.options.minFrequency) {
      console.log(`⚠️  Not enough examples for ${groupType} (${examples.length} < ${this.options.minFrequency})`);
      return [];
    }
    
    console.log(`📝 Generating patterns for ${groupType} (${examples.length} examples)`);
    
    const candidatePatterns = [];
    
    // 1. Generate frequency-based patterns
    const freqPatterns = this.generateFrequencyPatterns(examples);
    candidatePatterns.push(...freqPatterns);
    
    // 2. Generate n-gram patterns
    const ngramPatterns = this.generateNGramPatterns(examples);
    candidatePatterns.push(...ngramPatterns);
    
    // 3. Generate structure-based patterns
    const structurePatterns = this.generateStructurePatterns(examples);
    candidatePatterns.push(...structurePatterns);
    
    // 4. Score and filter patterns
    const scoredPatterns = this.scorePatterns(candidatePatterns, examples);
    const filteredPatterns = this.filterPatterns(scoredPatterns);
    
    console.log(`✅ Generated ${filteredPatterns.length} patterns for ${groupType}`);
    
    return filteredPatterns;
  }

  /**
   * Generate patterns based on word frequency
   */
  generateFrequencyPatterns(examples) {
    const patterns = [];
    
    // Count word frequencies
    const wordFreq = new Map();
    examples.forEach(example => {
      const words = example.text.toLowerCase().match(/\\b\\w+\\b/g) || [];
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });
    
    // Generate patterns for frequent words
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedWords.forEach(([word, freq]) => {
      if (freq >= this.options.minFrequency) {
        // Word at start
        patterns.push({
          pattern: `^${this.escapeRegex(word)}\\\\b`,
          description: `Starts with "${word}"`,
          type: 'frequency_start',
          sourceWord: word,
          frequency: freq,
        });
        
        // Word anywhere
        patterns.push({
          pattern: `\\\\b${this.escapeRegex(word)}\\\\b`,
          description: `Contains "${word}"`,
          type: 'frequency_contains',
          sourceWord: word,
          frequency: freq,
        });
      }
    });
    
    return patterns;
  }

  /**
   * Generate patterns based on n-grams
   */
  generateNGramPatterns(examples) {
    const patterns = [];
    const ngramFreq = new Map();
    
    examples.forEach(example => {
      const text = example.text.toLowerCase();
      
      // Generate character n-grams
      for (let i = 0; i <= text.length - this.options.ngramSize; i++) {
        const ngram = text.substr(i, this.options.ngramSize);
        if (ngram.match(/[a-z]/)) { // Only if contains letters
          ngramFreq.set(ngram, (ngramFreq.get(ngram) || 0) + 1);
        }
      }
    });
    
    // Generate patterns for frequent n-grams
    const sortedNgrams = Array.from(ngramFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    sortedNgrams.forEach(([ngram, freq]) => {
      if (freq >= this.options.minFrequency) {
        patterns.push({
          pattern: this.escapeRegex(ngram),
          description: `Contains n-gram "${ngram}"`,
          type: 'ngram',
          sourceNgram: ngram,
          frequency: freq,
        });
      }
    });
    
    return patterns;
  }

  /**
   * Generate patterns based on structural analysis
   */
  generateStructurePatterns(examples) {
    const patterns = [];
    
    // Analyze common structures
    const structures = {
      'technical_code': /^[A-Z0-9]{2,}\\s+/,
      'equals_suffix': /\\s*=\\s*$/,
      'number_prefix': /^\\d+/,
      'parentheses': /\\([^)]+\\)/,
      'german_compound': /[a-zA-Z]+[a-zA-Z]+/,
      'mixed_case': /[a-z][A-Z]/,
    };
    
    Object.entries(structures).forEach(([structType, regex]) => {
      const matchingExamples = examples.filter(ex => regex.test(ex.text));
      
      if (matchingExamples.length >= this.options.minFrequency) {
        patterns.push({
          pattern: regex.source,
          description: `${structType} structure`,
          type: 'structure',
          structureType: structType,
          frequency: matchingExamples.length,
        });
      }
    });
    
    // Generate patterns for specific formats
    const formatPatterns = this.generateFormatPatterns(examples);
    patterns.push(...formatPatterns);
    
    return patterns;
  }

  /**
   * Generate patterns for specific formats
   */
  generateFormatPatterns(examples) {
    const patterns = [];
    
    // Pattern for technical codes like "2MP62 Störung"
    const techCodeMatches = examples.filter(ex => 
      /^[A-Z0-9]{2,}\\s+\\w+/.test(ex.text),
    );
    
    if (techCodeMatches.length >= this.options.minFrequency) {
      patterns.push({
        pattern: '^[A-Z0-9]{2,}\\\\s+\\\\w+',
        description: 'Technical code format (CODE WORD)',
        type: 'format',
        formatType: 'technical_code',
        frequency: techCodeMatches.length,
      });
    }
    
    // Pattern for "Freigabe von X" structure
    const freigabeMatches = examples.filter(ex => 
      /freigabe\\s+\\w+/i.test(ex.text),
    );
    
    if (freigabeMatches.length >= this.options.minFrequency) {
      patterns.push({
        pattern: '\\\\b(freigabe|release)\\\\s+\\\\w+',
        description: 'Freigabe structure',
        type: 'format',
        formatType: 'freigabe',
        frequency: freigabeMatches.length,
      });
    }
    
    return patterns;
  }

  /**
   * Score patterns based on precision and recall
   */
  scorePatterns(candidatePatterns, examples) {
    const scoredPatterns = [];
    
    candidatePatterns.forEach(candidate => {
      const regex = new RegExp(candidate.pattern, 'i');
      
      // Calculate precision and recall
      const matches = examples.filter(ex => regex.test(ex.text));
      const precision = matches.length > 0 ? matches.length / examples.length : 0;
      const recall = matches.length > 0 ? matches.length / candidate.frequency : 0;
      
      // F1 score
      const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      
      scoredPatterns.push({
        ...candidate,
        precision,
        recall,
        f1Score,
        matches: matches.length,
      });
      
      this.patternStats.set(candidate.pattern, {
        precision,
        recall,
        f1Score,
        frequency: candidate.frequency,
      });
    });
    
    return scoredPatterns;
  }

  /**
   * Filter patterns based on quality metrics
   */
  filterPatterns(scoredPatterns) {
    return scoredPatterns
      .filter(pattern => 
        pattern.precision >= this.options.minPrecision &&
        pattern.recall >= this.options.minRecall &&
        pattern.frequency >= this.options.minFrequency,
      )
      .sort((a, b) => b.f1Score - a.f1Score)
      .slice(0, this.options.maxPatterns);
  }

  /**
   * Export patterns to validation-config.json format
   */
  exportToValidationConfig(outputPath) {
    const validationConfig = {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      patternGenerationOptions: this.options,
      validationRules: {
        groups: {},
      },
    };
    
    // Convert generated patterns to validation config format
    this.generatedPatterns.forEach((patterns, groupType) => {
      validationConfig.validationRules.groups[groupType] = {
        name: this.capitalizeFirst(groupType),
        description: `Auto-generated patterns for ${groupType}`,
        patterns: patterns.map(p => ({
          pattern: p.pattern,
          description: p.description,
          type: p.type,
          precision: p.precision,
          recall: p.recall,
          f1Score: p.f1Score,
          frequency: p.frequency,
        })),
      };
    });
    
    // Write to file
    writeFileSync(outputPath, JSON.stringify(validationConfig, null, 2));
    console.log(`💾 Validation config exported to ${outputPath}`);
    
    return validationConfig;
  }

  /**
   * Generate comprehensive pattern report
   */
  generatePatternReport(outputPath) {
    const report = {
      summary: {
        totalGroups: this.generatedPatterns.size,
        totalPatterns: Array.from(this.generatedPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0),
        averagePrecision: this.calculateAveragePrecision(),
        averageRecall: this.calculateAverageRecall(),
        generatedAt: new Date().toISOString(),
      },
      
      groupSummary: {},
      
      patternDetails: {},
      
      recommendations: this.generatePatternRecommendations(),
    };
    
    // Generate group summaries
    this.generatedPatterns.forEach((patterns, groupType) => {
      report.groupSummary[groupType] = {
        totalPatterns: patterns.length,
        averageF1Score: patterns.reduce((sum, p) => sum + p.f1Score, 0) / patterns.length,
        bestPattern: patterns[0]?.pattern || null,
        totalExamples: this.trainingData.get(groupType)?.length || 0,
      };
      
      report.patternDetails[groupType] = patterns.map(p => ({
        pattern: p.pattern,
        description: p.description,
        precision: p.precision,
        recall: p.recall,
        f1Score: p.f1Score,
        frequency: p.frequency,
        type: p.type,
      }));
    });
    
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`📊 Pattern report generated: ${outputPath}`);
    
    return report;
  }

  /**
   * Calculate average precision across all patterns
   */
  calculateAveragePrecision() {
    const allPatterns = Array.from(this.generatedPatterns.values()).flat();
    if (allPatterns.length === 0) return 0;
    
    return allPatterns.reduce((sum, p) => sum + p.precision, 0) / allPatterns.length;
  }

  /**
   * Calculate average recall across all patterns
   */
  calculateAverageRecall() {
    const allPatterns = Array.from(this.generatedPatterns.values()).flat();
    if (allPatterns.length === 0) return 0;
    
    return allPatterns.reduce((sum, p) => sum + p.recall, 0) / allPatterns.length;
  }

  /**
   * Generate recommendations for pattern improvement
   */
  generatePatternRecommendations() {
    const recommendations = [];
    
    // Check for groups with low pattern count
    this.generatedPatterns.forEach((patterns, groupType) => {
      if (patterns.length < 2) {
        recommendations.push({
          type: 'low_pattern_count',
          groupType,
          message: `Only ${patterns.length} patterns generated for ${groupType}. Consider adding more training data.`,
          priority: 'medium',
        });
      }
    });
    
    // Check for groups with low precision
    this.generatedPatterns.forEach((patterns, groupType) => {
      const avgPrecision = patterns.reduce((sum, p) => sum + p.precision, 0) / patterns.length;
      if (avgPrecision < 0.8) {
        recommendations.push({
          type: 'low_precision',
          groupType,
          message: `Average precision for ${groupType} is ${avgPrecision.toFixed(2)}. Consider refining patterns.`,
          priority: 'high',
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}

export default PatternGenerator;