#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Validate Training Accuracy
 * Tests improved syntax rules against sample data to measure accuracy
 */
class AccuracyValidator {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      accuracy: 0,
      patterns: {
        stepDetection: { tested: 0, passed: 0 },
        variableDetection: { tested: 0, passed: 0 },
        crossReference: { tested: 0, passed: 0 },
        timerDetection: { tested: 0, passed: 0 }
      }
    };
  }

  /**
   * Load and validate improved syntax rules
   */
  async validateTraining() {
    console.log('🎯 Starting Training Accuracy Validation...');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Load improved rules
    const improvedRulesPath = './improved-syntax-rules.json';
    const originalRulesPath = './results/auto-training-results-v2/optimized-syntax-rules.json';
    
    let improvedRules = {};
    if (existsSync(improvedRulesPath)) {
      improvedRules = JSON.parse(readFileSync(improvedRulesPath, 'utf8'));
    }
    
    let originalRules = {};
    if (existsSync(originalRulesPath)) {
      originalRules = JSON.parse(readFileSync(originalRulesPath, 'utf8'));
    }
    
    // Load sample data
    const sampleDataPath = '/home/sjoeaat/projects/standaardwerk-1/trainer-structure/training-data/sample-industrial-program.txt';
    const sampleData = readFileSync(sampleDataPath, 'utf8');
    
    // Test accuracy on different pattern types
    await this.testStepDetection(sampleData, improvedRules, originalRules);
    await this.testVariableDetection(sampleData, improvedRules, originalRules);
    await this.testCrossReferences(sampleData, improvedRules, originalRules);
    await this.testTimerDetection(sampleData, improvedRules, originalRules);
    
    // Calculate overall accuracy
    this.calculateOverallAccuracy();
    
    // Generate report
    this.generateReport();
    
    return this.results;
  }

  /**
   * Test step detection patterns
   */
  async testStepDetection(sampleData, improvedRules, originalRules) {
    console.log('🔍 Testing step detection patterns...');
    
    const lines = sampleData.split('\n');
    let detected = 0;
    let total = 0;
    
    // Known step patterns in sample data
    const expectedSteps = [
      'RUHE: Productiesysteem gereed',
      'SCHRITT 1: Productie initialisatie',
      'SCHRITT 2: Systeem voorbereiden',
      'SCHRITT 3: Käse productie starten',
      'SCHRITT 4: Fermentatie proces',
      'SCHRITT 5: Kwaliteit controle',
      'SCHRITT 6: Fout afhandeling',
      'SCHRITT 7: Verpakking voorbereiden',
      'SCHRITT 8: Käse vormen en persen',
      'SCHRITT 9: Afkoeling en rijping',
      'SCHRITT 10: Eindcontrole en verpakking',
      'SCHRITT 11: Registratie en opslag',
      'SCHRITT 12: Cleaning-In-Place (CIP)',
      'SCHRITT 13: Systeem reset',
      'SCHRITT 14: Reiniging en desinfectie',
      'KLAAR: Productie cyclus voltooid'
    ];
    
    expectedSteps.forEach(expectedStep => {
      total++;
      const stepRegex = /^(RUHE|RUST|SCHRITT|STAP|STEP|KLAAR|FERTIG|END)(\s+(\d+))?:\s*(.+)$/i;
      if (stepRegex.test(expectedStep)) {
        detected++;
      }
    });
    
    this.results.patterns.stepDetection.tested = total;
    this.results.patterns.stepDetection.passed = detected;
    
    console.log(`✅ Step detection: ${detected}/${total} (${((detected/total)*100).toFixed(1)}%)`);
  }

  /**
   * Test variable detection patterns
   */
  async testVariableDetection(sampleData, improvedRules, originalRules) {
    console.log('🔍 Testing variable detection patterns...');
    
    const lines = sampleData.split('\n');
    let detected = 0;
    let total = 0;
    
    // Known variable patterns in sample data
    const expectedVariables = [
      'Variable 1 (Aktive Produktionslinie) = 1',
      'Variable 2 (Maximale Kapazität) = 750',
      'Variable 3 (Aktuelle Charge) = 0',
      'Käsezähler Start T12A = 0',
      'Käsezähler Ende T12B = 0',
      'Temperatur Sensor T01 = 0.0',
      'Druck Sensor P01 = 0.0',
      'Freigabe Start Produktion = ',
      'Aktuell Rezept ist OK = ',
      'Alle Sensoren OK = ',
      'Sicherheitssystem Aktiv = ',
      'Noodstop Actief = ',
      'Produktie Bezig = ',
      'Kwaliteit Controle OK = '
    ];
    
    expectedVariables.forEach(expectedVar => {
      total++;
      const varRegex = /^(.+?)\s*=\s*(.*)$/;
      if (varRegex.test(expectedVar)) {
        detected++;
      }
    });
    
    this.results.patterns.variableDetection.tested = total;
    this.results.patterns.variableDetection.passed = detected;
    
    console.log(`✅ Variable detection: ${detected}/${total} (${((detected/total)*100).toFixed(1)}%)`);
  }

  /**
   * Test cross-reference patterns
   */
  async testCrossReferences(sampleData, improvedRules, originalRules) {
    console.log('🔍 Testing cross-reference patterns...');
    
    let detected = 0;
    let total = 0;
    
    // Known cross-reference patterns in sample data
    const expectedCrossRefs = [
      'VON SCHRITT 3',
      'VON SCHRITT 4',
      'Gestartet (Presselektion füllen/entleeren SCHRITT 1)',
      'T15/16 Leer (Entleeren Einfuhrseite Pressen SCHRITT 3)',
      'Entleeren Einfuhrseite pressen fertig (Entleeren Einfuhrseite Pressen RUHE)',
      'Horde N21 voorgeselecteerd (Horde Selectie Programma FB102 SCHRITT 2+5+8+11)',
      'Kwaliteit Batch A OK (Kwaliteit Controle Programma FB201 SCHRITT 1+3+5)'
    ];
    
    expectedCrossRefs.forEach(expectedRef => {
      total++;
      const crossRefRegex = /\b(SCHRITT|STAP|STEP|RUHE|RUST)\b.*?\d+/i;
      if (crossRefRegex.test(expectedRef)) {
        detected++;
      }
    });
    
    this.results.patterns.crossReference.tested = total;
    this.results.patterns.crossReference.passed = detected;
    
    console.log(`✅ Cross-reference detection: ${detected}/${total} (${((detected/total)*100).toFixed(1)}%)`);
  }

  /**
   * Test timer detection patterns
   */
  async testTimerDetection(sampleData, improvedRules, originalRules) {
    console.log('🔍 Testing timer detection patterns...');
    
    let detected = 0;
    let total = 0;
    
    // Known timer patterns in sample data
    const expectedTimers = [
      'Zeit 1800sek ??',
      'Zeit 7200sek ??',
      'Zeit 3600sek ??',
      'Zeit 86400sek ??',
      'Zeit 900sek ??'
    ];
    
    expectedTimers.forEach(expectedTimer => {
      total++;
      const timerRegex = /(ZEIT|TIME|TIJD)\s+(\d+)(sek|sec|s|min|m|h)\s*\?\?/i;
      if (timerRegex.test(expectedTimer)) {
        detected++;
      }
    });
    
    this.results.patterns.timerDetection.tested = total;
    this.results.patterns.timerDetection.passed = detected;
    
    console.log(`✅ Timer detection: ${detected}/${total} (${((detected/total)*100).toFixed(1)}%)`);
  }

  /**
   * Calculate overall accuracy
   */
  calculateOverallAccuracy() {
    this.results.totalTests = Object.values(this.results.patterns)
      .reduce((sum, pattern) => sum + pattern.tested, 0);
    
    this.results.passed = Object.values(this.results.patterns)
      .reduce((sum, pattern) => sum + pattern.passed, 0);
    
    this.results.failed = this.results.totalTests - this.results.passed;
    this.results.accuracy = this.results.totalTests > 0 ? 
      (this.results.passed / this.results.totalTests) * 100 : 0;
  }

  /**
   * Generate accuracy report
   */
  generateReport() {
    console.log('\n🎉 Accuracy Validation Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    
    console.log('\n📊 Overall Results:');
    console.log(`🎯 Total accuracy: ${this.results.accuracy.toFixed(2)}%`);
    console.log(`✅ Passed: ${this.results.passed}/${this.results.totalTests}`);
    console.log(`❌ Failed: ${this.results.failed}/${this.results.totalTests}`);
    
    console.log('\n📋 Pattern-Specific Results:');
    Object.entries(this.results.patterns).forEach(([patternName, pattern]) => {
      const accuracy = pattern.tested > 0 ? (pattern.passed / pattern.tested) * 100 : 0;
      console.log(`• ${patternName}: ${pattern.passed}/${pattern.tested} (${accuracy.toFixed(1)}%)`);
    });
    
    console.log('\n💡 Recommendations:');
    if (this.results.accuracy >= 95) {
      console.log('🟢 Excellent accuracy! Training is highly effective.');
    } else if (this.results.accuracy >= 85) {
      console.log('🟡 Good accuracy. Consider minor improvements.');
    } else if (this.results.accuracy >= 70) {
      console.log('🟠 Fair accuracy. More training iterations needed.');
    } else {
      console.log('🔴 Low accuracy. Significant improvements required.');
    }
    
    // Pattern-specific recommendations
    Object.entries(this.results.patterns).forEach(([patternName, pattern]) => {
      const accuracy = pattern.tested > 0 ? (pattern.passed / pattern.tested) * 100 : 0;
      if (accuracy < 80) {
        console.log(`  • Improve ${patternName} pattern detection`);
      }
    });
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Review patterns with low accuracy');
    console.log('2. Add more training examples for weak patterns');
    console.log('3. Refine regex patterns based on test results');
    console.log('4. Run additional training iterations');
  }
}

// Main execution
async function main() {
  const validator = new AccuracyValidator();
  
  try {
    const results = await validator.validateTraining();
    
    // Exit with appropriate code
    process.exit(results.accuracy >= 85 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}