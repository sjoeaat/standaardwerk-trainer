// =====================================================================
// src/core/enhancedWordParser.js - CLEAN WORD PARSER VERSION
// =====================================================================
// Deze versie herstelt de correcte Word document parsing
// met verbeterde stap herkenning en content conversie
// =====================================================================

import * as mammoth from 'mammoth';
import { buildFolderTree } from './hierarchyBuilder';
import { UnifiedTextParser } from './UnifiedTextParser.js';
import { DEFAULT_VALIDATION_RULES, validateVariableDefinition, validateStepDefinition } from './config/validationRules.js';

// Regex patterns
const PROGRAM_TITLE_REGEX = /^(.*?)\s+(FB|FC)(\d+)/i;
const SYMBOLIK_IDB_REGEX = /Symbolik\s+IDB\s*:\s*(.*)/i;
const TAG_REGEX = /<(h[1-6]|p)>(.*?)<\/\1>/g;

// Helper: strip HTML tags
const stripNestedTags = html =>
  html?.replace(/<[^>]*>?/gm, '') || '';

// Helper: generate IDB name
function generateIdbName(programName) {
  if (!programName) return 'Generated_IDB';
  let name = programName
    .replace(/^[\d\.]+\s*/, '')
    .trim()
    .replace(/:/g, '_')
    .split(' ')
    .map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w)
    .join('');
  return name.replace(/[^a-zA-Z0-9_]/g, '') || 'Generated_IDB';
}

// Helper: converteer Word content naar standaardwerk format
function convertToStandaardwerkFormat(rawContent, syntaxRules) {
  console.log('🔄 Converting to Standaardwerk format...');
  console.log('Raw content:', rawContent);
  
  const allRestWords = syntaxRules.stepKeywords.rest.map(w => w.toUpperCase());
  const allStepWords = syntaxRules.stepKeywords.step.map(w => w.toUpperCase());

  const lines = rawContent
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const outputLines = [];
  let insideStep = false;
  let currentStepOrRust = null;

  for (const line of lines) {
    const upper = line.toUpperCase();

    // Check voor RUST
    const rustMatch = allRestWords.find(word => upper.startsWith(word));
    if (rustMatch) {
      // Format: RUST: beschrijving
      const description = line.substring(rustMatch.length).replace(/^:?\s*/, '').trim();
      outputLines.push(`${rustMatch}: ${description}`);
      insideStep = true;
      currentStepOrRust = 'RUST';
      console.log(`✅ RUST gevonden: ${description}`);
      continue;
    }

    // Check voor STAP met nummer
    const stepRegex = new RegExp(`^(${allStepWords.join('|')})\\s+(\\d+)`, 'i');
    const stepMatch = line.match(stepRegex);
    if (stepMatch) {
      const [, keyword, number] = stepMatch;
      // Format: STAP X: beschrijving
      const afterNumber = line.substring(stepMatch[0].length).replace(/^:?\s*/, '').trim();
      outputLines.push(`${keyword.toUpperCase()} ${number}: ${afterNumber}`);
      insideStep = true;
      currentStepOrRust = `STAP ${number}`;
      console.log(`✅ STAP ${number} gevonden: ${afterNumber}`);
      continue;
    }

    // Als we binnen een stap zijn, voeg content toe ZONDER extra formatting
    if (insideStep) {
      if (line.startsWith('+')) {
        // OR voorwaarde - behoud originele formatting
        outputLines.push(line);
        console.log(`  ↳ OR voorwaarde: ${line}`);
      } else {
        // Normale voorwaarde - behoud originele formatting, geen extra streepjes of tabs!
        outputLines.push(line);
        console.log(`  ↳ Voorwaarde: ${line}`);
      }
    } else {
      // Niet binnen een stap - normale regel
      outputLines.push(line);
    }
  }

  const result = outputLines.join('\n');
  console.log('📋 Converted content:', result);
  return result;
}

