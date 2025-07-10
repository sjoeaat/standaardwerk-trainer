export const defaultSyntaxRules = {
  stepKeywords: {
    step: ['STAP', 'SCHRITT', 'STEP'],
    rest: ['RUST', 'RUHE', 'IDLE'],
    end: ['KLAAR', 'FERTIG', 'END'],
  },
  variableDetection: {
    timerKeywords: ['TIJD', 'TIME', 'ZEIT'],
    markerKeywords: ['MARKER', 'FLAG', 'MERKER'],
    storingKeywords: ['STORING', 'FAULT', 'STÖRUNG'],
  },
  conditions: {
    orPrefix: '+',
    notPrefix: ['NIET', 'NICHT', 'NOT'],
    transitionPrefix: '->',
  },
  format: {
    requireColon: true,
    allowSpaces: true,
  },
  // Auto-learned patterns from training v2 (optimized)
  stepPatterns: [
    {
      pattern: /^(\w+)\s+(\d+)\s*:\s*(.*)$/,
      description: 'Auto-learned from 6269 examples - enhanced step detection',
      confidence: 0.7,
      examples: [
        '3.3\tO0x: Status Formenlagern  FB304\t13',
        '3.4\tO01: Status Formenlager  FB306\t14',
        '3.5\tO02: Status Formenlager ohne Deckel  FB308\t17',
      ],
    },
    {
      pattern: /^(\d+\.?\d*)\s*([A-Z]\d*[x]?)\s*:\s*(.+)\s+FB\d+\s*\t?\d*$/,
      description: 'Auto-learned pattern for FB-referenced steps',
      confidence: 0.8,
      examples: [
        '3.3\tO0x: Status Formenlagern  FB304\t13',
        '3.4\tO01: Status Formenlager  FB306\t14',
      ],
    },
    {
      pattern: /^(\d+\.?\d*\.?\d*)\s*([A-Z]\d*[x]?)\s*:\s*(.+?)(?:\s+FB\d+)?\s*\t?\d*$/,
      description: 'Enhanced FB-reference pattern with optional FB number',
      confidence: 0.85,
      examples: [
        '3.2.1\tN10: Blockierung Einfuhrrinne FB130\t27',
        '3.2.2\tN11: Blockierung Einfuhrrinne FB132\t28',
        '3.2.3\tT10: Füllen Horde  FB134\t29',
      ],
    },
  ],
  conditionPatterns: [
    {
      pattern: /\([^)]+\s+(SCHRITT|STAP|STEP)\s+([0-9+]+)\)/,
      type: 'cross_reference',
      confidence: 0.9,
      description: 'Auto-learned cross-reference pattern',
    },
  ],
  // Enhanced variable detection patterns (optimized v2)
  variablePatterns: [
    {
      pattern: /^([^=]+)\s*=$/,
      group: 'hulpmerker',
      confidence: 0.8,
      description: 'Auto-learned variable assignment pattern',
    },
    {
      pattern: /^(Freigabe|Start|Aktuell|Aktuelle)\s+(.+)\s*=$/,
      group: 'hulpmerker',
      confidence: 0.85,
      description: 'Auto-learned control variable pattern',
    },
    {
      pattern: /^(Einfuhr|Ausfuhr|Füllen|Entleeren|Umschwimmen|Freigabe)\s+(.+)\s*=$/,
      group: 'hulpmerker',
      confidence: 0.82,
      description: 'Auto-learned process control variable pattern',
    },
  ],
};