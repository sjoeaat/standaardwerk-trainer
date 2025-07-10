#!/usr/bin/env node
// Test the four specific parsing problems identified

import { AdvancedParser } from './src/core/AdvancedParser.js';
import { DEFAULT_VALIDATION_RULES } from './src/config/validationRules.js';

// Test content with the four specific problems
const problematicContent = `Hauptprogramm Test FB300

// Test problem 1: Transition rules split across lines
SCHRITT 1: Start process
+ von
SCHRITT 13

// Test problem 2: HTML entities not decoded
SCHRITT 1 &amp; NICHT RUHE
Condition &lt; 10
"Text with &quot;quotes&quot;"

// Test problem 3: Line breaks in assignments
Variable 1 (Aktive Einfuhrhorde) =
= 21
Variable 2 (Maximale Kapazität) =
= 100

// Test problem 4: OR-structures lose logical grouping
SCHRITT 2: Wait for release
[
  Horde N21 vorselektiert (SCHRITT 2)
  + Horde N22 vorselektiert (SCHRITT 5)
  + Horde N23 vorselektiert (SCHRITT 8)
]

// Additional complex cases
SCHRITT 3: Complex conditions
Zeit 300sek ??
Temperatur &lt; 25.0 &amp; Druck &gt; 1.5
NICHT Störung: Käse am Blockierung Tank A

// Mixed cases
+
von SCHRITT 15
Freigabe Start =
= RUHE`;

async function testPreprocessingIssues() {
  console.log('🧪 Testing preprocessing issue fixes...');
  console.log('');
  
  // Test without preprocessing (show problems)
  console.log('❌ BEFORE: Parsing without preprocessing');
  const parserBasic = new AdvancedParser({}, DEFAULT_VALIDATION_RULES);
  
  // Disable preprocessing temporarily to show difference
  const originalPreprocess = parserBasic.preprocessor.preprocess;
  parserBasic.preprocessor.preprocess = text => text; // Pass through
  
  const resultBefore = parserBasic.parseText(problematicContent);
  console.log('Raw parsing results:');
  console.log(`  Steps: ${resultBefore.steps.length}`);
  console.log(`  Variables: ${resultBefore.variables.length}`);
  console.log(`  Conditions: ${resultBefore.conditions.length}`);
  console.log(`  Errors: ${resultBefore.errors.length}`);
  
  // Show some of the problematic lines
  console.log('\nProblematic lines detected:');
  resultBefore.errors.slice(0, 5).forEach(error => {
    console.log(`  Line ${error.lineNumber}: ${error.message}`);
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test with preprocessing (show improvements)
  console.log('✅ AFTER: Parsing with preprocessing');
  const parserAdvanced = new AdvancedParser({}, DEFAULT_VALIDATION_RULES);
  
  // Restore preprocessing
  parserAdvanced.preprocessor.preprocess = originalPreprocess;
  
  const resultAfter = parserAdvanced.parseText(problematicContent);
  
  console.log('Advanced parsing results:');
  console.log(`  Steps: ${resultAfter.steps.length}`);
  console.log(`  Variables: ${resultAfter.variables.length}`);
  console.log(`  Variable Assignments: ${resultAfter.variableAssignments.length}`);
  console.log(`  Comments: ${resultAfter.comments.length}`);
  console.log(`  OR Blocks: ${resultAfter.orBlocks.length}`);
  console.log(`  Conditions: ${resultAfter.conditions.length}`);
  console.log(`  Compound Conditions: ${resultAfter.compoundConditions.length}`);
  console.log(`  Errors: ${resultAfter.errors.length}`);
  
  // Show preprocessing statistics
  console.log('\n📊 Preprocessing Statistics:');
  const stats = resultAfter.preprocessingStats;
  console.log(`  Original lines: ${stats.originalLines}`);
  console.log(`  Processed lines: ${stats.processedLines}`);
  console.log(`  Line reduction: ${(stats.reductionRatio * 100).toFixed(1)}%`);
  console.log(`  HTML entities found: ${stats.htmlEntitiesFound}`);
  
  // Show specific fixes
  console.log('\n🔧 Specific Issue Fixes:');
  
  // Problem 1: Transition rules
  console.log('\n1. Transition Rules:');
  resultAfter.compoundConditions.forEach(condition => {
    if (condition.type === 'transition_rule') {
      console.log(`   ✅ Fixed: "${condition.originalText}" → ${condition.subtype} SCHRITT ${condition.targetStep}`);
    }
  });
  
  // Problem 2: HTML entities
  console.log('\n2. HTML Entity Decoding:');
  resultAfter.compoundConditions.forEach(condition => {
    if (condition.originalText && (condition.originalText.includes('&') || condition.originalText.includes('<'))) {
      console.log(`   ✅ Decoded: "${condition.originalText}"`);
    }
  });
  resultAfter.conditions.forEach(condition => {
    if (condition.rawText && (condition.rawText.includes('&') || condition.rawText.includes('<'))) {
      console.log(`   ✅ Decoded: "${condition.rawText}"`);
    }
  });
  
  // Problem 3: Variable assignments
  console.log('\n3. Variable Assignments:');
  resultAfter.variableAssignments.forEach(assignment => {
    console.log(`   ✅ Fixed: ${assignment.name} = ${assignment.value}`);
  });
  
  // Problem 4: OR-blocks
  console.log('\n4. OR-Block Structure:');
  resultAfter.orBlocks.forEach(block => {
    console.log(`   ✅ OR-Block preserved (${block.items.length} items):`);
    block.items.forEach(item => {
      console.log(`      - ${item.condition}`);
    });
  });
  
  // Show remaining errors
  if (resultAfter.errors.length > 0) {
    console.log('\n⚠️  Remaining Issues:');
    resultAfter.errors.slice(0, 3).forEach(error => {
      console.log(`  Line ${error.lineNumber}: ${error.message}`);
    });
  }
  
  console.log('\n🎯 Improvement Summary:');
  console.log(`  Error reduction: ${resultBefore.errors.length} → ${resultAfter.errors.length} (${Math.round((1 - resultAfter.errors.length / resultBefore.errors.length) * 100)}% improvement)`);
  console.log(`  Variable assignments detected: ${resultAfter.variableAssignments.length}`);
  console.log(`  OR-blocks preserved: ${resultAfter.orBlocks.length}`);
  
  return resultAfter;
}

// Run the test
testPreprocessingIssues().catch(console.error);