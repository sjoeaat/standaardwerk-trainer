// =====================================================================
// src/core/LogicParser.js - Centrale Parsing Engine
// =====================================================================
// Deze module consolideert alle parsing logica voor zowel handmatige 
// invoer als Word-document import naar één herbruikbare engine.
// =====================================================================

/**
 * Centrale parsing engine die standaardwerk tekst parseert naar gestructureerde objecten
 * Gebruikt door zowel handmatige invoer als Word-document import
 */
export class LogicParser {
  constructor(syntaxRules) {
    this.syntaxRules = syntaxRules;
    this.result = this.createEmptyResult();
  }

  /**
   * Hoofdfunctie die tekst parseert naar gestructureerd object
   * @param {string} code - De tekst om te parsen
   * @param {Object} metadata - Extra metadata (bijv. programName, fbNumber)
   * @returns {Object} Geparseerd resultaat
   */
  parse(code, metadata = {}) {
    // Reset result voor nieuwe parsing
    this.result = this.createEmptyResult();
    
    // Merge metadata
    Object.assign(this.result, metadata);

    const lines = code.split('\n');
    let currentStep = null;
    let pendingConditions = [];
    let currentVariableDefinition = null;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        this.handleEmptyLine(pendingConditions, currentVariableDefinition);
        return;
      }

      // Parse verschillende regel types
      if (this.tryParseHeader(line, lineNumber)) return;
      if (this.tryParseSymbolik(line, lineNumber)) return;
      if (this.tryParseVariable(line, lineNumber, currentVariableDefinition, pendingConditions)) {
        currentVariableDefinition = this.getLastVariableDefinition();
        pendingConditions = [];
        return;
      }
      if (this.tryParseStep(line, lineNumber, currentStep, pendingConditions)) {
        // KRITIEKE FIX: currentStep moet direct na step parsing worden bijgewerkt
        // zodat volgende conditions bij de juiste stap horen
        currentStep = this.getLastStep();
        pendingConditions = [];
        return;
      }
      
