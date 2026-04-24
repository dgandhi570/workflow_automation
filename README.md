# Workflow AI Middleware

An agentic AI middleware that converts natural language prompts into complete workflow JSON for the Yabx workflow platform.

## Architecture

```
workflow_middleware/
├── server/                     # Node.js Express backend
│   └── src/
│       ├── index.js            # Entry point
│       ├── agents/
│       │   ├── claudeClient.js     # Anthropic SDK wrapper
│       │   ├── orchestrator.js     # Session & conversation orchestrator
│       │   ├── extractionAgent.js  # Structured info extraction
│       │   └── validatorAgent.js   # Workflow JSON validation
│       ├── routes/
│       │   ├── workflow.js         # /api/workflow/* endpoints
│       │   └── session.js          # /api/session/* endpoints
│       ├── services/
│       │   └── railsService.js     # Rails backend integration
│       ├── prompts/
│       │   └── systemPrompt.js     # AI system prompts
│       └── utils/
│           ├── logger.js           # Winston logger
│           └── nodeSchema.js       # Complete node type definitions
│
└── client/                     # React + Vite frontend
    └── src/
        ├── App.jsx                 # Main app layout
        ├── hooks/
        │   └── useChat.js          # Chat state management
        ├── components/
        │   ├── MessageBubble.jsx   # Chat message renderer
        │   ├── WorkflowPanel.jsx   # Workflow preview panel
        │   ├── ChatInput.jsx       # Message input
        │   ├── PhaseIndicator.jsx  # Conversation phase tracker
        │   └── StarterPrompts.jsx  # Quick start prompts
        └── services/
            └── api.js              # API client
```

## How It Works

### Multi-Agent Architecture

1. **Orchestrator Agent** (`orchestrator.js`)
   - Manages conversation sessions (in-memory)
   - Routes messages through the conversation lifecycle
   - Coordinates all other agents
   - Handles explicit commands (`/generate`, `save`, `/reset`)

2. **Extraction Agent** (`extractionAgent.js`)
   - Uses Claude Haiku (fast, cheap) to parse user messages
   - Extracts structured context: APIs needed, variables, teams, steps
   - Tracks what's missing to build a complete workflow

3. **Conversation Agent** (main Claude call in orchestrator)
   - Uses Claude Opus (most capable) for the main conversation
   - Follows a 5-phase protocol: Understand → Clarify → Confirm → Generate → Refine
   - Asks targeted questions, never more than 3 at once
   - Generates complete workflow JSON when ready

4. **Validator Agent** (`validatorAgent.js`)
   - Fast local structural validation (no API call)
   - Optional AI-powered semantic validation
   - Checks node connectivity, UUID uniqueness, metadata references

### Conversation Phases

```
idle → gathering → confirming → generated → complete
```

- **gathering**: AI asks questions to collect workflow requirements
- **confirming**: AI summarizes and asks user to confirm before generating
- **generated**: Workflow JSON is available for review/refinement
- **complete**: Workflow saved to Rails backend

### Workflow JSON Format

The AI generates workflows in this format:
```json
{
  "journey": {
    "name": "Personal Loan - Salaried",
    "targetType": "Customer",
    "teams": ["CDE", "Credit Rule"],
    "variables": ["credit_decision", "credit_limit"],
    "apiCalls": ["CDE", "Rule Engine"],
    "userActions": ["get_personal_info", "get_documents"]
  },
  "nodes": [
    { "uuid": "abc123", "type": "start", "name": "Start", "outputs": ["def456"] },
    { "uuid": "def456", "type": "apiCall", "name": "Credit Check", "api_call": {...}, "outputs": ["ghi789"] }
  ],
  "edges": [
    { "source": "abc123", "sourceHandle": "b", "target": "def456", "targetHandle": null }
  ],
  "positions": {
    "abc123": { "x": 100, "y": 100 }
  }
}
```

## Setup & Running

### 1. Install dependencies

```bash
# From the middleware root
npm run install:all
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
```

### 3. Run in development

```bash
# Run both server and client
npm run dev

# Or run separately
npm run dev:server    # http://localhost:3001
npm run dev:client    # http://localhost:5173
```

### 4. Environment variables (server/.env)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | - | Your Anthropic API key |
| `PORT` | ❌ | 3001 | Server port |
| `RAILS_BACKEND_URL` | ❌ | http://localhost:3000 | Rails backend URL |
| `RAILS_AUTH_TOKEN` | ❌ | - | JWT token for Rails auth |
| `ALLOWED_ORIGINS` | ❌ | http://localhost:5173 | Comma-separated CORS origins |

## API Endpoints

### Session
- `POST /api/session/create` — Create a new conversation session
- `GET /api/session/:id` — Get session state

### Workflow
- `POST /api/workflow/chat` — Send a message `{ sessionId, message }`
- `POST /api/workflow/validate` — Validate a workflow JSON
- `POST /api/workflow/save` — Save workflow to Rails backend
- `GET /api/workflow/session/:id/workflow` — Get generated workflow
- `GET /api/workflow/existing` — List existing Rails workflows

### Chat Commands
Type these in the chat interface:
- `/generate` — Force workflow generation now
- `save` — Save current workflow to backend
- `/reset` — Start a new conversation
- `start over` — Reset session

## Extending

### Adding a new node type
1. Add definition to `server/src/utils/nodeSchema.js`
2. The AI system prompt is auto-generated from the schema

### Using a different AI model
Change the model in `orchestrator.js`:
- Main conversation: change `model` in `chat()` call
- Extraction: change in `extractionAgent.js` (haiku is fine here)
- Validation: change in `validatorAgent.js`

### Persisting sessions
Replace the in-memory `Map` in `orchestrator.js` with Redis:
```js
const redis = require('redis');
// Store sessions in redis instead of Map
```
