// =====================================================================
// src/core/HierarchicalParser.js - Hierarchical Structure-Aware Parser
// =====================================================================
// Implements Excel-like column structure parsing for RUST/SCHRITT methodology:
// - Column 0: RUST/SCHRITT declarations (no indentation)
// - Column 1: Entry conditions (indented under step they activate)
// - Column 2: OR conditions (further indented)
// =====================================================================

export class HierarchicalParser {
  constructor(syntaxRules) {
    this.syntaxRules = syntaxRules;
    this.debugMode = true;
  }

  /**
   * Parse text with structural awareness
   */
  parse(text, source = 'manual', metadata = {}) {
    this.log('🏗️ Starting hierarchical parsing', { source });
    
    // Step 1: Analyze indentation structure
    const structuredLines = this.analyzeIndentationStructure(text, source);
    this.log('📊 Analyzed structure', { lineCount: structuredLines.length });
    
    // Step 2: Build hierarchical tree
    const hierarchicalTree = this.buildHierarchicalTree(structuredLines);
    this.log('🌳 Built hierarchical tree', { rootChildren: hierarchicalTree.length });
    
    // Step 3: Parse hierarchically with RUST/SCHRITT rules
    const result = this.parseHierarchically(hierarchicalTree);
    this.log('✅ Hierarchical parsing complete', { 
      steps: result.steps.length, 
      variables: result.variables.length 
    });
    
    return result;
  }

  /**
   * Analyze indentation structure of input text
   */
  analyzeIndentationStructure(text, source) {
    const lines = text.split('\n');
    const structuredLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) continue; // Skip empty lines
      
      const indentLevel = this.calculateIndentLevel(line, source);
      const contentType = this.classifyLineContent(trimmed);
      
      const structuredLine = {
        originalLine: line,
        content: trimmed,
        indentLevel,
        contentType,
        lineNumber: i + 1,
        children: []
      };
      
