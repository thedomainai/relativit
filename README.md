# Relativity

AGI-powered autonomous software development system designed for complete automation of the software development lifecycle.

This repository contains two tightly connected parts:

- **AGI-oriented project structure** (requirements, specs, workflows, knowledge, etc.)
- **Relativity web application** (React frontend + Express/SQLite backend) under `src/features/app/`

The goal is to let both humans and AGI agents collaborate around a structured SDLC while still being able to run a concrete application locally with minimal setup.

## Overview

Relativity is a next-generation project structure optimized for AGI (Artificial General Intelligence) agents to autonomously:

- Generate requirements from high-level ideas
- Design technical specifications
- Generate production-ready code
- Create comprehensive tests
- Validate quality continuously
- Learn and improve from experience

## Directory Structure

### Core Systems

- **`.agent/`** - AI Agent control system
  - `config/` - Agent configuration, capabilities, and constraints
  - `prompts/` - System, task, and meta prompts
  - `memory/` - Short-term, long-term, and episodic memory
  - `reasoning/` - Chain-of-thought, decisions, and alternatives
  - `tools/` - Agent tool definitions

- **`.state/`** - State management
  - `current/` - Current project state, task queue, dependencies
  - `history/` - Historical state snapshots
  - `checkpoints/` - Rollback points

- **`.metadata/`** - Metadata and ontology
  - `schema/` - Data schemas and ontology definitions
  - `ontology/` - Concept relationships and taxonomy

- **`.learning/`** - Learning and improvement system
  - `feedback/` - Feedback data collection
  - `metrics/` - Performance metrics
  - `improvements/` - Improvement history
  - `patterns/` - Learned patterns

### Development Artifacts

- **`requirements/`** - Requirements management
  - `raw/` - Raw input and ideas
    - `user-stories/` - User stories (As a/I want/So that format)
  - `processed/` - AI-processed requirements
    - `user-stories/` - Processed user stories with generated requirements
    - `functional/` - Functional requirements
    - `non-functional/` - Non-functional requirements
    - `constraints/` - Constraints
  - `validated/` - Validated requirements
  - `graph/` - Requirement dependency graphs

- **`specs/`** - Technical specifications
  - `architecture/` - System architecture
  - `api/` - API specifications
  - `database/` - Database schemas
  - `contracts/` - Interface contracts
  - `versions/` - Version history

- **`src/`** - Source code
  - `.codegen/` - Code generation metadata and templates
  - `core/` - Core functionality
  - `features/` - Feature modules
  - `shared/` - Shared components
  - `generators/` - Code generators

- **`tests/`** - Test suite
  - `.testgen/` - Test generation metadata
  - `unit/` - Unit tests
  - `integration/` - Integration tests
  - `e2e/` - End-to-end tests
  - `property-based/` - Property-based tests
  - `reports/` - Test reports

### Automation & Quality

- **`validation/`** - Validation system
  - `rules/` - Validation rules
  - `checks/` - Automated checks
  - `reports/` - Validation reports
  - `metrics/` - Quality metrics

- **`workflows/`** - Automated workflows
  - `pipelines/` - Pipeline definitions (requirement→spec→code)
  - `triggers/` - Event triggers
  - `hooks/` - Workflow hooks
  - `orchestration.json` - Orchestration configuration

### Knowledge & Communication

- **`knowledge/`** - Knowledge base
  - `domain/` - Domain knowledge (entities, business rules, glossary)
  - `technical/` - Technical patterns and best practices
  - `embedding/` - Vector embeddings
  - `index/` - Search indices

- **`communication/`** - Agent communication
  - `messages/` - Message queue
  - `events/` - Event logs
  - `protocols/` - Communication protocols

### Observability

- **`monitoring/`** - Monitoring and observability
  - `logs/` - Structured logs
  - `traces/` - Execution traces
  - `alerts/` - Alert configurations

- **`docs/`** - Documentation
  - `auto-generated/` - AI-generated documentation
  - `diagrams/` - Architecture diagrams
  - `explanations/` - AI-generated explanations

## Key Features

### 1. Complete Automation
- No human intervention required for standard development tasks
- Automated requirement→spec→code→test pipeline
- Self-validation and quality assurance

### 2. Machine-Readable First
- All data in structured formats (JSON/YAML)
- Schema-validated at every step
- API-driven interactions

### 3. State Management
- Complete project state tracking
- Dependency graph management
- Checkpoint and rollback capabilities

### 4. Learning & Improvement
- Continuous learning from feedback
- Pattern recognition and reuse
- Self-improvement mechanisms

### 5. Full Traceability
- Decision reasoning logged
- Alternative approaches recorded
- Complete audit trail