      // Parse voorwaarden - Deze horen bij de HUIDIGE stap (die net is aangemaakt)
      // NIET bij de vorige stap die in currentStep stond voor de step parsing
      this.tryParseCondition(line, lineNumber, currentStep, currentVariableDefinition, pendingConditions);
    });

    // Finaliseer laatste variabele definitie
    this.finalizeCurrentVariable(currentVariableDefinition, pendingConditions);

    // Bereken statistieken
    this.calculateStatistics();

    return this.result;
  }

  createEmptyResult() {
    return {
      programName: '',
      functionBlock: '',
      symbolikIDB: '',
      steps: [],
      variables: [],
      timers: [],
      markers: [],
      storingen: [],
      errors: [],
      warnings: [],
      statistics: {
        totalSteps: 0,
        totalConditions: 0,
        totalVariables: 0,
        externalReferences: 0,
        complexityScore: 0,
      },
    };
  }

  handleEmptyLine(pendingConditions, currentVariableDefinition) {
    if (pendingConditions.length > 0 && currentVariableDefinition) {
      currentVariableDefinition.conditions = [...pendingConditions];
      pendingConditions.length = 0;
    }
  }

  tryParseHeader(line, lineNumber) {
    const isIndented = /^\s/.test(line);
    
    if (!this.result.programName && !isIndented) {
      const headerMatch = line.match(/^(.+?)\s+(FB\d+)$/);
      if (headerMatch) {
        this.result.programName = headerMatch[1].trim();
        this.result.functionBlock = headerMatch[2].trim();
        return true;
      } else if (!line.includes(':')) {
        this.result.programName = line.trim();
        return true;
      }
    }
    return false;
  }

  tryParseSymbolik(line, lineNumber) {
    if (line.startsWith('Symbool IDB:') || line.startsWith('Symbolik IDB:')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex >= 0) {
        this.result.symbolikIDB = line.substring(colonIndex + 1).trim();
        return true;
      }
    }
    return false;
  }

  /**
   * Detecteert of een regel een voorwaarde is met programma-verwijzingen
   * Voorkomt dat verwijzingen naar andere programma's worden herkend als stappen
   */
  isConditionWithProgramReference(line) {
    // Patterns die duiden op programma-verwijzingen binnen voorwaarden:
    // - "NICHT aktiv (T10: Positionieren Einfuhrwagen) RUHE"
    // - "Gestartet (T10: Positionieren Einfuhrwagen NICHT RUHE)"
    // - "Fertig (T10: Positionieren Einfuhrwagen RUHE)"
    
    // Check voor parentheses met programma-verwijzingen
    const programReferencePattern = /\([^)]*:\s*[^)]*\)/;
    if (programReferencePattern.test(line)) {
      return true;
    }
    
    // Check voor step keywords die NIET aan het begin staan
    const stepKeywords = [
      ...this.syntaxRules.stepKeywords.rest,
      ...this.syntaxRules.stepKeywords.step,
    ];
    
    for (const keyword of stepKeywords) {
      const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
      if (keywordIndex > 0) { // Niet aan het begin
        // Check of het keyword voorkomt in een context van een voorwaarde
        const beforeKeyword = line.substring(0, keywordIndex).trim();
        if (beforeKeyword.length > 0 && !beforeKeyword.endsWith(':')) {
          return true;
        }
      }
    }
    
    return false;
  }

  tryParseVariable(line, lineNumber, currentVariableDefinition, pendingConditions) {
    const variableMatch = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*=/);
    const isIndented = /^\s/.test(line);
    
    if (variableMatch && !isIndented) {
      // Finaliseer vorige variabele
      this.finalizeCurrentVariable(currentVariableDefinition, pendingConditions);

      const newVariable = {
        name: variableMatch[1],
        type: this.detectVariableType(variableMatch[1]),
        conditions: [],
        lineNumber,
      };

      this.addVariableToResult(newVariable);
      return true;
    }
    return false;
  }

  tryParseStep(line, lineNumber, currentStep, pendingConditions) {
    const trimmedLine = line.trim();
    
    // KRITIEKE FIX: Voorkom dat verwijzingen naar andere programma's worden herkend als stappen
    // Check eerst of de regel een condition is die verwijzingen bevat
    if (this.isConditionWithProgramReference(trimmedLine)) {
      return false;
    }
    
    // VERBETERD: Strengere regex die alleen echte stap-definities accepteert
    // Moet beginnen met step keyword gevolgd door : of nummer:
    const stepPattern = new RegExp(
      `^(${this.syntaxRules.stepKeywords.rest.join('|')}|${this.syntaxRules.stepKeywords.step.join('|')})(?:\\s*(\\d+))?\\s*[:]\\s*(.*)$`, 
      'i',
    );
    const stepMatch = trimmedLine.match(stepPattern);
    
    // Debug logging voor step matching
    console.log(`🔍 Step parsing: "${trimmedLine}" -> ${stepMatch ? 'MATCH' : 'NO MATCH'}`);
    if (stepMatch) {
      console.log(`  ✅ Keyword: "${stepMatch[1]}", Number: "${stepMatch[2]}", Description: "${stepMatch[3]}"`);
    }

    if (stepMatch) {
      // Finaliseer vorige stap
      this.finalizeCurrentStep(currentStep, pendingConditions);

      const type = this.syntaxRules.stepKeywords.rest.some(k =>
        k.toLowerCase() === stepMatch[1].toLowerCase()) ? 'RUST' : 'STAP';

      const newStep = {
        type: type,
        number: type === 'RUST' ? 0 : parseInt(stepMatch[2]) || 0,
        description: stepMatch[3] || '',
        conditions: [], // Simpele flat array voor conditions binnen de stap
        transitionConditions: [], // Complexere structuur voor transitie logica
        timers: [],
        markers: [],
        storingen: [],
        lineNumber,
      };

      this.result.steps.push(newStep);
      return true;
    }
    return false;
  }

  tryParseCondition(line, lineNumber, currentStep, currentVariableDefinition, pendingConditions) {
    if (!currentStep && !currentVariableDefinition) return false;

    let conditionText = line.trim();
    const isOr = conditionText.startsWith('+ ');
    if (isOr) {
      conditionText = conditionText.substring(2).trim();
    }

    // Debug logging voor condition assignment
    if (currentStep) {
      console.log(`🔗 Assigning condition "${conditionText}" to step ${currentStep.type} ${currentStep.number} (line ${lineNumber})`);
    }

    const isNegated = /^(NIET|NOT|NICHT)\s+/i.test(conditionText);
    if (isNegated) {
      conditionText = conditionText.replace(/^(NIET|NOT|NICHT)\s+/i, '').trim();
    }

    const hasExternalRef = /\*([^*]+)\*/.test(conditionText);
    if (hasExternalRef) {
      this.result.statistics.externalReferences++;
    }

    const timeMatch = conditionText.match(/(?:TIJD|ZEIT|TIME)\s*~\s*(\d+)\s*(Sek|Min|s|m)/i);
    const isTimeCondition = !!timeMatch;

    const comparisonMatch = conditionText.match(/^([a-zA-Z0-9_.\[\]]+)\s*(==|!=|<>|>=|<=|>|<)\s*(.+)$/);
    let comparisonData = null;
    if (comparisonMatch) {
      comparisonData = {
        variable: comparisonMatch[1].trim(),
        operator: comparisonMatch[2],
        value: comparisonMatch[3].trim().replace(/["']/g, ''),
      };
    }

    const condition = {
      text: conditionText,
      negated: isNegated,
      hasExternalRef: hasExternalRef,
      isTimeCondition: isTimeCondition,
      hasComparison: !!comparisonData,
      comparison: comparisonData,
      lineNumber,
      operator: isOr ? 'OR' : 'AND',
    };

    // Voeg condition toe aan juiste target
    if (currentStep) {
      this.addConditionToStep(currentStep, condition, isOr);
      this.result.statistics.totalConditions++;
      
      // Extract en categoriseer variabelen uit de condition
      this.extractVariablesFromCondition(condition, currentStep);
    } else if (currentVariableDefinition) {
      pendingConditions.push(condition);
    }

    return true;
  }

  addConditionToStep(step, condition, isOr) {
    // Voeg toe aan simpele flat array
    step.conditions.push(condition.text);

    // Voeg toe aan complexere transitie structuur
    if (isOr && step.transitionConditions.length > 0) {
      step.transitionConditions.push({
        type: 'group',
        operator: 'OR',
        conditions: [condition],
      });
    } else if (step.transitionConditions.length === 0) {
      step.transitionConditions.push({
        type: 'group',
        operator: 'AND',
        conditions: [condition],
      });
    } else {
      const lastGroup = step.transitionConditions[step.transitionConditions.length - 1];
      lastGroup.conditions.push(condition);
    }
  }

  extractVariablesFromCondition(condition, step) {
    const text = condition.text.toLowerCase();
    
    // Detecteer timers
    if (condition.isTimeCondition || 
        this.syntaxRules.variableDetection.timerKeywords.some(keyword => 
          text.includes(keyword.toLowerCase()))) {
      const timerName = this.extractVariableName(condition.text, 'timer');
      if (timerName && !step.timers.includes(timerName)) {
        step.timers.push(timerName);
      }
    }
    
    // Detecteer markers
    if (this.syntaxRules.variableDetection.markerKeywords.some(keyword => 
      text.includes(keyword.toLowerCase()))) {
      const markerName = this.extractVariableName(condition.text, 'marker');
      if (markerName && !step.markers.includes(markerName)) {
        step.markers.push(markerName);
      }
    }
    
    // Detecteer storingen
    if (this.syntaxRules.variableDetection.storingKeywords.some(keyword => 
      text.includes(keyword.toLowerCase()))) {
      const storingName = this.extractVariableName(condition.text, 'storing');
      if (storingName && !step.storingen.includes(storingName)) {
        step.storingen.push(storingName);
      }
    }
  }

  extractVariableName(text, type) {
    // Simpele extractie - kan verfijnd worden
    const words = text.split(/\s+/);
    return words.find(word => 
      word.length > 2 && 
      /^[a-zA-Z]/.test(word) && 
      !['NIET', 'NOT', 'NICHT', 'EN', 'AND', 'OF', 'OR'].includes(word.toUpperCase()),
    ) || `${type}_variabele`;
  }

  detectVariableType(name) {
    if (!name) return 'variable';
    const lowerName = name.toLowerCase();

    if (this.syntaxRules.variableDetection.storingKeywords.some(keyword =>
      lowerName.startsWith(keyword.toLowerCase()))) {
      return 'storing';
    }

    if (this.syntaxRules.variableDetection.timerKeywords.some(keyword =>
      lowerName.includes(keyword.toLowerCase()))) {
      return 'timer';
    }

    if (this.syntaxRules.variableDetection.markerKeywords.some(keyword =>
      lowerName.includes(keyword.toLowerCase()))) {
      return 'marker';
    }

    return 'variable';
  }

  addVariableToResult(variable) {
    if (variable.type === 'timer') {
      this.result.timers.push(variable);
    } else if (variable.type === 'marker') {
      this.result.markers.push(variable);
    } else if (variable.type === 'storing') {
      this.result.storingen.push(variable);
    } else {
      this.result.variables.push(variable);
    }
  }

  finalizeCurrentVariable(currentVariableDefinition, pendingConditions) {
    if (currentVariableDefinition && pendingConditions.length > 0) {
      currentVariableDefinition.conditions = [...pendingConditions];
      pendingConditions.length = 0;
    }
  }

  finalizeCurrentStep(currentStep, pendingConditions) {
    if (currentStep && pendingConditions.length > 0) {
      currentStep.transitionConditions = [{
        type: 'group',
        operator: 'AND',
        conditions: [...pendingConditions],
      }];
      pendingConditions.length = 0;
    }
  }

  getLastVariableDefinition() {
    const allVariables = [
      ...this.result.variables,
      ...this.result.timers,
      ...this.result.markers,
      ...this.result.storingen,
    ];
    return allVariables[allVariables.length - 1] || null;
  }

  getLastStep() {
    return this.result.steps[this.result.steps.length - 1] || null;
  }

  calculateStatistics() {
    this.result.statistics.totalSteps = this.result.steps.length;
    this.result.statistics.totalVariables = 
      this.result.variables.length + 
      this.result.timers.length +
      this.result.markers.length + 
      this.result.storingen.length;
    
    this.result.statistics.complexityScore = Math.round(
      this.result.statistics.totalSteps * 2 +
      this.result.statistics.totalConditions * 1.5 +
      this.result.statistics.totalVariables * 1.2 +
      this.result.statistics.externalReferences * 3,
    );
  }
}

/**
 * Convenience functie die de oude parseStandaardwerk interface nabootst
 * voor backward compatibility
 */
export function parseStandaardwerk(code, syntaxRules) {
  const parser = new LogicParser(syntaxRules);
  return parser.parse(code);
}