# Standaardwerk Trainer

Training and pattern generation tools for the Standaardwerk Parser.

## Features

- **Automatic Training**: Generate parsing rules from sample documents
- **Pattern Generation**: Create new syntax patterns from text analysis
- **Hierarchical Parsing**: Advanced structure recognition
- **Interactive UI**: Web-based pattern generation interface
- **Training Data Management**: Organize and process training datasets

## Installation

```bash
npm install
```

## Usage

### CLI Usage

```bash
# Generate patterns from document
node cli/generate-patterns.js input.docx

# Train on multiple documents
node cli/train-batch.js documents/
```

### Web Interface

```bash
# Start pattern generator UI
npm run ui
```

Open `src/ui/pattern-generator-ui.html` in your browser.

### Programmatic Usage

```javascript
import { AutoTrainer } from './src/core/AutoTrainer.js';
import { PatternGenerator } from './src/core/PatternGenerator.js';

const trainer = new AutoTrainer();
const patterns = await trainer.trainFromDocument(content);
```

## Training Data

Place your training documents in the `training-data/` directory:

```
training-data/
├── samples/
│   ├── program1.docx
│   └── program2.docx
└── results/
    └── training-output.json
```

## Generated Patterns

Training results are stored in `results/` directory with:
- Updated syntax rules
- Validation improvements
- Performance metrics
- Training reports

## Dependencies

Requires **standaardwerk-parser** as a peer dependency.

## License

MIT