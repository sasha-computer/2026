# Gandalf Specification

A personal Claude assistant accessible via WhatsApp, with persistent memory per conversation, scheduled tasks, and email integration.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Folder Structure](#folder-structure)
3. [Configuration](#configuration)
4. [Memory System](#memory-system)
5. [Session Management](#session-management)
6. [Message Flow](#message-flow)
7. [Commands](#commands)
8. [Scheduled Tasks](#scheduled-tasks)
9. [MCP Servers](#mcp-servers)
10. [Deployment](#deployment)
11. [Security Considerations](#security-considerations)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HOST (macOS)                                  │
│                   (Main Node.js Process)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐                     ┌────────────────────┐        │
│  │  WhatsApp    │────────────────────▶│   SQLite Database  │        │
│  │  (baileys)   │◀────────────────────│   (messages.db)    │        │
│  └──────────────┘   store/send        └─────────┬──────────┘        │
│                                                  │                   │
│         ┌────────────────────────────────────────┘                   │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Message Loop    │    │  Scheduler Loop  │    │  IPC Watcher  │  │
│  │  (polls SQLite)  │    │  (checks tasks)  │    │  (file-based) │  │
│  └────────┬─────────┘    └────────┬─────────┘    └───────────────┘  │
│           │                       │                                  │
│           └───────────┬───────────┘                                  │
│                       │ spawns agent subprocess                      │
│                       ▼                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    AGENT RUNNER                               │   │
│  │                                                                │   │
│  │  Working directory: groups/{name}/                             │   │
│  │  Tools (all groups):                                           │   │
│  │    • Bash (runs on host)                                       │   │
│  │    • Read, Write, Edit, Glob, Grep (file operations)           │   │
│  │    • WebSearch, WebFetch (internet access)                     │   │
│  │    • agent-browser (browser automation)                        │   │
│  │    • mcp__gandalf__* (scheduler tools via IPC)                │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| WhatsApp Connection | Node.js (@whiskeysockets/baileys) | Connect to WhatsApp, send/receive messages |
| Message Storage | SQLite (better-sqlite3) | Store messages for polling |
| Agent Execution | Native subprocesses | Run Claude Agent SDK per request |
| Agent | @anthropic-ai/claude-agent-sdk (0.2.29) | Run Claude with tools and MCP servers |
| Browser Automation | agent-browser + Chromium | Web interaction and screenshots |
| Runtime | Node.js 20+ | Host process for routing and scheduling |

---

## Folder Structure

```
gandalf/
├── CLAUDE.md                      # Project context for Claude Code
├── docs/
│   ├── SPEC.md                    # This specification document
│   ├── REQUIREMENTS.md            # Architecture decisions
│   └── SECURITY.md                # Security model
├── README.md                      # User documentation
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript configuration
├── .mcp.json                      # MCP server configuration (reference)
├── .gitignore
│
├── src/
│   ├── index.ts                   # Main application (Discord + routing)
│   ├── config.ts                  # Configuration constants
│   ├── types.ts                   # TypeScript interfaces
│   ├── db.ts                      # Database initialization and queries
│   ├── task-scheduler.ts          # Runs scheduled tasks when due
│   ├── process-runner.ts          # Spawns agent subprocesses
│   ├── agent-runner.ts            # Agent subprocess entry point
│   └── ipc-mcp.ts                 # MCP server for host communication
│
├── dist/                          # Compiled JavaScript (gitignored)
│
├── .claude/
│   └── skills/
│       ├── setup/
│       │   └── SKILL.md           # /setup skill
│       ├── customize/
│       │   └── SKILL.md           # /customize skill
│       └── debug/
│           └── SKILL.md           # /debug skill
│
├── groups/
│   ├── CLAUDE.md                  # Global memory (all groups read this)
│   ├── main/                      # Self-chat (main control channel)
│   │   ├── CLAUDE.md              # Main channel memory
│   │   └── logs/                  # Task execution logs
│   └── {Group Name}/              # Per-group folders (created on registration)
│       ├── CLAUDE.md              # Group-specific memory
│       ├── logs/                  # Task logs for this group
│       └── *.md                   # Files created by the agent
│
├── store/                         # Local data (gitignored)
│   ├── auth/                      # WhatsApp authentication state
│   └── messages.db                # SQLite database (messages, scheduled_tasks, task_run_logs)
│
├── data/                          # Application state (gitignored)
│   ├── sessions.json              # Active session IDs per group (legacy)
│   ├── registered_groups.json     # Group JID → folder mapping
│   ├── router_state.json          # Last processed timestamp + last agent timestamps
│   └── ipc/                       # IPC (messages/, tasks/, memory/)
│
├── logs/                          # Runtime logs (gitignored)
│   ├── gandalf.log               # Host stdout
│   └── gandalf.error.log         # Host stderr
│
└── launchd/
    └── com.gandalf.plist         # macOS service configuration
```

---

## Configuration

Configuration constants are in `src/config.ts`:

```typescript
import path from 'path';

export const SCHEDULER_POLL_INTERVAL = 60000;

// Paths
const PROJECT_ROOT = process.cwd();
export const STORE_DIR = path.resolve(PROJECT_ROOT, 'store');
export const GROUPS_DIR = path.resolve(PROJECT_ROOT, 'groups');
export const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');

// Agent configuration
export const AGENT_TIMEOUT = parseInt(process.env.AGENT_TIMEOUT || '300000', 10);
export const AGENT_MAX_OUTPUT_SIZE = parseInt(process.env.AGENT_MAX_OUTPUT_SIZE || '10485760', 10);
export const MAX_CONCURRENT_AGENTS = parseInt(process.env.MAX_CONCURRENT_AGENTS || '5', 10);
export const IPC_POLL_INTERVAL = 1000;

export const BOT_MESSAGE_PREFIX = process.env.BOT_MESSAGE_PREFIX || '';
```

### Claude Authentication

Configure authentication in a `.env` file in the project root. Two options:

**Option 1: Claude Subscription (OAuth token)**
```bash
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```
The token can be extracted from `~/.claude/.credentials.json` if you're logged in to Claude Code.

**Option 2: Pay-per-use API Key**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

The `.env` file is read by the host process and passed to the agent subprocess as needed. Keep secrets limited to only what the agent should access.

### Placeholder Values in launchd

Files with `{{PLACEHOLDER}}` values need to be configured:
- `{{PROJECT_ROOT}}` - Absolute path to your gandalf installation
- `{{BUN_PATH}}` - Path to bun binary (detected via `which bun`)
- `{{HOME}}` - User's home directory

---

## Memory System

Gandalf uses a hierarchical memory system based on CLAUDE.md files.

### Memory Hierarchy

| Level | Location | Read By | Written By | Purpose |
|-------|----------|---------|------------|---------|
| **Global** | `groups/CLAUDE.md` | All groups | Main only | Preferences, facts, context shared across all conversations |
| **Group** | `groups/{name}/CLAUDE.md` | That group | That group | Group-specific context, conversation memory |
| **Files** | `groups/{name}/*.md` | That group | That group | Notes, research, documents created during conversation |

### How Memory Works

1. **Agent Context Loading**
   - Agent runs with `cwd` set to `groups/{group-name}/`
   - Claude Agent SDK with `settingSources: ['project']` automatically loads:
     - `../CLAUDE.md` (parent directory = global memory)
     - `./CLAUDE.md` (current directory = group memory)

2. **Writing Memory**
   - When user says "remember this", agent writes to `./CLAUDE.md`
   - When user says "remember this globally" (main channel only), agent writes to `../CLAUDE.md`
   - Agent can create files like `notes.md`, `research.md` in the group folder

3. **Main Channel Privileges**
   - Only the "main" group (self-chat) can write to global memory
   - Main can manage registered groups and schedule tasks for any group
  - All groups have Bash access (runs on the host)

---

## Session Management

Sessions enable conversation continuity - Claude remembers what you talked about.

### How Sessions Work

1. Each group has a session ID stored in `data/sessions.json`
2. Session ID is passed to Claude Agent SDK's `resume` option
3. Claude continues the conversation with full context

**data/sessions.json:**
```json
{
  "main": "session-abc123",
  "Family Chat": "session-def456"
}
```

---

## Message Flow

### Incoming Message Flow

```
1. User sends WhatsApp message
   │
   ▼
2. Baileys receives message via WhatsApp Web protocol
   │
   ▼
3. Message stored in SQLite (store/messages.db)
   │
   ▼
4. Message loop polls SQLite (every 2 seconds)
   │
   ▼
5. Router checks:
   ├── Is chat_jid in registered_groups.json? → No: ignore
   └── Does message start with @Assistant? → No: ignore
   │
   ▼
6. Router catches up conversation:
   ├── Fetch all messages since last agent interaction
   ├── Format with timestamp and sender name
   └── Build prompt with full conversation context
   │
   ▼
7. Router invokes Claude Agent SDK:
   ├── cwd: groups/{group-name}/
   ├── prompt: conversation history + current message
   ├── resume: session_id (for continuity)
   └── mcpServers: gandalf (scheduler)
   │
   ▼
8. Claude processes message:
   ├── Reads CLAUDE.md files for context
   └── Uses tools as needed (search, email, etc.)
   │
   ▼
9. Router sends response via WhatsApp
   │
   ▼
10. Router updates last agent timestamp and saves session ID
```

### Conversation Catch-Up

When a new message arrives in a registered group, the agent receives all messages since its last interaction in that chat. Each message is formatted with timestamp and sender name:

```
[Jan 31 2:32 PM] John: hey everyone, should we do pizza tonight?
[Jan 31 2:33 PM] Sarah: sounds good to me
[Jan 31 2:35 PM] John: what toppings do you recommend?
```

This allows the agent to understand the conversation context even if it wasn't mentioned in every message.

---

## Commands

Gandalf exposes slash commands in Discord:
- `/new` - Reset the conversation session
- `/clear` - Compact context and continue from summary
- `/status` - Show bot status and channel info

---

## Scheduled Tasks

Gandalf has a built-in scheduler that runs tasks as full agents in their group's context.

### How Scheduling Works

1. **Group Context**: Tasks created in a group run with that group's working directory and memory
2. **Full Agent Capabilities**: Scheduled tasks have access to all tools (WebSearch, file operations, etc.)
3. **Optional Messaging**: Tasks can send messages to their group using the `send_message` tool, or complete silently
4. **Main Channel Privileges**: The main channel can schedule tasks for any group and view all tasks

### Schedule Types

| Type | Value Format | Example |
|------|--------------|---------|
| `cron` | Cron expression | `0 9 * * 1` (Mondays at 9am) |
| `interval` | Milliseconds | `3600000` (every hour) |
| `once` | ISO timestamp | `2024-12-25T09:00:00Z` |

### Creating a Task

```
User: remind me every Monday at 9am to review the weekly metrics

Claude: [calls mcp__gandalf__schedule_task]
        {
          "prompt": "Send a reminder to review weekly metrics. Be encouraging!",
          "schedule_type": "cron",
          "schedule_value": "0 9 * * 1"
        }

Claude: Done! I'll remind you every Monday at 9am.
```

### One-Time Tasks

```
User: at 5pm today, send me a summary of today's emails

Claude: [calls mcp__gandalf__schedule_task]
        {
          "prompt": "Search for today's emails, summarize the important ones, and send the summary to the group.",
          "schedule_type": "once",
          "schedule_value": "2024-01-31T17:00:00Z"
        }
```

### Managing Tasks

From any group:
- `list my scheduled tasks` - View tasks for this group
- `pause task [id]` - Pause a task
- `resume task [id]` - Resume a paused task
- `cancel task [id]` - Delete a task

From main channel:
- `list all tasks` - View tasks from all groups
- `schedule task for "Family Chat": [prompt]` - Schedule for another group

---

## MCP Servers

### Gandalf MCP (built-in)

The `gandalf` MCP server is created dynamically per agent call with the current group's context.

**Available Tools:**
| Tool | Purpose |
|------|---------|
| `schedule_task` | Schedule a recurring or one-time task |
| `list_tasks` | Show tasks (group's tasks, or all if main) |
| `get_task` | Get task details and run history |
| `update_task` | Modify task prompt or schedule |
| `pause_task` | Pause a task |
| `resume_task` | Resume a paused task |
| `cancel_task` | Delete a task |
| `send_message` | Send a WhatsApp message to the group |

---

## Deployment

Gandalf runs as a single macOS launchd service.

### Startup Sequence

When Gandalf starts, it:
1. Initializes the SQLite database
2. Loads state (registered groups, sessions, router state)
3. Connects to WhatsApp
4. Starts the message polling loop
5. Starts the scheduler loop
6. Starts the IPC watcher for task and memory messages

### Service: com.gandalf

**launchd/com.gandalf.plist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gandalf</string>
    <key>ProgramArguments</key>
    <array>
        <string>{{BUN_PATH}}</string>
        <string>{{PROJECT_ROOT}}/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>{{PROJECT_ROOT}}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>{{HOME}}/.local/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>{{HOME}}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>{{PROJECT_ROOT}}/logs/gandalf.log</string>
    <key>StandardErrorPath</key>
    <string>{{PROJECT_ROOT}}/logs/gandalf.error.log</string>
</dict>
</plist>
```

### Managing the Service

```bash
# Install service
cp launchd/com.gandalf.plist ~/Library/LaunchAgents/

# Start service
launchctl load ~/Library/LaunchAgents/com.gandalf.plist

# Stop service
launchctl unload ~/Library/LaunchAgents/com.gandalf.plist

# Check status
launchctl list | grep gandalf

# View logs
tail -f logs/gandalf.log
```

---

## Security Considerations

### Process Isolation

Agents run as native subprocesses with scoped working directories:
- **Directory scoping**: Each agent runs with a group-specific working directory
- **Explicit access**: The host controls which files and paths are provided to the agent
- **Bash runs on host**: Treat tool access as privileged and keep permissions minimal

### Prompt Injection Risk

WhatsApp messages could contain malicious instructions attempting to manipulate Claude's behavior.

**Mitigations:**
- Scoped working directories limit what the agent can access
- Only registered groups are processed
- Trigger word required (reduces accidental processing)
- Agents can only access their group's mounted directories
- Main can configure additional directories per group
- Claude's built-in safety training

**Recommendations:**
- Only register trusted groups
- Review additional directory mounts carefully
- Review scheduled tasks periodically
- Monitor logs for unusual activity

### Credential Storage

| Credential | Storage Location | Notes |
|------------|------------------|-------|
| Claude CLI Auth | data/sessions/{group}/.claude/ | Per-group isolation on the host |
| WhatsApp Session | store/auth/ | Auto-created, persists ~20 days |

### File Permissions

The groups/ folder contains personal memory and should be protected:
```bash
chmod 700 groups/
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No response to messages | Service not running | Check `launchctl list | grep gandalf` |
| "Claude Code process exited with code 1" | Agent runner error | Check logs for the underlying exception |
| Session not continuing | Session ID not saved | Check `data/sessions.json` |
| "QR code expired" | WhatsApp session expired | Delete store/auth/ and restart |
| "No groups registered" | Haven't added groups | Register groups from the main channel |

### Log Location

- `logs/gandalf.log` - stdout
- `logs/gandalf.error.log` - stderr

### Debug Mode

Run manually for verbose output:
```bash
bun run dev
# or
bun dist/index.js
```
