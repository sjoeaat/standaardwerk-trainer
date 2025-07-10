// =====================================================================
// src/core/XmlComparisonValidator.js - XML Comparison Validation
// =====================================================================
// Validates parser output against TIA Portal XML exports
// Helps ensure parsing accuracy and detect regression issues
// =====================================================================

/**
 * XML Comparison Validator for TIA Portal compatibility
 */
export class XmlComparisonValidator {
  constructor() {
    // Expected XML structure patterns
    this.xmlPatterns = {
      // TIA Portal step patterns
      stepPattern: /<Network\s+Title="SCHRITT\s+(\d+)"/g,
      stepDescription: /<Network\s+Title="SCHRITT\s+(\d+)"\s*>\s*<Comment>([^<]+)<\/Comment>/g,
      
      // Variable declarations
      variablePattern: /<Member\s+Name="([^"]+)"\s+Datatype="([^"]+)"/g,
      
      // FB references
      fbReference: /<FB\s+Name="([^"]+)"\s+Number="(\d+)"/g,
      
      // Conditions and logic
      conditionPattern: /<Condition[^>]*>([^<]+)<\/Condition>/g,
      
      // Cross-references
      crossRefPattern: /<Call\s+FB="([^"]+)"\s+Step="([^"]+)"/g,
    };
    
    // Validation rules
    this.validationRules = {
      stepNumberSequence: true,
      variableTypeConsistency: true,
      crossReferenceIntegrity: true,
      commentPreservation: true,
    };
  }

  /**
   * Validate parser output against XML reference
   */
  validateAgainstXml(parseResult, xmlContent) {
    const xmlData = this.parseXmlContent(xmlContent);
    const validationResult = {
      passed: true,
      errors: [],
      warnings: [],
      statistics: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
      },
      details: {},
    };

    // Run validation tests
    this.validateSteps(parseResult, xmlData, validationResult);
    this.validateVariables(parseResult, xmlData, validationResult);
    this.validateCrossReferences(parseResult, xmlData, validationResult);
    this.validateComments(parseResult, xmlData, validationResult);

    // Calculate final statistics
    validationResult.statistics.totalTests = validationResult.statistics.passedTests + validationResult.statistics.failedTests;
    validationResult.passed = validationResult.statistics.failedTests === 0;

    return validationResult;
  }

  /**
   * Parse XML content to extract validation data
   */
  parseXmlContent(xmlContent) {
    const xmlData = {
      steps: [],
      variables: [],
      crossReferences: [],
      comments: [],
    };

    // Extract steps
    let match;
    while ((match = this.xmlPatterns.stepPattern.exec(xmlContent)) !== null) {
      xmlData.steps.push({
        number: parseInt(match[1]),
        title: match[0],
      });
    }

    // Extract step descriptions/comments
    this.xmlPatterns.stepDescription.lastIndex = 0;
    while ((match = this.xmlPatterns.stepDescription.exec(xmlContent)) !== null) {
      const stepNumber = parseInt(match[1]);
      const comment = match[2];
      xmlData.comments.push({
        stepNumber,
        comment: comment.trim(),
      });
    }

    // Extract variables
    this.xmlPatterns.variablePattern.lastIndex = 0;
    while ((match = this.xmlPatterns.variablePattern.exec(xmlContent)) !== null) {
      xmlData.variables.push({
        name: match[1],
        datatype: match[2],
      });
    }

    // Extract cross-references
    this.xmlPatterns.crossRefPattern.lastIndex = 0;
    while ((match = this.xmlPatterns.crossRefPattern.exec(xmlContent)) !== null) {
      xmlData.crossReferences.push({
        fb: match[1],
        step: match[2],
      });
    }

    return xmlData;
  }

  /**
   * Validate step parsing
   */
  validateSteps(parseResult, xmlData, validationResult) {
    const testName = 'Step Validation';
    validationResult.details[testName] = {
      passed: true,
      issues: [],
    };

    // Check step count
    const parsedSteps = parseResult.steps.filter(s => s.type === 'SCHRITT');
    const xmlSteps = xmlData.steps;

    if (parsedSteps.length !== xmlSteps.length) {
      validationResult.details[testName].passed = false;
      validationResult.details[testName].issues.push({
        type: 'count_mismatch',
        expected: xmlSteps.length,
        actual: parsedSteps.length,
        message: `Step count mismatch: expected ${xmlSteps.length}, got ${parsedSteps.length}`,
      });
    }

    // Check step numbers
    const parsedStepNumbers = parsedSteps.map(s => s.number).sort((a, b) => a - b);
    const xmlStepNumbers = xmlSteps.map(s => s.number).sort((a, b) => a - b);

    for (let i = 0; i < Math.min(parsedStepNumbers.length, xmlStepNumbers.length); i++) {
      if (parsedStepNumbers[i] !== xmlStepNumbers[i]) {
        validationResult.details[testName].passed = false;
        validationResult.details[testName].issues.push({
          type: 'step_number_mismatch',
          expected: xmlStepNumbers[i],
          actual: parsedStepNumbers[i],
          message: `Step number mismatch at position ${i}: expected ${xmlStepNumbers[i]}, got ${parsedStepNumbers[i]}`,
        });
      }
    }

    // Update overall validation result
    if (validationResult.details[testName].passed) {
      validationResult.statistics.passedTests++;
    } else {
      validationResult.statistics.failedTests++;
      validationResult.errors.push(...validationResult.details[testName].issues);
    }
  }

  /**
   * Validate variable parsing
   */
  validateVariables(parseResult, xmlData, validationResult) {
    const testName = 'Variable Validation';
    validationResult.details[testName] = {
      passed: true,
      issues: [],
    };

    const parsedVariables = parseResult.variables || [];
    const xmlVariables = xmlData.variables;

    // Check common variables
    const commonVariables = ['Stap', 'Hulp', 'Tijd', 'Teller'];
    commonVariables.forEach(varName => {
      const foundInXml = xmlVariables.some(v => v.name === varName);
      const foundInParsed = parsedVariables.some(v => v.name === varName);

      if (foundInXml && !foundInParsed) {
        validationResult.details[testName].passed = false;
        validationResult.details[testName].issues.push({
          type: 'missing_variable',
          variable: varName,
          message: `Variable "${varName}" found in XML but not in parsed result`,
        });
      }
    });

    // Update overall validation result
    if (validationResult.details[testName].passed) {
      validationResult.statistics.passedTests++;
    } else {
      validationResult.statistics.failedTests++;
      validationResult.errors.push(...validationResult.details[testName].issues);
    }
  }

  /**
   * Validate cross-references
   */
  validateCrossReferences(parseResult, xmlData, validationResult) {
    const testName = 'Cross Reference Validation';
    validationResult.details[testName] = {
      passed: true,
      issues: [],
    };

    const parsedCrossRefs = parseResult.crossReferences || [];
    const xmlCrossRefs = xmlData.crossReferences;

    // Check if major cross-references are preserved
    xmlCrossRefs.forEach(xmlRef => {
      const foundInParsed = parsedCrossRefs.some(pRef => 
        pRef.program && pRef.program.includes(xmlRef.fb) ||
        pRef.rawText && pRef.rawText.includes(xmlRef.fb),
      );

      if (!foundInParsed) {
        validationResult.details[testName].issues.push({
          type: 'missing_cross_reference',
          reference: xmlRef,
          message: `Cross-reference to ${xmlRef.fb} SCHRITT ${xmlRef.step} not found in parsed result`,
        });
      }
    });

    // If we have issues, mark as failed
    if (validationResult.details[testName].issues.length > 0) {
      validationResult.details[testName].passed = false;
    }

    // Update overall validation result
    if (validationResult.details[testName].passed) {
      validationResult.statistics.passedTests++;
    } else {
      validationResult.statistics.failedTests++;
      validationResult.errors.push(...validationResult.details[testName].issues);
    }
  }

  /**
   * Validate comments and descriptions
   */
  validateComments(parseResult, xmlData, validationResult) {
    const testName = 'Comment Validation';
    validationResult.details[testName] = {
      passed: true,
      issues: [],
    };

    const parsedComments = parseResult.comments || [];
    const xmlComments = xmlData.comments;

    // Check if step descriptions are preserved
    xmlComments.forEach(xmlComment => {
      const foundInParsed = parsedComments.some(pComment => 
        pComment.content && pComment.content.includes(xmlComment.comment.substring(0, 20)),
      );

      if (!foundInParsed) {
        validationResult.details[testName].issues.push({
          type: 'missing_comment',
          comment: xmlComment,
          message: `Comment for SCHRITT ${xmlComment.stepNumber} not preserved: "${xmlComment.comment}"`,
        });
      }
    });

    // If we have issues, mark as failed (but as warnings, not errors)
    if (validationResult.details[testName].issues.length > 0) {
      validationResult.details[testName].passed = false;
      validationResult.warnings.push(...validationResult.details[testName].issues);
    }

    // Update overall validation result (comments are warnings, not failures)
    validationResult.statistics.passedTests++;
  }

  /**
   * Generate validation report
   */
  generateReport(validationResult) {
    let report = '📊 XML Validation Report\n';
    report += '='.repeat(50) + '\n\n';

    // Summary
    report += `Overall Result: ${validationResult.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `Tests: ${validationResult.statistics.passedTests}/${validationResult.statistics.totalTests} passed\n`;
    report += `Errors: ${validationResult.errors.length}\n`;
    report += `Warnings: ${validationResult.warnings.length}\n\n`;

    // Detailed results
    Object.entries(validationResult.details).forEach(([testName, details]) => {
      report += `${details.passed ? '✅' : '❌'} ${testName}\n`;
      
      if (details.issues.length > 0) {
        details.issues.forEach(issue => {
          report += `  - ${issue.message}\n`;
        });
      }
      report += '\n';
    });

    // Recommendations
    if (!validationResult.passed) {
      report += '💡 Recommendations:\n';
      report += '- Review parsing patterns for missing elements\n';
      report += '- Check preprocessing steps for content loss\n';
      report += '- Validate against multiple XML samples\n';
      report += '- Consider updating validation rules if needed\n';
    }

    return report;
  }

  /**
   * Create test cases from XML samples
   */
  createTestCases(xmlSamples) {
    const testCases = [];

    xmlSamples.forEach((xmlContent, index) => {
      const xmlData = this.parseXmlContent(xmlContent);
      
      testCases.push({
        name: `Sample ${index + 1}`,
        expectedSteps: xmlData.steps.length,
        expectedVariables: xmlData.variables.length,
        expectedCrossRefs: xmlData.crossReferences.length,
        xmlContent: xmlContent,
        validate: parseResult => this.validateAgainstXml(parseResult, xmlContent),
      });
    });

    return testCases;
  }
}

export default XmlComparisonValidator;