export async function parseWordDocument(file, syntaxRules, existingProgramRegistry = new Map()) {
  console.log('🚀 Starting Word document parsing...');
  
  const result = {
    hierarchy: null,
    programs: [],
    errors: [],
    warnings: [],
  };

  const seenFbNumbers = new Set();
  let currentProgram = null;
  const currentPath = [null, null, null, null, null, null];

  const saveCurrentProgram = () => {
    if (!currentProgram) return;

    console.log(`💾 Saving program: ${currentProgram.name}`);

    try {
      // Parse met de nieuwe UnifiedTextParser voor consistente verwerking
      const parser = new UnifiedTextParser(syntaxRules, DEFAULT_VALIDATION_RULES);
      
      // Register existing programs for cross-reference validation
      existingProgramRegistry.forEach((program, name) => {
        parser.registerProgram(name, program);
      });
      
      const fullParseResult = parser.parse(currentProgram.rawContent, 'word', {
        programName: currentProgram.name,
        functionBlock: currentProgram.type + currentProgram.fbNumber,
        filePath: currentProgram.path,
      });
      
      console.log(`📊 Parse result for ${currentProgram.name}:`, {
        steps: fullParseResult.steps.length,
        variables: fullParseResult.variables.length,
        timers: fullParseResult.timers.length,
      });
      
      // Get processed content from parser normalization
      const processedContent = parser.normalizeText(currentProgram.rawContent, 'word');
      
      // Merge de volledige parse resultaten met het programma
      currentProgram = {
        ...currentProgram,
        // Basis info behouden
        name: currentProgram.name,
        type: currentProgram.type,
        fbNumber: currentProgram.fbNumber,
        idbName: currentProgram.idbName || generateIdbName(currentProgram.name),
        
        // Volledige parse resultaten toevoegen
        steps: fullParseResult.steps || [],
        variables: fullParseResult.variables || [],
        timers: fullParseResult.timers || [],
        markers: fullParseResult.markers || [],
        storingen: fullParseResult.storingen || [],
        
        // Extra info uit parser
        transitionConditions: fullParseResult.transitionConditions || [],
        statistics: fullParseResult.statistics || {},
        
        // Parse errors/warnings toevoegen aan programma
        errors: fullParseResult.errors || [],
        warnings: fullParseResult.warnings || [],
        
        // Originele content behouden voor debug
        rawContent: currentProgram.rawContent.trim(),
        processedContent: processedContent,
        
        // Folder info
        folderPath: currentProgram.path,
        fullTitle: currentProgram.fullTitle,
      };

      // Log stappen voor debug
      if (currentProgram.steps.length > 0) {
        console.log(`✅ Stappen gevonden voor ${currentProgram.name}:`);
        currentProgram.steps.forEach(step => {
          console.log(`  - ${step.type} ${step.number}: ${step.description}`);
          if (step.conditions && step.conditions.length > 0) {
            step.conditions.forEach(cond => {
              console.log(`    • ${cond}`);
            });
          }
        });
      } else {
        console.warn(`⚠️ Geen stappen gevonden voor ${currentProgram.name}`);
      }

      // Voeg parse errors toe aan globale errors
      if (currentProgram.errors.length > 0) {
        result.errors.push(...currentProgram.errors.map(e => ({
          program: currentProgram.name,
          ...e,
        })));
      }

      result.programs.push(currentProgram);
    } catch (e) {
      console.error(`❌ Error parsing ${currentProgram.name}:`, e);
      result.warnings.push(`Analysefout in "${currentProgram.name}": ${e.message}`);
      // Voeg programma toch toe, maar met foutindicatie
      currentProgram.parseError = e.message;
      currentProgram.steps = [];
      currentProgram.variables = [];
      currentProgram.timers = [];
      currentProgram.markers = [];
      currentProgram.storingen = [];
      result.programs.push(currentProgram);
    }

    currentProgram = null;
  };

  try {
    if (!window.mammoth) {
      throw new Error('Mammoth.js niet beschikbaar');
    }

    const options = {
      styleMap: [
        'p[style-name=\'Heading 1\'] => h1:fresh',
        'p[style-name=\'Heading 2\'] => h2:fresh',
        'p[style-name=\'Heading 3\'] => h3:fresh',
        'p[style-name=\'Heading 4\'] => h4:fresh',
        'p[style-name=\'Heading 5\'] => h5:fresh',
        'p[style-name=\'Heading 6\'] => h6:fresh',
      ],
    };

    console.log('📄 Converting Word document to HTML...');
    const { value: html } = await window.mammoth.convertToHtml(
      { arrayBuffer: await file.arrayBuffer() },
      options,
    );

    // Parse HTML structuur
    const structured = [];
    let m;
    while ((m = TAG_REGEX.exec(html)) !== null) {
      structured.push({
        type: m[1],
        content: stripNestedTags(m[2]).trim(),
      });
    }

    console.log(`📊 Found ${structured.length} HTML elements`);

    let started = false;
    let collectingContent = false;
    let contentBuffer = [];

    for (const item of structured) {
      if (!started && item.type.startsWith('h')) started = true;
      if (!started) continue;

      const txt = item.content;
      const programMatch = txt.match(PROGRAM_TITLE_REGEX);

      if (programMatch) {
        // Save vorige programma
        if (currentProgram && contentBuffer.length > 0) {
          currentProgram.rawContent = contentBuffer.join('\n');
          saveCurrentProgram();
        }

        // Start nieuw programma
        const lvl = item.type.startsWith('h') ? parseInt(item.type[1], 10) - 1 : -1;
        const pathCopy = [...currentPath];
        if (lvl >= 0) {
          for (let i = lvl + 1; i < pathCopy.length; i++) {
            pathCopy[i] = null;
          }
        }

        const [, name, type, numStr] = programMatch;
        const num = parseInt(numStr, 10);

        console.log(`📌 Found program: ${name.trim()} ${type}${num}`);

        currentProgram = {
          path: pathCopy.filter(p => p),
          fullTitle: txt,
          name: name.trim(),
          type: type.toUpperCase(),
          fbNumber: num,
          idbName: null,
          rawContent: '',
        };
        
        console.log(`📁 Created program with path: [${currentProgram.path.join(' → ')}] for "${currentProgram.name}"`);

        contentBuffer = [];
        collectingContent = true;

        if (seenFbNumbers.has(num)) {
          result.warnings.push(`Dubbel FB/FC nummer ${num} bij "${name.trim()}"`);
        }
        seenFbNumbers.add(num);

      } else if (collectingContent && item.type === 'p') {
        // Voeg content toe aan buffer
        const lines = txt.split('\n').map(l => l.trim()).filter(l => l);
        
        for (const line of lines) {
          // Check voor Symbolik IDB
          const idbMatch = line.match(SYMBOLIK_IDB_REGEX);
          if (idbMatch && currentProgram) {
            currentProgram.idbName = idbMatch[1].trim();
            console.log(`  ↳ IDB naam: ${currentProgram.idbName}`);
          }
          
          // Voeg alle content toe
          contentBuffer.push(line);
        }
      }

      // Update path voor hierarchy
      if (item.type.startsWith('h')) {
        const lvl = parseInt(item.type[1], 10) - 1;
        if (lvl >= 0 && lvl < currentPath.length) {
          const pathSegment = txt.split('\t')[0];
          currentPath[lvl] = pathSegment;
          console.log(`🗂️ Updated path level ${lvl}: "${pathSegment}" → [${currentPath.filter(p => p).join(' → ')}]`);
          for (let j = lvl + 1; j < currentPath.length; j++) {
            currentPath[j] = null;
          }
        }
      }
    }

    // Save laatste programma
    if (currentProgram && contentBuffer.length > 0) {
      currentProgram.rawContent = contentBuffer.join('\n');
      saveCurrentProgram();
    }

    // Debug: Log alle programma's voor bouw van hierarchy
    console.log('🏗️ Building hierarchy with programs:', result.programs.length);
    result.programs.forEach(prog => {
      console.log(`  📁 Program: ${prog.name}, Path: [${prog.folderPath?.join(' → ') || 'NO PATH'}]`);
    });

    // Bouw hierarchy
    result.hierarchy = buildFolderTree(result.programs);
    console.log('🏗️ Built hierarchy:', result.hierarchy);

    // Voeg globale statistieken toe
    result.statistics = {
      totalPrograms: result.programs.length,
      totalSteps: result.programs.reduce((sum, p) => sum + (p.steps?.length || 0), 0),
      totalVariables: result.programs.reduce((sum, p) => sum + (p.variables?.length || 0), 0),
      totalTimers: result.programs.reduce((sum, p) => sum + (p.timers?.length || 0), 0),
      totalMarkers: result.programs.reduce((sum, p) => sum + (p.markers?.length || 0), 0),
      totalStoringen: result.programs.reduce((sum, p) => sum + (p.storingen?.length || 0), 0),
    };

    console.log('✅ Word parsing complete:', result.statistics);

  } catch (err) {
    console.error('❌ Parser fout:', err);
    result.errors.push(`Lezen Word-document mislukt: ${err.message}`);
  }

  return result;
}

// Enhanced export functie die ook de volledige parse data meeneemt
export function enrichProgramForExport(program, syntaxRules) {
  // Als het programma al volledig geparsed is, return as-is
  if (program.steps && program.steps.length > 0) {
    return program;
  }

  // Anders, parse het opnieuw
  try {
    const standardwerkContent = convertToStandaardwerkFormat(program.rawContent, syntaxRules);
    const parser = new LogicParser(syntaxRules);
    const fullParseResult = parser.parse(standardwerkContent);
    
    return {
      ...program,
      ...fullParseResult,
      name: program.name,
      type: program.type,
      fbNumber: program.fbNumber,
      idbName: program.idbName,
    };
  } catch (e) {
    console.error(`Error parsing program ${program.name}:`, e);
    return program;
  }
}