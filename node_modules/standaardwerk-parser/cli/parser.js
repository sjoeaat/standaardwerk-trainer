#!/usr/bin/env node

// =====================================================================
// cli-parser.js - Lightweight CLI Parser & Syntax Evaluator
// =====================================================================
// Standalone CLI tool for parsing Word documents with step programs
// and evaluating against syntax rules with learning capabilities
// =====================================================================

import { readFileSync, writeFileSync, existsSync, lstatSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { UnifiedTextParser } from '../src/UnifiedTextParser.js';
import { FlexibleParser } from '../src/FlexibleParser.js';
import { AdvancedParser } from '../src/AdvancedParser.js';
import { defaultSyntaxRules } from '../src/config/syntaxRules.js';
import { DEFAULT_VALIDATION_RULES } from '../src/config/validationRules.js';
import { DocxParser } from '../src/DocxParser.js';
import { AutoTrainer } from '../src/AutoTrainer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * CLI Parser Class - Main application logic
 */
class CLIParser {
  constructor(parserType = 'flexible') {
    this.syntaxRules = defaultSyntaxRules;
    this.validationRules = DEFAULT_VALIDATION_RULES;
    
    // Initialize parser based on type
    if (parserType === 'advanced') {
      this.parser = new AdvancedParser(this.syntaxRules, this.validationRules);
    } else if (parserType === 'flexible') {
      this.parser = new FlexibleParser(this.syntaxRules, this.validationRules);
    } else {
      this.parser = new UnifiedTextParser(this.syntaxRules, this.validationRules);
    }
    
    this.processedFiles = [];
    this.trainingData = [];
    this.pendingSuggestions = [];
    this.metrics = {
      totalFiles: 0,
      totalSteps: 0,
      totalVariables: 0,
      totalErrors: 0,
      totalWarnings: 0,
      unknownPatterns: 0,
      processingTime: 0,
    };
  }

  /**
   * Main entry point
   */
  async main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.printUsage();
      process.exit(1);
    }

    const command = args[0];
    
    try {
      switch (command) {
      case 'parse':
        await this.parseCommand(args.slice(1));
        break;
      case 'validate':
        await this.validateCommand(args.slice(1));
        break;
      case 'train':
        await this.trainCommand(args.slice(1));
        break;
      case 'test':
        await this.testCommand(args.slice(1));
        break;
      case 'auto-train':
        await this.autoTrainCommand(args.slice(1));
        break;
      case 'help':
        this.printUsage();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        this.printUsage();
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Parse command - Parse single or multiple files
   */
  async parseCommand(args) {
    const inputPath = args[0];
    const outputDir = args[1] || './output';
    
    if (!inputPath) {
      console.error('Usage: cli-parser parse <input-file-or-directory> [output-directory]');
      process.exit(1);
    }

    const startTime = Date.now();
    
    console.log('🚀 Starting CLI Parser...');
    console.log(`📄 Input: ${inputPath}`);
    console.log(`📁 Output: ${outputDir}`);
    
    // Determine if input is file or directory
    const isDirectory = existsSync(inputPath) && lstatSync(inputPath).isDirectory();
    
    if (isDirectory) {
      await this.parseDirectory(inputPath, outputDir);
    } else {
      await this.parseFile(inputPath, outputDir);
    }
    
    this.metrics.processingTime = Date.now() - startTime;
    
    // Generate reports
    await this.generateReports(outputDir);
    
    console.log('✅ Parsing completed successfully!');
    console.log(`📊 Processed: ${this.metrics.totalFiles} files, ${this.metrics.totalSteps} steps, ${this.metrics.totalVariables} variables`);
    console.log(`⚠️  Errors: ${this.metrics.totalErrors}, Warnings: ${this.metrics.totalWarnings}`);
    console.log(`🎯 Unknown patterns: ${this.metrics.unknownPatterns}`);
    console.log(`⏱️  Processing time: ${this.metrics.processingTime}ms`);
  }

  /**
   * Parse single file
   */
  async parseFile(filePath, outputDir) {
    console.log(`📄 Parsing file: ${filePath}`);
    
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read file content (now handles both DOCX and text)
    const fileData = await this.readFileContent(filePath);
    const source = this.determineSource(filePath);
    
    // Parse with unified parser
    const result = this.parser.parse(fileData.content, source, {
      filename: basename(filePath),
      filepath: filePath,
      ...fileData.metadata,
    });

    // Update metrics
    this.updateMetrics(result);
    
    // Store for training (include original file metadata)
    this.processedFiles.push({
      filename: basename(filePath),
      filepath: filePath,
      result: result,
      originalMetadata: fileData.metadata,
    });
    
    // Analyze for unknown patterns
    await this.analyzeUnknownPatterns(result, fileData.content);
    
    // Write individual outputs
    await this.writeFileOutputs(result, filePath, outputDir, fileData.metadata);
  }

  /**
   * Parse directory
   */
  async parseDirectory(dirPath, outputDir) {
    console.log(`📁 Parsing directory: ${dirPath}`);
    
    const files = readdirSync(dirPath);
    const supportedExtensions = ['.docx', '.txt', '.md'];
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      const ext = extname(file).toLowerCase();
      
      if (supportedExtensions.includes(ext)) {
        await this.parseFile(filePath, outputDir);
      }
    }
  }

  /**
   * Read file content based on extension
   */
  async readFileContent(filePath) {
    const ext = extname(filePath).toLowerCase();
    
    if (ext === '.docx') {
      console.log('📄 Processing DOCX file with formatting preservation...');
      const docxParser = new DocxParser();
      const result = await docxParser.parseDocxFile(filePath);
      
      // Return normalized text that preserves formatting markers
      return {
        content: result.normalizedText,
        metadata: {
          source: 'docx',
          structuredContent: result.structuredContent,
          rawText: result.rawText,
          html: result.html,
        },
      };
    }
    
    // For text files, return simple string
    return {
      content: readFileSync(filePath, 'utf8'),
      metadata: {
        source: 'text',
      },
    };
  }

  /**
   * Determine source type
   */
  determineSource(filePath) {
    const ext = extname(filePath).toLowerCase();
    return ext === '.docx' ? 'word' : 'manual';
  }

  /**
   * Update metrics
   */
  updateMetrics(result) {
    this.metrics.totalFiles++;
    this.metrics.totalSteps += result.steps.length;
    this.metrics.totalVariables += result.variables.length;
    this.metrics.totalErrors += result.errors.length;
    this.metrics.totalWarnings += result.warnings.length;
  }

  /**
   * Analyze unknown patterns for training
   */
  async analyzeUnknownPatterns(result, originalContent) {
    const lines = originalContent.split('\n');
    const processedLines = new Set();
    
    // Track which lines were successfully parsed
    if (result.steps && result.steps.length > 0) {
      result.steps.forEach(step => {
        if (step.lineNumber) processedLines.add(step.lineNumber);
      });
    }
    
    if (result.variables && result.variables.length > 0) {
      result.variables.forEach(variable => {
        if (variable.lineNumber) processedLines.add(variable.lineNumber);
      });
    }

    // Find unprocessed lines that might be unknown patterns
    const unknownLines = [];
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const content = line.trim();
      
      if (content && !processedLines.has(lineNumber) && !this.isComment(content)) {
        unknownLines.push({
          lineNumber,
          content,
          analysis: this.analyzeUnknownLine(content),
        });
      }
    });

    if (unknownLines.length > 0) {
      console.log(`🔍 Found ${unknownLines.length} unknown patterns`);
      this.metrics.unknownPatterns += unknownLines.length;
      
      // Generate suggestions
      for (const unknownLine of unknownLines) {
        const suggestion = await this.generateSyntaxSuggestion(unknownLine);
        if (suggestion) {
          this.pendingSuggestions.push(suggestion);
        }
      }
    }
  }

  /**
   * Check if line is a comment
   */
  isComment(content) {
    return content.startsWith('//') || content.startsWith('#') || content.startsWith('*');
  }

  /**
   * Analyze unknown line
   */
  analyzeUnknownLine(content) {
    const analysis = {
      hasNumbers: /\d/.test(content),
      hasColon: content.includes(':'),
      hasEquals: content.includes('='),
      hasParentheses: /\([^)]*\)/.test(content),
      hasKeywords: false,
      potentialType: 'unknown',
    };

    // Check for known keywords
    const keywords = ['SCHRITT', 'STAP', 'STEP', 'RUST', 'RUHE', 'IDLE', 'TIJD', 'TIME', 'ZEIT'];
    analysis.hasKeywords = keywords.some(keyword => 
      content.toUpperCase().includes(keyword.toUpperCase()),
    );

    // Determine potential type
    if (analysis.hasEquals && !analysis.hasColon) {
      analysis.potentialType = 'variable';
    } else if (analysis.hasColon && analysis.hasNumbers) {
      analysis.potentialType = 'step';
    } else if (content.startsWith('-') || content.startsWith('+')) {
      analysis.potentialType = 'condition';
    } else if (analysis.hasParentheses && analysis.hasKeywords) {
      analysis.potentialType = 'cross_reference';
    }

    return analysis;
  }

  /**
   * Generate syntax suggestion for unknown pattern
   */
  async generateSyntaxSuggestion(unknownLine) {
    const { content, analysis } = unknownLine;
    
    const suggestion = {
      originalLine: content,
      lineNumber: unknownLine.lineNumber,
      analysis: analysis,
      suggestedRegex: null,
      suggestedGroup: null,
      confidence: 0,
      reasoning: [],
    };

    // Generate suggestions based on analysis
    if (analysis.potentialType === 'variable') {
      suggestion.suggestedRegex = '/^([^=]+)\\s*=\\s*(.*)$/';
      suggestion.suggestedGroup = 'hulpmerker';
      suggestion.confidence = 0.8;
      suggestion.reasoning.push('Contains equals sign, likely variable assignment');
    } else if (analysis.potentialType === 'step') {
      suggestion.suggestedRegex = '/^(\\w+)\\s+(\\d+)\\s*:\\s*(.*)$/';
      suggestion.suggestedGroup = 'schritt';
      suggestion.confidence = 0.7;
      suggestion.reasoning.push('Contains colon and number, likely step declaration');
    } else if (analysis.potentialType === 'condition') {
      suggestion.suggestedRegex = '/^[+-]\\s*(.*)$/';
      suggestion.suggestedGroup = 'condition';
      suggestion.confidence = 0.6;
      suggestion.reasoning.push('Starts with +/-, likely condition');
    } else if (analysis.potentialType === 'cross_reference') {
      suggestion.suggestedRegex = '/\\(([^)]+)\\s+(SCHRITT|STAP|STEP)\\s+([0-9+]+)\\)/';
      suggestion.suggestedGroup = 'cross_reference';
      suggestion.confidence = 0.9;
      suggestion.reasoning.push('Contains parentheses and step keywords, likely cross-reference');
    }

    // Only return suggestions with reasonable confidence
    return suggestion.confidence > 0.5 ? suggestion : null;
  }

  /**
   * Write file outputs
   */
  async writeFileOutputs(result, filePath, outputDir, originalMetadata = {}) {
    const fileBasename = basename(filePath, extname(filePath));
    
    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });
    
    // Write JSON output
    const jsonOutput = {
      metadata: {
        filename: fileBasename,
        source: result.parsingMetadata?.source || 'unknown',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      program: {
        name: fileBasename,
        steps: result.steps,
        variables: result.variables,
        crossReferences: result.crossReferences || [],
      },
      validation: {
        errors: result.errors,
        warnings: result.warnings,
        summary: {
          totalSteps: result.steps.length,
          totalVariables: result.variables.length,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
        },
      },
    };
    
    writeFileSync(
      join(outputDir, `${fileBasename}.json`),
      JSON.stringify(jsonOutput, null, 2),
    );

    // Write XML output (TIA Portal compatible)
    const xmlOutput = this.generateTiaXml(result, fileBasename);
    writeFileSync(
      join(outputDir, `${fileBasename}.xml`),
      xmlOutput,
    );

    console.log(`📄 Generated outputs for: ${fileBasename}`);
  }

  /**
   * Generate TIA Portal compatible XML
   */
  generateTiaXml(result, programName) {
    const steps = result.steps.filter(s => s.type === 'SCHRITT');
    const variables = result.variables;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Document>\n';
    xml += '  <DocumentInfo>\n';
    xml += '    <Created>Generated by CLI Parser</Created>\n';
    xml += `    <Name>${programName}</Name>\n`;
    xml += '  </DocumentInfo>\n';
    xml += '  <FB>\n';
    xml += '    <Interface>\n';
    xml += '      <Sections>\n';
    xml += '        <Section Name="Static">\n';
    
    // Add step variables
    xml += '          <Member Name="Stap" Datatype="Array[0..31] of Bool"/>\n';
    xml += '          <Member Name="Hulp" Datatype="Array[1..32] of Bool"/>\n';
    xml += '          <Member Name="Tijd" Datatype="Array[1..10] of IEC_TIMER"/>\n';
    xml += '          <Member Name="Teller" Datatype="Array[1..10] of Int"/>\n';
    
    xml += '        </Section>\n';
    xml += '      </Sections>\n';
    xml += '    </Interface>\n';
    xml += '    <Implementation>\n';
    xml += '      <FBD>\n';
    
    // Add networks for each step
    steps.forEach((step, index) => {
      xml += `        <Network Title="SCHRITT ${step.number}">\n`;
      xml += '          <Comment>Auto-generated from CLI Parser</Comment>\n';
      xml += '        </Network>\n';
    });
    
    xml += '      </FBD>\n';
    xml += '    </Implementation>\n';
    xml += '  </FB>\n';
    xml += '</Document>\n';
    
    return xml;
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports(outputDir) {
    // Generate log file
    const logContent = this.generateLogFile();
    writeFileSync(join(outputDir, 'log.txt'), logContent);
    
    // Generate metrics file
    const metricsContent = this.generateMetricsFile();
    writeFileSync(join(outputDir, 'metrics.json'), metricsContent);
    
    // Generate suggestions file
    const suggestionsContent = this.generateSuggestionsFile();
    writeFileSync(join(outputDir, 'suggestions.json'), suggestionsContent);
    
    console.log('📊 Generated reports: log.txt, metrics.json, suggestions.json');
  }

  /**
   * Generate log file content
   */
  generateLogFile() {
    let log = `CLI Parser Log - ${new Date().toISOString()}\n`;
    log += '='.repeat(50) + '\n\n';
    
    // Summary
    log += `FILES PROCESSED: ${this.metrics.totalFiles}\n`;
    log += `TOTAL STEPS: ${this.metrics.totalSteps}\n`;
    log += `TOTAL VARIABLES: ${this.metrics.totalVariables}\n`;
    log += `ERRORS: ${this.metrics.totalErrors}\n`;
    log += `WARNINGS: ${this.metrics.totalWarnings}\n`;
    log += `UNKNOWN PATTERNS: ${this.metrics.unknownPatterns}\n`;
    log += `PROCESSING TIME: ${this.metrics.processingTime}ms\n\n`;
    
    // File details
    log += 'FILE DETAILS:\n';
    log += '-'.repeat(30) + '\n';
    this.processedFiles.forEach(file => {
      log += `${file.filename}:\n`;
      log += `  Steps: ${file.result.steps ? file.result.steps.length : 0}\n`;
      log += `  Variables: ${file.result.variables ? file.result.variables.length : 0}\n`;
      log += `  Errors: ${file.result.errors ? file.result.errors.length : 0}\n`;
      log += `  Warnings: ${file.result.warnings ? file.result.warnings.length : 0}\n\n`;
    });
    
    // Errors and warnings
    if (this.metrics.totalErrors > 0 || this.metrics.totalWarnings > 0) {
      log += 'ERRORS AND WARNINGS:\n';
      log += '-'.repeat(30) + '\n';
      this.processedFiles.forEach(file => {
        if (file.result.errors && file.result.errors.length > 0) {
          log += `${file.filename} - ERRORS:\n`;
          file.result.errors.forEach(error => {
            log += `  Line ${error.lineNumber}: ${error.message}\n`;
          });
        }
        if (file.result.warnings && file.result.warnings.length > 0) {
          log += `${file.filename} - WARNINGS:\n`;
          file.result.warnings.forEach(warning => {
            log += `  Line ${warning.lineNumber}: ${warning.message}\n`;
          });
        }
      });
    }
    
    return log;
  }

  /**
   * Generate metrics file content
   */
  generateMetricsFile() {
    const metrics = {
      summary: this.metrics,
      files: this.processedFiles.map(file => ({
        filename: file.filename,
        metrics: {
          steps: file.result.steps ? file.result.steps.length : 0,
          variables: file.result.variables ? file.result.variables.length : 0,
          errors: file.result.errors ? file.result.errors.length : 0,
          warnings: file.result.warnings ? file.result.warnings.length : 0,
        },
      })),
      distributions: {
        stepTypes: this.calculateStepTypeDistribution(),
        variableTypes: this.calculateVariableTypeDistribution(),
        errorTypes: this.calculateErrorTypeDistribution(),
      },
    };
    
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Generate suggestions file content
   */
  generateSuggestionsFile() {
    const suggestions = {
      pendingSuggestions: this.pendingSuggestions,
      syntaxRuleUpdates: this.generateSyntaxRuleUpdates(),
      trainingRecommendations: this.generateTrainingRecommendations(),
    };
    
    return JSON.stringify(suggestions, null, 2);
  }

  /**
   * Calculate step type distribution
   */
  calculateStepTypeDistribution() {
    const distribution = { RUST: 0, SCHRITT: 0 };
    
    this.processedFiles.forEach(file => {
      if (file.result.steps && file.result.steps.length > 0) {
        file.result.steps.forEach(step => {
          distribution[step.type] = (distribution[step.type] || 0) + 1;
        });
      }
    });
    
    return distribution;
  }

  /**
   * Calculate variable type distribution
   */
  calculateVariableTypeDistribution() {
    const distribution = {};
    
    this.processedFiles.forEach(file => {
      if (file.result.variables && file.result.variables.length > 0) {
        file.result.variables.forEach(variable => {
          distribution[variable.type] = (distribution[variable.type] || 0) + 1;
        });
      }
    });
    
    return distribution;
  }

  /**
   * Calculate error type distribution
   */
  calculateErrorTypeDistribution() {
    const distribution = {};
    
    this.processedFiles.forEach(file => {
      if (file.result.errors && file.result.errors.length > 0) {
        file.result.errors.forEach(error => {
          distribution[error.type] = (distribution[error.type] || 0) + 1;
        });
      }
    });
    
    return distribution;
  }

  /**
   * Generate syntax rule updates
   */
  generateSyntaxRuleUpdates() {
    const updates = [];
    
    // Group suggestions by type
    const groupedSuggestions = {};
    this.pendingSuggestions.forEach(suggestion => {
      if (suggestion.suggestedGroup) {
        if (!groupedSuggestions[suggestion.suggestedGroup]) {
          groupedSuggestions[suggestion.suggestedGroup] = [];
        }
        groupedSuggestions[suggestion.suggestedGroup].push(suggestion);
      }
    });
    
    // Generate updates for each group
    Object.entries(groupedSuggestions).forEach(([group, suggestions]) => {
      const highConfidenceSuggestions = suggestions.filter(s => s.confidence > 0.8);
      
      if (highConfidenceSuggestions.length > 0) {
        updates.push({
          group,
          suggestedRegex: highConfidenceSuggestions[0].suggestedRegex,
          examples: highConfidenceSuggestions.map(s => s.originalLine).slice(0, 3),
          confidence: Math.max(...highConfidenceSuggestions.map(s => s.confidence)),
          comment: `Auto-generated from ${highConfidenceSuggestions.length} similar patterns`,
        });
      }
    });
    
    return updates;
  }

  /**
   * Generate training recommendations
   */
  generateTrainingRecommendations() {
    const recommendations = [];
    
    // Recommend based on error patterns
    const errorTypes = this.calculateErrorTypeDistribution();
    Object.entries(errorTypes).forEach(([type, count]) => {
      if (count > 2) {
        recommendations.push({
          type: 'error_pattern',
          description: `High frequency of ${type} errors (${count} occurrences)`,
          suggestion: `Consider adding validation rules or improving pattern matching for ${type}`,
        });
      }
    });
    
    // Recommend based on unknown patterns
    if (this.metrics.unknownPatterns > 5) {
      recommendations.push({
        type: 'unknown_patterns',
        description: `Found ${this.metrics.unknownPatterns} unknown patterns`,
        suggestion: 'Consider expanding syntax rules to handle these patterns',
      });
    }
    
    return recommendations;
  }

  /**
   * Validate command - Validate syntax rules against test files
   */
  async validateCommand(args) {
    const configPath = args[0] || './syntax-config.json';
    const testDir = args[1] || './documentatie';
    
    console.log('🔍 Validating syntax rules...');
    
    // Load custom config if provided
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      this.syntaxRules = { ...this.syntaxRules, ...config.syntaxRules };
      this.validationRules = { ...this.validationRules, ...config.validationRules };
    }
    
    // Test against all files in directory
    await this.parseDirectory(testDir, './validation-output');
    
    // Generate validation report
    const validationReport = this.generateValidationReport();
    writeFileSync('./validation-report.json', JSON.stringify(validationReport, null, 2));
    
    console.log('✅ Validation completed. See validation-report.json for details.');
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      syntaxRules: this.syntaxRules,
      validationRules: this.validationRules,
      suggestions: this.pendingSuggestions,
      recommendations: this.generateTrainingRecommendations(),
    };
  }

  /**
   * Train command - Learn from patterns and update rules
   */
  async trainCommand(args) {
    const trainingDir = args[0] || './documentatie';
    const outputConfig = args[1] || './updated-syntax-config.json';
    
    console.log('🎓 Training syntax rules...');
    
    // Parse training files
    await this.parseDirectory(trainingDir, './training-output');
    
    // Generate updated rules
    const updatedRules = this.generateUpdatedRules();
    
    // Save updated configuration
    writeFileSync(outputConfig, JSON.stringify(updatedRules, null, 2));
    
    console.log(`✅ Training completed. Updated rules saved to: ${outputConfig}`);
    console.log(`📊 Generated ${this.pendingSuggestions.length} suggestions`);
  }

  /**
   * Generate updated rules based on training
   */
  generateUpdatedRules() {
    const updates = this.generateSyntaxRuleUpdates();
    const updatedRules = {
      syntaxRules: { ...this.syntaxRules },
      validationRules: { ...this.validationRules },
      pendingSuggestions: this.pendingSuggestions,
      updates: updates,
      timestamp: new Date().toISOString(),
    };
    
    // Apply high-confidence updates
    updates.forEach(update => {
      if (update.confidence > 0.9) {
        // Add to syntax rules (this would need more sophisticated logic)
        console.log(`🔄 Auto-applying high-confidence update for ${update.group}`);
      }
    });
    
    return updatedRules;
  }

  /**
   * Test command - Run tests against known good files
   */
  async testCommand(args) {
    const testFile = args[0] || './original-word-content.txt';
    
    console.log('🧪 Running tests...');
    
    if (!existsSync(testFile)) {
      throw new Error(`Test file not found: ${testFile}`);
    }
    
    // Parse test file
    await this.parseFile(testFile, './test-output');
    
    // Generate test report
    const testReport = {
      timestamp: new Date().toISOString(),
      testFile: testFile,
      results: this.processedFiles[0]?.result || null,
      passed: this.metrics.totalErrors === 0,
      metrics: this.metrics,
    };
    
    writeFileSync('./test-report.json', JSON.stringify(testReport, null, 2));
    
    console.log('✅ Test completed. See test-report.json for details.');
    console.log(`📊 Result: ${testReport.passed ? 'PASSED' : 'FAILED'}`);
  }

  /**
   * Auto-train command - Automatically improve syntax rules using suggestions
   */
  async autoTrainCommand(args) {
    const inputPath = args[0] || './documentatie';
    const outputDir = args[1] || './auto-training-results';
    const maxIterations = parseInt(args[2]) || 5;
    const minConfidence = parseFloat(args[3]) || 0.8;
    
    console.log('🤖 Starting automatic training...');
    console.log(`📁 Input: ${inputPath}`);
    console.log(`📁 Output: ${outputDir}`);
    console.log(`🔄 Max iterations: ${maxIterations}`);
    console.log(`🎯 Min confidence: ${minConfidence}`);
    
    // Determine input files
    let inputFiles = [];
    if (existsSync(inputPath)) {
      if (lstatSync(inputPath).isDirectory()) {
        const files = readdirSync(inputPath);
        inputFiles = files
          .filter(f => f.endsWith('.docx'))
          .map(f => join(inputPath, f));
      } else {
        inputFiles = [inputPath];
      }
    } else {
      throw new Error(`Input path not found: ${inputPath}`);
    }
    
    if (inputFiles.length === 0) {
      throw new Error('No .docx files found for training');
    }
    
    console.log(`📄 Found ${inputFiles.length} files for training:`);
    inputFiles.forEach(f => console.log(`  - ${f}`));
    
    // Initialize auto-trainer
    const autoTrainer = new AutoTrainer(this, {
      maxIterations,
      minConfidence,
      convergenceThreshold: 0.05,
      backupOriginalRules: true,
    });
    
    // Start training
    const trainingResult = await autoTrainer.startTraining(inputFiles, outputDir);
    
    // Display results
    console.log('\n🎓 === Auto-Training Results ===');
    console.log(`✅ Completed: ${trainingResult.iterations} iterations`);
    console.log(`🎯 Converged: ${trainingResult.converged ? 'Yes' : 'No'}`);
    console.log(`📊 Final parsing efficiency: ${(trainingResult.finalMetrics?.parsingEfficiency * 100).toFixed(1)}%`);
    console.log(`📄 Training report: ${trainingResult.reportPath}`);
    
    // Save final optimized rules
    const finalRulesPath = join(outputDir, 'optimized-syntax-rules.json');
    writeFileSync(finalRulesPath, JSON.stringify(this.syntaxRules, null, 2));
    
    const finalValidationRulesPath = join(outputDir, 'optimized-validation-rules.json');
    writeFileSync(finalValidationRulesPath, JSON.stringify(this.validationRules, null, 2));
    
    console.log('💾 Final optimized rules saved:');
    console.log(`  - ${finalRulesPath}`);
    console.log(`  - ${finalValidationRulesPath}`);
    
    // Recommend next steps
    if (trainingResult.converged) {
      console.log('\n🎉 Training successful! Rules have been optimized.');
      console.log('💡 Next steps:');
      console.log('  - Review the optimized rules');
      console.log('  - Test with additional files');
      console.log('  - Deploy to production');
    } else {
      console.log('\n⚠️  Training did not fully converge.');
      console.log('💡 Consider:');
      console.log('  - Increasing max iterations');
      console.log('  - Lowering confidence threshold');
      console.log('  - Adding more training data');
    }
  }

  /**
   * Print usage information
   */
  printUsage() {
    console.log(`
CLI Parser & Syntax Evaluator
Usage: node cli-parser.js <command> [options]

Commands:
  parse <input> [output]     Parse file or directory
  validate [config] [testdir] Validate syntax rules
  train <trainingdir> [config] Train and update rules
  test [testfile]            Run tests
  auto-train [input] [output] [iterations] [confidence] Automatically improve rules
  help                       Show this help

Examples:
  node cli-parser.js parse ./documentatie ./output
  node cli-parser.js parse ./original-word-content.txt
  node cli-parser.js validate ./syntax-config.json ./documentatie
  node cli-parser.js train ./documentatie ./updated-config.json
  node cli-parser.js test ./original-word-content.txt
  node cli-parser.js auto-train ./documentatie ./training-results 5 0.8

Output Files:
  - <filename>.json: Structured parse output
  - <filename>.xml: TIA Portal compatible XML
  - log.txt: Detailed processing log
  - metrics.json: Processing metrics and statistics
  - suggestions.json: Syntax rule improvement suggestions
    `);
  }
}

// Run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CLIParser();
  cli.main().catch(console.error);
}

export { CLIParser };