      structuredLines.push(structuredLine);
      this.log(`📝 Line ${i+1}`, { 
        content: trimmed.substring(0, 50), 
        indentLevel, 
        contentType 
      });
    }
    
    return structuredLines;
  }

  /**
   * Calculate indentation level based on source type
   */
  calculateIndentLevel(line, source) {
    const leadingWhitespace = line.match(/^(\s*)/)[1];
    
    if (source === 'word') {
      // Word documents: detect tabs (4 spaces), bullets, numbering
      const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
      const spaceCount = leadingWhitespace.replace(/\t/g, '').length;
      const hasBullet = /^\s*[-•▪▫]/.test(line);
      const hasNumbering = /^\s*\d+\./.test(line);
      
      let level = tabCount + Math.floor(spaceCount / 4);
      if (hasBullet || hasNumbering) level += 1;
      
      return level;
    } else {
      // Manual input: count spaces (2 spaces = 1 level)
      return Math.floor(leadingWhitespace.length / 2);
    }
  }

  /**
   * Classify line content type
   */
  classifyLineContent(content) {
    if (!content) return 'empty';
    
    // Check for RUST/SCHRITT declarations (must be exact patterns)
    if (this.isRustDeclaration(content)) return 'rust';
    if (this.isSchrittDeclaration(content)) return 'schritt';
    if (this.isVonSchrittDeclaration(content)) return 'von_schritt';
    if (this.isVariableDeclaration(content)) return 'variable';
    if (this.isCrossReference(content)) return 'cross_reference';
    
    // Default to condition (anything indented or with condition markers)
    return 'condition';
  }

  isRustDeclaration(content) {
    return /^(RUST|RUHE|IDLE)\s*:\s*.+$/i.test(content);
  }

  isSchrittDeclaration(content) {
    return /^(SCHRITT|STAP|STEP)\s+\d+\s*:\s*.+$/i.test(content);
  }

  isVonSchrittDeclaration(content) {
    return /^(\+?\s*VON\s+(SCHRITT|STAP|STEP)\s+\d+)$/i.test(content);
  }

  isVariableDeclaration(content) {
    return /^[^:]+\s*=\s*$/.test(content) || 
           /^(STORING|MELDING|STÖRUNG)\s*:\s*[^=]+\s*=\s*$/.test(content);
  }

  isCrossReference(content) {
    // Cross-references: (ProgramName SCHRITT X+Y+Z) - should NOT be treated as step declarations
    return /\([^)]+\s+(SCHRITT|STAP|STEP)\s+[0-9+]+\)/.test(content);
  }

  /**
   * Build hierarchical tree structure
   */
  buildHierarchicalTree(structuredLines) {
    const root = [];
    const stack = [{ children: root, indentLevel: -1 }];
    
    for (const line of structuredLines) {
      // Find correct parent based on indentation
      while (stack.length > 1 && 
             stack[stack.length - 1].indentLevel >= line.indentLevel) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1];
      parent.children.push(line);
      
      // Add to stack if it can have children
      if (line.contentType === 'rust' || 
          line.contentType === 'schritt' ||
          line.contentType === 'condition') {
        stack.push(line);
      }
    }
    
    return root;
  }

  /**
   * Parse hierarchically with RUST/SCHRITT methodology
   */
  parseHierarchically(tree) {
    const result = this.createEmptyResult();
    
    for (const node of tree) {
      this.processNode(node, result);
    }
    
    // Apply RUST/SCHRITT logic rules
    this.applyRustSchrittLogic(result);
    
    return result;
  }

  /**
   * Process a single node in the hierarchy
   */
  processNode(node, result) {
    switch (node.contentType) {
      case 'rust':
        this.processRustStep(node, result);
        break;
      case 'schritt':
        this.processSchrittStep(node, result);
        break;
      case 'variable':
        this.processVariable(node, result);
        break;
      case 'cross_reference':
        this.processCrossReference(node, result);
        break;
      case 'von_schritt':
        this.processVonSchritt(node, result);
        break;
      default:
        this.log(`⚠️ Unhandled node type: ${node.contentType}`);
    }
  }

  /**
   * Process RUST step - NEVER has entry conditions
   */
  processRustStep(node, result) {
    const rustStep = {
      type: 'RUST',
      number: 0,
      description: this.extractDescription(node.content),
      entryConditions: [], // RUST NEVER has entry conditions!
      exitConditions: [],
      implicitConditions: [], // Will be populated later
      lineNumber: node.lineNumber
    };
    
    this.log('🛑 Created RUST step', { description: rustStep.description });
    result.steps.push(rustStep);
  }

  /**
   * Process SCHRITT step - gets entry conditions from children
   */
  processSchrittStep(node, result) {
    const stepNumber = this.extractStepNumber(node.content);
    const schrittStep = {
      type: 'SCHRITT',
      number: stepNumber,
      description: this.extractDescription(node.content),
      entryConditions: this.extractConditionsFromChildren(node.children),
      exitConditions: [],
      transitions: [],
      lineNumber: node.lineNumber
    };
    
    this.log('⚡ Created SCHRITT step', { 
      number: stepNumber, 
      description: schrittStep.description,
      conditionGroups: schrittStep.entryConditions.length
    });
    
    result.steps.push(schrittStep);
  }

  /**
   * Extract conditions from child nodes
   */
  extractConditionsFromChildren(children) {
    const conditionGroups = [];
    let currentGroup = { operator: 'AND', conditions: [] };
    
    for (const child of children) {
      if (child.contentType === 'condition') {
        const condition = this.parseCondition(child);
        
        if (condition.operator === 'OR' && currentGroup.conditions.length > 0) {
          // Start new OR group
          conditionGroups.push(currentGroup);
          currentGroup = { operator: 'OR', conditions: [condition] };
        } else {
          currentGroup.conditions.push(condition);
        }
      }
    }
    
    if (currentGroup.conditions.length > 0) {
      conditionGroups.push(currentGroup);
    }
    
    return conditionGroups;
  }

  /**
   * Parse individual condition
   */
  parseCondition(conditionNode) {
    const content = conditionNode.content;
    const isOr = content.startsWith('+');
    const isNegated = /^(NIET|NOT|NICHT)\s+/i.test(content);
    
    // Clean the condition text
    let cleanContent = content.replace(/^[+\-]\s*/, '');
    if (isNegated) {
      cleanContent = cleanContent.replace(/^(NIET|NOT|NICHT)\s+/i, '');
    }
    
    return {
      variable: cleanContent,
      isNot: isNegated,
      operator: isOr ? 'OR' : 'AND',
      lineNumber: conditionNode.lineNumber,
      indentLevel: conditionNode.indentLevel
    };
  }

  /**
   * Apply RUST/SCHRITT methodology rules
   */
  applyRustSchrittLogic(result) {
    const steps = result.steps;
    
    // Find RUST step and ensure it has no entry conditions
    const rustStep = steps.find(s => s.type === 'RUST');
    if (rustStep && rustStep.entryConditions.length > 0) {
      this.log('🚨 ERROR: RUST step has entry conditions - removing them!');
      rustStep.entryConditions = [];
    }
    
    // Apply RUST implicit logic: RUST = NICHT (all SCHRITT steps)
    if (rustStep) {
      const schrittSteps = steps.filter(s => s.type === 'SCHRITT');
      rustStep.implicitConditions = schrittSteps.map(s => ({
        type: 'implicit',
        text: `NICHT SCHRITT ${s.number}`,
        negated: true,
        stepReference: s.number
      }));
      
      this.log('🔄 Applied RUST implicit logic', { 
        implicitConditions: rustStep.implicitConditions.length 
      });
    }
  }

  /**
   * Extract step description from content
   */
  extractDescription(content) {
    const match = content.match(/^(RUST|RUHE|IDLE|SCHRITT|STAP|STEP)(?:\s+\d+)?\s*:\s*(.+)$/i);
    return match ? match[2].trim() : content;
  }

  /**
   * Extract step number from content
   */
  extractStepNumber(content) {
    const match = content.match(/^(SCHRITT|STAP|STEP)\s+(\d+)/i);
    return match ? parseInt(match[2]) : 1;
  }

  /**
   * Create empty result structure
   */
  createEmptyResult() {
    return {
      steps: [],
      variables: [],
      errors: [],
      warnings: [],
      crossReferences: [],
      metadata: {}
    };
  }

  /**
   * Process variable declaration
   */
  processVariable(node, result) {
    // TODO: Implement variable processing
    this.log('📋 Processing variable', { content: node.content });
  }

  /**
   * Process cross-reference
   */
  processCrossReference(node, result) {
    // TODO: Implement cross-reference processing
    this.log('🔗 Processing cross-reference', { content: node.content });
  }

  /**
   * Process VON SCHRITT declaration
   */
  processVonSchritt(node, result) {
    // TODO: Implement VON SCHRITT processing
    this.log('↗️ Processing VON SCHRITT', { content: node.content });
  }

  /**
   * Debug logging
   */
  log(message, data = {}) {
    if (this.debugMode) {
      console.log(message, data);
    }
  }
}