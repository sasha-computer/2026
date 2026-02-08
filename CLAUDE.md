# Gandalf

Personal Claude assistant. See [README.md](README.md) for philosophy and setup. See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for architecture decisions.

## Quick Context

Single Node.js process that connects to Discord, routes messages to Claude Agent SDK running as native subprocesses. Per-channel context is preserved via session IDs stored in the database. Threads and forum posts inherit their parent channel's registration and get their own session context.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main app: Discord connection, message routing, IPC |
| `src/config.ts` | Discord config, trigger pattern, paths, intervals |
| `src/process-runner.ts` | Spawns agent subprocesses |
| `src/agent-runner.ts` | Agent subprocess entry point (uses Claude Agent SDK) |
| `src/ipc-mcp.ts` | MCP server for agent IPC (messaging, tasks) |
| `src/task-scheduler.ts` | Runs scheduled tasks |
| `src/db.ts` | SQLite operations |
| `groups/{name}/CLAUDE.md` | Per-group memory (isolated) |

## Skills

| Skill | When to Use |
|-------|-------------|
| `/setup` | First-time installation, authentication, service configuration |
| `/customize` | Adding channels, integrations, changing behavior |
| `/debug` | Agent issues, logs, troubleshooting |

## Development

Run commands directly--don't tell the user to run them.

```bash
npm run dev          # Run with hot reload
npm run build        # Compile TypeScript
```

Service management:
```bash
launchctl load ~/Library/LaunchAgents/com.gandalf.plist
launchctl unload ~/Library/LaunchAgents/com.gandalf.plist
```
