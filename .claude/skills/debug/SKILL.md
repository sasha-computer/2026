---
name: debug
description: Debug agent execution issues. Use when things aren't working, authentication problems, or to understand the subprocess system. Covers logs, environment variables, and common issues.
---

# Gandalf Debugging

This guide covers debugging the native subprocess agent execution system.

## Architecture Overview

The host process spawns `dist/agent-runner.js` as a subprocess and exchanges data via IPC files in `data/ipc/{group}`.

## Log Locations

| Log | Location | Content |
|-----|----------|---------|
| **Main app logs** | `logs/gandalf.log` | Host-side routing, scheduler, process spawning |
| **Main app errors** | `logs/gandalf.error.log` | Host-side errors |
| **Agent run logs** | `groups/{folder}/logs/agent-*.log` | Per-run input summary, stdout, stderr |
| **Claude sessions** | `~/.claude/projects/` | Claude Code session history |

## Enabling Debug Logging

Set `LOG_LEVEL=debug` for verbose output:

```bash
# For development
LOG_LEVEL=debug bun run dev

# For launchd service, add to plist EnvironmentVariables:
<key>LOG_LEVEL</key>
<string>debug</string>
```

Debug level shows:
- Agent input summaries
- Subprocess stdout/stderr
- IPC task handling

## Common Issues

### 1. "Claude Code process exited with code 1"

Check the most recent agent log in `groups/{folder}/logs/agent-*.log`.

Common causes include:

#### Missing Authentication
```
Invalid API key · Please run /login
```
**Fix:** Ensure `.env` exists with either OAuth token or API key:
```bash
cat .env  # Should show one of:
# CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...  (subscription)
# ANTHROPIC_API_KEY=sk-ant-api03-...        (pay-per-use)
```

### 2. Agent Timeout

**Symptom:** Agent run log shows timeout and the process is killed.

**Fix:** Increase the timeout:
- Global: set `AGENT_TIMEOUT` in `.env`
- Per group: set `timeout` in `data/registered_groups.json`

### 3. Output Truncated

**Symptom:** Agent log shows stdout/stderr truncation.

**Fix:** Increase `AGENT_MAX_OUTPUT_SIZE` in `.env`.

### 4. Session Not Resuming

**Symptom:** New session ID every request.

**Fix:** Confirm `data/sessions.json` is being updated and that the process has write access to `data/`.

## Rebuilding After Changes

```bash
# Rebuild main app
bun run build

# Restart service
launchctl kickstart -k gui/$(id -u)/com.gandalf
```
