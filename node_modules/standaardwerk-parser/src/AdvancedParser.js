// =====================================================================
// src/core/AdvancedParser.js - Advanced Parser for Industrial Programs
// =====================================================================
// Addresses the gaps identified in the analysis:
// - Hierarchical FB program structure
// - Variable assignments and complex matrix operations
// - Compound OR-blocks and grouped conditions
// - Comment and description extraction
// - Standardized entity normalization
// =====================================================================

import { FlexibleParser } from './FlexibleParser.js';
import { ContentPreprocessor } from './ContentPreprocessor.js';
import { globalRegexCache } from './utils/RegexCache.js';

/**
 * Advanced Parser for complex industrial program structures
 */
export class AdvancedParser extends FlexibleParser {
  constructor(syntaxRules = {}, validationRules = {}) {
    super(syntaxRules, validationRules);
    
    // Initialize content preprocessor
    this.preprocessor = new ContentPreprocessor();
    
    // Enhanced patterns for advanced parsing
    this.advancedPatterns = {
      // FB program headers
      fbProgram: /^(Hauptprogramm|Unterprogramm|Programm)\s+([A-Za-z0-9_\s]+)\s+(FB\d+)$/i,
      
      // Variable assignments (simple and complex) - improved patterns
      simpleAssignment: /^([A-Za-z_][A-Za-z0-9_\s]*)\s*\(([^)]+)\)\s*=\s*(.+)$/,
      generalAssignment: /^([A-Za-z_][A-Za-z0-9_\s]+)\s*=\s*(.+)$/,
      complexAssignment: /^([A-Za-z_][A-Za-z0-9_]*)\[([^\]]+)\]\.([A-Za-z_][A-Za-z0-9_]*)\[([^\]]+)\]\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/,
      matrixAssignment: /^([A-Za-z_][A-Za-z0-9_]*)\[([^\]]+)\]\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/,
      
      // Comments and descriptions
      singleLineComment: /^\/\/\s*(.*)$/,
      multiLineComment: /^\/\*\s*(.*?)\s*\*\/$/,
      inlineComment: /^(.+?)\s*\/\/\s*(.*)$/,
      descriptionBlock: /^([A-Za-z_][A-Za-z0-9_\s]*):?\s*(.+)$/,
      
      // Standardized references
      fbStepReference: /^(.+?)\s*\(([A-Za-z0-9_\s]+)\s+(FB\d+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)\s*$/i,
      standardizedReference: /^(.+?)\s*\(([A-Za-z0-9_\s]+)\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)\s*$/i,
      
      // Transition rules (fixed patterns)
      transitionRule: /^\+\s*von\s+SCHRITT\s+(\d+)/i,
      jumpRule: /^\+\s*nach\s+SCHRITT\s+(\d+)/i,
      
      // Compound conditions and OR-blocks (improved patterns)
      orBlockStart: /^\s*\[\s*$/,
      orBlockEnd: /^\s*\]\s*$/,
      orBlockItem: /^\+?\s*(.+?)\s*$/,
      
      // Entity types
      käseZähler: /^(Käsezähler|Cheese Counter)\s+([A-Za-z0-9_\s]+)\s*(.*)$/i,
      störung: /^(NICHT\s+)?(Störung|Fault|Error)\s*[:.]?\s*(.+)$/i,
      freigabe: /^(Freigabe|Release|Enable)\s+(.+)$/i,
      
      // Comparisons and evaluations (improved patterns)
      comparison: /^(.+?)\s*([<>=!]+|==|!=|<=|>=)\s*(.+)$/,
      evaluation: /^(.+?)\s*(ist|is)\s+(.+)$/i,
      
      // Logical operators
      logicalAnd: /^(.+?)\s+(&|UND|AND)\s+(.+)$/i,
      logicalOr: /^(.+?)\s+(ODER|OR)\s+(.+)$/i,
      
      // Time patterns
      timePattern: /^Zeit\s+(\d+)\s*(sek|min|sec|seconds?|minutes?)\s*\?\?$/i,
      
      // Negation patterns
      negationPattern: /^(NICHT|NOT)\s+(.+)$/i,
    };
    
    // Program structure tracking - optimized with efficient data structures
    this.programStructure = {
      currentFB: null,
      fbHierarchy: new Map(),
      crossReferences: new Map(),
      entities: new Map(),
      // Performance optimizations
      programTypeIndex: new Map(), // programType -> Set of programs
      stepNumberIndex: new Map(),  // stepNumber -> Set of steps
      entityTypeIndex: new Map(),  // entityType -> Set of entities
      lineNumberIndex: new Map(),   // lineNumber -> element
    };
    
    // TIA Portal standard variables
    this.tiaStandardVariables = [
      { name: 'Stap', datatype: 'Array[0..31] of Bool', description: 'Step status bits' },
      { name: 'Hulp', datatype: 'Array[1..32] of Bool', description: 'Helper bits' },
      { name: 'Tijd', datatype: 'Array[1..10] of IEC_TIMER', description: 'Timer array' },
      { name: 'Teller', datatype: 'Array[1..10] of Int', description: 'Counter array' },
    ];
  }

  /**
   * Parse text with advanced structure detection
   */
  parseText(text, options = {}) {
    // Step 1: Preprocess the content to fix common issues
    const preprocessedText = this.preprocessor.preprocess(text);
    
    // Step 2: Run the base FlexibleParser on preprocessed text
    const baseResult = super.parseText(preprocessedText, options);
    
    // Step 3: Enhance with advanced parsing
    const enhancedResult = this.enhanceWithAdvancedParsing(preprocessedText, baseResult);
    
    // Step 4: Add preprocessing statistics
    enhancedResult.preprocessingStats = this.preprocessor.getPreprocessingStats(text, preprocessedText);
    
    return enhancedResult;
  }

  /**
   * Enhance base parsing with advanced features - refactored for better maintainability
   */
  enhanceWithAdvancedParsing(text, baseResult) {
    const lines = text.split('\n');
    const enhanced = this.initializeEnhancedResult(baseResult);
    const parsingContext = this.initializeParsingContext();

    // Process lines in batches for better performance
    this.processLinesInBatches(lines, enhanced, parsingContext);

    // Finalize the enhanced result
    return this.finalizeEnhancedResult(enhanced, parsingContext);
  }

  /**
   * Initialize enhanced result structure
   */
  initializeEnhancedResult(baseResult) {
    return {
      ...baseResult,
      programs: [],
      variableAssignments: [],
      comments: [],
      orBlocks: [],
      entities: [],
      normalizedReferences: [],
      compoundConditions: [],
    };
  }

  /**
   * Initialize parsing context
   */
  initializeParsingContext() {
    return {
      currentProgram: null,
      currentOrBlock: null,
      lineIndex: 0,
    };
  }

  /**
   * Process lines in batches to avoid blocking
   */
  processLinesInBatches(lines, enhanced, parsingContext) {
    lines.forEach((line, index) => {
      this.processLine(line, index, enhanced, parsingContext);
    });
  }

  /**
   * Process a single line with all detection methods
   */
  processLine(line, index, enhanced, parsingContext) {
    const trimmed = line.trim();
    if (!trimmed) return;

    const lineNumber = index + 1;
    const detectors = [
      () => this.processProgram(trimmed, lineNumber, enhanced, parsingContext),
      () => this.processVariableAssignment(trimmed, lineNumber, enhanced, parsingContext),
      () => this.processComment(trimmed, lineNumber, enhanced),
      () => this.processOrBlock(trimmed, lineNumber, enhanced, parsingContext),
      () => this.processReference(trimmed, lineNumber, enhanced),
      () => this.processEntity(trimmed, lineNumber, enhanced),
      () => this.processTransitionRule(trimmed, lineNumber, enhanced),
      () => this.processCondition(trimmed, lineNumber, enhanced),
    ];

    // Try each detector until one succeeds
    for (const detector of detectors) {
      if (detector()) break;
    }
  }

  /**
   * Process FB program detection
   */
  processProgram(trimmed, lineNumber, enhanced, parsingContext) {
    const programMatch = this.detectFBProgram(trimmed, lineNumber);
    if (programMatch) {
      if (parsingContext.currentProgram) {
        enhanced.programs.push(parsingContext.currentProgram);
      }
      parsingContext.currentProgram = programMatch;
      this.programStructure.currentFB = programMatch.fbNumber;
      return true;
    }
    return false;
  }

  /**
   * Process variable assignment detection
   */
  processVariableAssignment(trimmed, lineNumber, enhanced, parsingContext) {
    const assignmentMatch = this.detectVariableAssignment(trimmed, lineNumber);
    if (assignmentMatch) {
      enhanced.variableAssignments.push(assignmentMatch);
      if (parsingContext.currentProgram) {
        parsingContext.currentProgram.assignments = parsingContext.currentProgram.assignments || [];
        parsingContext.currentProgram.assignments.push(assignmentMatch);
      }
      return true;
    }
    return false;
  }

  /**
   * Process comment detection
   */
  processComment(trimmed, lineNumber, enhanced) {
    const commentMatch = this.detectComment(trimmed, lineNumber);
    if (commentMatch) {
      enhanced.comments.push(commentMatch);
      return true;
    }
    return false;
  }

  /**
   * Process OR-block detection
   */
  processOrBlock(trimmed, lineNumber, enhanced, parsingContext) {
    const orBlockResult = this.detectOrBlock(trimmed, lineNumber, parsingContext.currentOrBlock);
    if (orBlockResult.isOrBlock) {
      parsingContext.currentOrBlock = orBlockResult.orBlock;
      if (orBlockResult.completed) {
        enhanced.orBlocks.push(parsingContext.currentOrBlock);
        parsingContext.currentOrBlock = null;
      }
      return true;
    }
    return false;
  }

  /**
   * Process reference normalization
   */
  processReference(trimmed, lineNumber, enhanced) {
    const normalizedRef = this.normalizeReference(trimmed, lineNumber);
    if (normalizedRef) {
      enhanced.normalizedReferences.push(normalizedRef);
      return true;
    }
    return false;
  }

  /**
   * Process entity detection
   */
  processEntity(trimmed, lineNumber, enhanced) {
    const entityMatch = this.detectEntity(trimmed, lineNumber);
    if (entityMatch) {
      enhanced.entities.push(entityMatch);
      return true;
    }
    return false;
  }

  /**
   * Process transition rule detection
   */
  processTransitionRule(trimmed, lineNumber, enhanced) {
    const transitionMatch = this.detectTransitionRule(trimmed, lineNumber);
    if (transitionMatch) {
      enhanced.compoundConditions.push(transitionMatch);
      return true;
    }
    return false;
  }

  /**
   * Process condition enhancement
   */
  processCondition(trimmed, lineNumber, enhanced) {
    const conditionMatch = this.enhanceCondition(trimmed, lineNumber, enhanced);
    if (conditionMatch) {
      enhanced.compoundConditions.push(conditionMatch);
      return true;
    }
    return false;
  }

  /**
   * Finalize enhanced result with post-processing
   */
  finalizeEnhancedResult(enhanced, parsingContext) {
    // Add final program if exists
    if (parsingContext.currentProgram) {
      enhanced.programs.push(parsingContext.currentProgram);
    }

    // Build program hierarchy
    enhanced.programHierarchy = this.buildProgramHierarchy(enhanced);
    
    // Add TIA Portal standard variables
    enhanced.tiaStandardVariables = this.tiaStandardVariables;
    
    // Post-process to ensure TIA Portal compatibility
    this.postProcessForTiaPortal(enhanced);

    return enhanced;
  }

  /**
   * Detect FB program headers - using cached regex
   */
  detectFBProgram(text, lineNumber) {
    const match = globalRegexCache.match(text, this.advancedPatterns.fbProgram.source, this.advancedPatterns.fbProgram.flags);
    if (!match) return null;

    const [, type, name, fbNumber] = match;
    
    return {
      type: 'fb_program',
      programType: type,
      name: name.trim(),
      fbNumber: fbNumber,
      lineNumber,
      steps: [],
      assignments: [],
      references: [],
    };
  }

  /**
   * Detect variable assignments (simple and complex) - using cached regex
   */
  detectVariableAssignment(text, lineNumber) {
    // Try complex assignment first (Horde[x].Etage_Daten[y].Status = 0)
    let match = globalRegexCache.match(text, this.advancedPatterns.complexAssignment.source, this.advancedPatterns.complexAssignment.flags);
    if (match) {
      const [, arrayName, index1, property1, index2, property2, value] = match;
      return {
        type: 'complex_assignment',
        arrayName,
        indices: [
          { property: arrayName, index: index1 },
          { property: property1, index: index2 },
        ],
        finalProperty: property2,
        value: value.trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Try matrix assignment (Horde[x].Property = value)
    match = globalRegexCache.match(text, this.advancedPatterns.matrixAssignment.source, this.advancedPatterns.matrixAssignment.flags);
    if (match) {
      const [, arrayName, index, property, value] = match;
      return {
        type: 'matrix_assignment',
        arrayName,
        index: index.trim(),
        property,
        value: value.trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Try simple assignment (Variable 1 (Description) = 21)
    match = globalRegexCache.match(text, this.advancedPatterns.simpleAssignment.source, this.advancedPatterns.simpleAssignment.flags);
    if (match) {
      const [, name, description, value] = match;
      return {
        type: 'simple_assignment',
        name: name.trim(),
        description: description.trim(),
        value: value.trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Try general assignment (Variable Name = Value)
    match = globalRegexCache.match(text, this.advancedPatterns.generalAssignment.source, this.advancedPatterns.generalAssignment.flags);
    if (match) {
      const [, name, value] = match;
      // Skip if this looks like a step or condition
      if (globalRegexCache.test('^(SCHRITT|STAP|STEP|RUHE|RUST|IDLE)', name, 'i')) {
        return null;
      }
      return {
        type: 'general_assignment',
        name: name.trim(),
        value: value.trim(),
        lineNumber,
        originalText: text,
      };
    }

    return null;
  }

  /**
   * Detect comments and descriptions
   */
  detectComment(text, lineNumber) {
    // Single line comment
    let match = text.match(this.advancedPatterns.singleLineComment);
    if (match) {
      return {
        type: 'comment',
        subtype: 'single_line',
        content: match[1].trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Multi-line comment
    match = text.match(this.advancedPatterns.multiLineComment);
    if (match) {
      return {
        type: 'comment',
        subtype: 'multi_line',
        content: match[1].trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Inline comment
    match = text.match(this.advancedPatterns.inlineComment);
    if (match) {
      return {
        type: 'comment',
        subtype: 'inline',
        content: match[2].trim(),
        codeContent: match[1].trim(),
        lineNumber,
        originalText: text,
      };
    }

    return null;
  }

  /**
   * Detect OR-blocks and compound conditions
   */
  detectOrBlock(text, lineNumber, currentOrBlock) {
    // OR block start
    if (this.advancedPatterns.orBlockStart.test(text)) {
      return {
        isOrBlock: true,
        orBlock: {
          type: 'or_block',
          items: [],
          startLine: lineNumber,
          endLine: null,
        },
        completed: false,
      };
    }

    // OR block end
    if (this.advancedPatterns.orBlockEnd.test(text) && currentOrBlock) {
      currentOrBlock.endLine = lineNumber;
      return {
        isOrBlock: true,
        orBlock: currentOrBlock,
        completed: true,
      };
    }

    // OR block item
    if (currentOrBlock) {
      const match = text.match(this.advancedPatterns.orBlockItem);
      if (match) {
        currentOrBlock.items.push({
          condition: match[1].trim(),
          lineNumber,
          originalText: text,
        });
        return {
          isOrBlock: true,
          orBlock: currentOrBlock,
          completed: false,
        };
      }
    }

    return { isOrBlock: false };
  }

  /**
   * Normalize references to standardized format
   */
  normalizeReference(text, lineNumber) {
    // Try FB step reference with FB number
    let match = text.match(this.advancedPatterns.fbStepReference);
    if (match) {
      const [, description, program, fbNumber, stepKeyword, steps] = match;
      return {
        type: 'standardized_reference',
        description: description.trim(),
        program: program.trim(),
        fbNumber,
        stepKeyword,
        steps: steps.split('+').map(s => parseInt(s.trim())),
        standardizedFormat: `${fbNumber}.${stepKeyword} ${steps}`,
        lineNumber,
        originalText: text,
      };
    }

    // Try standard reference without FB number
    match = text.match(this.advancedPatterns.standardizedReference);
    if (match) {
      const [, description, program, stepKeyword, steps] = match;
      return {
        type: 'standardized_reference',
        description: description.trim(),
        program: program.trim(),
        fbNumber: this.programStructure.currentFB || 'UNKNOWN',
        stepKeyword,
        steps: steps.split('+').map(s => parseInt(s.trim())),
        standardizedFormat: `${this.programStructure.currentFB || 'UNKNOWN'}.${stepKeyword} ${steps}`,
        lineNumber,
        originalText: text,
      };
    }

    return null;
  }

  /**
   * Detect entities (Käsezähler, Störung, etc.)
   */
  detectEntity(text, lineNumber) {
    // Käsezähler
    let match = text.match(this.advancedPatterns.käseZähler);
    if (match) {
      return {
        type: 'entity',
        entityType: 'käsezähler',
        name: match[2].trim(),
        description: match[3].trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Störung
    match = text.match(this.advancedPatterns.störung);
    if (match) {
      return {
        type: 'entity',
        entityType: 'störung',
        description: match[2].trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Freigabe
    match = text.match(this.advancedPatterns.freigabe);
    if (match) {
      return {
        type: 'entity',
        entityType: 'freigabe',
        description: match[2].trim(),
        lineNumber,
        originalText: text,
      };
    }

    return null;
  }

  /**
   * Detect transition rules (+ von SCHRITT X, + nach SCHRITT X)
   */
  detectTransitionRule(text, lineNumber) {
    // Check for transition rule (+ von SCHRITT X)
    let match = text.match(this.advancedPatterns.transitionRule);
    if (match) {
      const [, stepNumber] = match;
      return {
        type: 'transition_rule',
        subtype: 'von',
        targetStep: parseInt(stepNumber),
        lineNumber,
        originalText: text,
      };
    }

    // Check for jump rule (+ nach SCHRITT X)
    match = text.match(this.advancedPatterns.jumpRule);
    if (match) {
      const [, stepNumber] = match;
      return {
        type: 'transition_rule',
        subtype: 'nach',
        targetStep: parseInt(stepNumber),
        lineNumber,
        originalText: text,
      };
    }

    return null;
  }

  /**
   * Enhance conditions with compound logic
   */
  enhanceCondition(text, lineNumber, baseResult) {
    // Check if this is a comparison
    let match = text.match(this.advancedPatterns.comparison);
    if (match) {
      return {
        type: 'compound_condition',
        subtype: 'comparison',
        leftOperand: match[1].trim(),
        operator: match[2].trim(),
        rightOperand: match[3].trim(),
        lineNumber,
        originalText: text,
      };
    }

    // Check if this is an evaluation
    match = text.match(this.advancedPatterns.evaluation);
    if (match) {
      return {
        type: 'compound_condition',
        subtype: 'evaluation',
        subject: match[1].trim(),
        operator: match[2].trim(),
        value: match[3].trim(),
        lineNumber,
        originalText: text,
      };
    }

    return null;
  }

  /**
   * Build program hierarchy from parsed data - optimized with efficient lookups
   */
  buildProgramHierarchy(enhanced) {
    const hierarchy = {
      mainPrograms: [],
      subPrograms: [],
      relationships: [],
    };

    // Use Set for O(1) lookups instead of includes()
    const mainProgramTypes = new Set(['hauptprogramm', 'main', 'primary']);
    
    enhanced.programs.forEach(program => {
      // Index program by type for fast lookups
      const programType = program.programType.toLowerCase();
      if (!this.programStructure.programTypeIndex.has(programType)) {
        this.programStructure.programTypeIndex.set(programType, new Set());
      }
      this.programStructure.programTypeIndex.get(programType).add(program);
      
      // Categorize program efficiently
      if (mainProgramTypes.has(programType)) {
        hierarchy.mainPrograms.push(program);
      } else {
        hierarchy.subPrograms.push(program);
      }
    });

    // Build relationships from cross-references
    enhanced.normalizedReferences.forEach(ref => {
      const relationship = {
        sourceProgram: this.programStructure.currentFB,
        targetProgram: ref.fbNumber,
        targetSteps: ref.steps,
        description: ref.description,
        type: 'step_reference',
      };
      hierarchy.relationships.push(relationship);
    });

    return hierarchy;
  }

  /**
   * Post-process results for TIA Portal compatibility
   */
  postProcessForTiaPortal(enhanced) {
    // 1. Convert RUHE to SCHRITT 0
    enhanced.steps.forEach(step => {
      if (step.type === 'RUHE') {
        step.type = 'SCHRITT';
        step.number = 0;
        step.originalType = 'RUHE';
      }
    });
    
    // 2. Sort steps by number to ensure proper sequence
    enhanced.steps.sort((a, b) => a.number - b.number);
    
    // 3. Add step descriptions as comments
    enhanced.steps.forEach(step => {
      if (step.description && step.description.trim()) {
        enhanced.comments.push({
          type: 'comment',
          subtype: 'step_description',
          content: step.description,
          stepNumber: step.number,
          lineNumber: step.lineNumber,
          originalText: `${step.type} ${step.number}: ${step.description}`,
        });
      }
    });
    
    // 4. Add TIA standard variables to the variables array
    this.tiaStandardVariables.forEach(tiaVar => {
      enhanced.variables.push({
        name: tiaVar.name,
        type: tiaVar.datatype,
        group: 'tia_standard',
        description: tiaVar.description,
        isStandard: true,
        lineNumber: 0, // System-generated
      });
    });
    
    // 5. Ensure proper step numbering sequence
    this.validateStepSequence(enhanced);
  }

  /**
   * Validate and fix step sequence - optimized with Set operations
   */
  validateStepSequence(enhanced) {
    const stepNumbers = enhanced.steps.map(s => s.number).sort((a, b) => a - b);
    const expectedSequence = Array.from({ length: stepNumbers.length }, (_, i) => i);
    
    // Use Set for O(1) lookups instead of includes()
    const stepNumberSet = new Set(stepNumbers);
    const expectedSet = new Set(expectedSequence);
    
    // Check if we have the expected sequence (0, 1, 2, 3, ...)
    let hasValidSequence = true;
    for (let i = 0; i < stepNumbers.length; i++) {
      if (stepNumbers[i] !== expectedSequence[i]) {
        hasValidSequence = false;
        break;
      }
    }
    
    if (!hasValidSequence) {
      console.log('⚠️  Step sequence validation: Non-sequential step numbers detected');
      console.log(`   Expected: ${expectedSequence.join(', ')}`);
      console.log(`   Actual: ${stepNumbers.join(', ')}`);
    }
    
    // Find gaps and duplicates efficiently using Set operations
    const gaps = expectedSequence.filter(expected => !stepNumberSet.has(expected));
    const duplicates = stepNumbers.filter((num, index) => stepNumbers.indexOf(num) !== index);
    
    // Add sequence validation to results
    enhanced.stepSequenceValidation = {
      isValid: hasValidSequence,
      expected: expectedSequence,
      actual: stepNumbers,
      gaps,
      duplicates,
    };
  }

  /**
   * Export enhanced training data
   */
  exportEnhancedTrainingData() {
    const baseData = super.exportTrainingData();
    
    return {
      ...baseData,
      advancedFeatures: {
        programs: this.programStructure.fbHierarchy.size,
        variableAssignments: 0, // Will be filled during parsing
        comments: 0,
        orBlocks: 0,
        entities: 0,
        normalizedReferences: 0,
      },
      categories: [
        'fb_program',
        'simple_assignment',
        'complex_assignment',
        'matrix_assignment',
        'comment',
        'or_block',
        'standardized_reference',
        'entity',
        'compound_condition',
      ],
    };
  }
}

export default AdvancedParser;