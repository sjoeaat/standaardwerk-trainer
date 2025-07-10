# Standaardwerk Parser

[![Test Suite](https://github.com/sjoeaat/standaardwerk-parser/actions/workflows/test.yml/badge.svg)](https://github.com/sjoeaat/standaardwerk-parser/actions/workflows/test.yml)
[![Coverage Status](https://codecov.io/gh/sjoeaat/standaardwerk-parser/branch/main/graph/badge.svg)](https://codecov.io/gh/sjoeaat/standaardwerk-parser)

Core parsing engine for converting industrial step programs from Word documents to structured data formats.

## Features

- **Multi-format Input**: Parse DOCX files with industrial step programs
- **Advanced Parsing**: Support for RUST/SCHRITT methodology
- **Flexible Output**: JSON and XML export formats
- **Validation**: Built-in syntax and logic validation
- **CLI Tools**: Command-line interface for batch processing
- **Comprehensive Testing**: Full test suite with coverage reporting

## Installation

```bash
npm install
```

## Usage

### CLI Usage

```bash
# Parse a DOCX file
node cli/parser.js input.docx output.json

# Convert DOCX to JSON
node cli/docx-to-json.js input.docx
```

### Programmatic Usage

```javascript
import { AdvancedParser } from './src/AdvancedParser.js';
import { syntaxRules } from './src/config/syntaxRules.js';

const parser = new AdvancedParser(syntaxRules);
const result = await parser.parseDocument(documentContent);
```

## Configuration

- `src/config/syntaxRules.js` - Syntax recognition rules
- `src/config/validationRules.js` - Validation rules

## Testing

### Quick Tests
```bash
npm test                    # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:watch         # Watch mode
```

### Coverage Testing
```bash
npm run test:coverage      # Full coverage report
npm run test:ci           # CI coverage with thresholds
npm run test:full         # Complete test suite with HTML report
```

### Advanced Testing
```bash
npm run test:script help   # Show all test options
npm run test:script quick  # Quick unit tests
npm run test:script full   # Full suite with coverage
```

## Coverage Targets

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

## Development

### File Structure
```
src/
├── core/               # Core parsing engines
│   ├── AdvancedParser.js
│   ├── FlexibleParser.js
│   └── ContentPreprocessor.js
├── config/            # Configuration files
│   ├── syntaxRules.js
│   └── validationRules.js
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── setup.js          # Test configuration
```

### Adding Tests

1. **Unit Tests**: Add to `tests/unit/ComponentName.test.js`
2. **Integration Tests**: Add to `tests/integration/feature.test.js`
3. **Use Test Utilities**: Available in `tests/setup.js`

### Custom Matchers

```javascript
expect(result).toHaveValidSteps();
expect(result).toHaveStep(stepNumber);
```

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main`
- Multiple Node.js versions (16.x, 18.x, 20.x)

## Related Projects

- **[standaardwerk-trainer](https://github.com/sjoeaat/standaardwerk-trainer)** - Training and pattern generation
- **[standaardwerk-webapp](https://github.com/sjoeaat/standaardwerk-webapp)** - Web interface
- **[standaardwerk-archive](https://github.com/sjoeaat/standaardwerk-archive)** - Historical data and debug tools

## License

MIT