## Workflow

### Main Development Flow

```
User Story (requirements/raw/user-stories/)
    ↓
[AI Agent] User Story Processing
    ↓
Requirements Generation (REQ-XXXX)
    ↓
requirements/processed/{functional,non-functional}/
    ↓
[AI Agent] Specification Design
    ↓
specs/{architecture,api,database}/
    ↓
[AI Agent] Code Generation
    ↓
src/{core,features}/
    ↓
[AI Agent] Test Generation
    ↓
tests/{unit,integration,e2e}/
    ↓
[Automated] Validation & Testing
    ↓
[Decision Gate] Pass/Fail
    ↓
Production Ready / Auto-Fix Loop
```

### User Story Processing

```
User Story Input (JSON/Text)
    ↓
Parse & Validate
    ↓
Extract Personas → knowledge/domain/personas.json
    ↓
Generate Requirements → requirements/processed/
    ↓
Identify Workflows → knowledge/domain/workflows.json
    ↓
Create Test Scenarios → tests/
    ↓
Analyze Dependencies → .state/current/dependencies.json
    ↓
Trigger Specification Pipeline
```

## Getting Started

### 1. Running the Relativity Web Application Locally

#### Prerequisites

- Node.js 18+ (LTS recommended)
- npm (or another Node.js package manager)

#### Installation

From the repository root (this `relativity` directory):

```bash
# Install backend and frontend dependencies
npm run install:all
```

This will:

- Install server dependencies in `src/features/app/server/`
- Install client dependencies in `src/features/app/client/`

#### Environment configuration

Backend environment file (not committed to Git):

1. Copy the example file:

```bash
cp src/features/app/server/.env.example src/features/app/server/.env
```

2. Edit `src/features/app/server/.env` and set at least:

```env
PORT=3001
JWT_SECRET=change-me-to-a-long-random-secret
```

For production, replace `JWT_SECRET` with a long, random secret string.

Frontend environment file (optional):

1. Copy the example file if you want to customize the API endpoint:

```bash
cp src/features/app/client/.env.example src/features/app/client/.env
```

2. Edit `src/features/app/client/.env` and set:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

If you omit this file, the client defaults to `http://localhost:3001/api`.

#### Development mode

Start the backend API:

```bash
npm run dev:server
```

This runs the Express server from `src/features/app/server/index.js` (default port `3001`).

Start the frontend client in another terminal:

```bash
npm run dev:client
```

This runs the React client from `src/features/app/client/` (default port `3000`).

Then open:

- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:3001`

#### Production build (optional)

To create a production build of the frontend:

```bash
npm run build:client
```

You can then serve the built assets using your preferred static hosting and run the server with:

```bash
npm run start:server
```

### 2. AGI Project Setup

1. Configure agent settings in `.agent/config/`
2. Define domain knowledge in `knowledge/domain/`
3. Set validation rules in `validation/rules/`
4. Configure workflows in `workflows/orchestration.json`

### Adding User Stories (Recommended)

Create user stories in `requirements/raw/user-stories/`:

**Option 1: JSON format**
```json
{
  "id": "US-0001",
  "title": "User login",
  "as_a": "registered user",
  "i_want": "to log in with email and password",
  "so_that": "I can access my dashboard",
  "acceptance_criteria": [
    {"given": "valid credentials", "when": "I log in", "then": "I see my dashboard"}
  ]
}
```

**Option 2: Simple text format**
```
As a registered user
I want to log in with email and password
So that I can access my dashboard
```

The AI agent will automatically:
1. Parse and validate the story
2. Extract personas and workflows
3. Generate detailed requirements (REQ-XXXX)
4. Create specifications
5. Implement code
6. Generate tests
7. Validate everything

See `templates/user-story.template.md` for detailed guidelines.

### Adding Direct Requirements

Alternatively, place raw requirements in `requirements/raw/` and the agent will:
1. Process and structure them
2. Generate specifications
3. Implement code
4. Create tests
5. Validate everything

### Monitoring

- Check `.state/current/project-state.json` for overall status
- View `monitoring/logs/` for execution logs
- Review `.learning/metrics/` for performance data

## Design Principles

1. **AGI-First**: Optimized for machine understanding and processing
2. **Fully Structured**: No unstructured text; all data is typed and validated
3. **Autonomous**: Capable of complete SDLC without human intervention
4. **Transparent**: All decisions and reasoning are recorded
5. **Self-Improving**: Learns from experience and feedback
6. **Resilient**: Checkpoints, rollbacks, and error recovery

## Status

🟢 **Initialized** - Ready for autonomous development

## License

[Your License Here]

## Version

0.1.0 - Initial AGI-optimized structure
