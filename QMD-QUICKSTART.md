# QMD Quick Start Guide

## What is QMD?

QMD is a local semantic search engine that gives your NanoClaw agents powerful memory search capabilities. It combines:
- **BM25 keyword search** - Fast, exact matching
- **Vector embeddings** - Semantic, meaning-based search
- **LLM reranking** - Best quality results

## Quick Commands

### Check Status
```bash
export PATH="/Users/agentsc/.bun/bin:$PATH"
qmd status
```

### Search Across All Groups
```bash
qmd query "what we discussed about X" --min-score 0.3
```

### Search Specific Group
```bash
qmd query "user preferences" -c nanoclaw-main
```

### List Collections
```bash
qmd collection list
```

### Update Index (run when files change)
```bash
bash scripts/update-qmd-embeddings.sh
```

## From Discord

### Search Memory
**You:** "Search our conversations for 'memory system'"

**Gandalf:** [Uses `mcp__qmd__query` tool to search and returns relevant snippets]

### Check What's Indexed
**You:** "Show me the QMD status"

**Gandalf:** [Uses `mcp__qmd__status` tool to report collections and stats]

### Get a Document
**You:** "Get the global CLAUDE.md file"

**Gandalf:** [Uses `mcp__qmd__get` tool to retrieve the file]

## Collections

Your NanoClaw instance has these collections:

- **nanoclaw-main** - Main admin channel
- **nanoclaw-global** - Shared global memory
- **nanoclaw-chan-general-387168** - Discord #general
- **nanoclaw-chan-mac-771898** - Discord #mac
- **nanoclaw-chan-meta-123334** - Discord #meta
- **nanoclaw-chan-trading-379090** - Discord #trading

Each collection indexes all `*.md` files in its group directory:
- `CLAUDE.md` (agent memory)
- `conversations/*.md` (archived conversations)
- Any files the agent creates

## Set Up Automatic Updates

From Discord main channel:

**You:** "Schedule a task to run `bash scripts/update-qmd-embeddings.sh` every hour"

**Gandalf:** [Uses `mcp__nanoclaw__schedule_task` to create hourly cron job]

This keeps your search index fresh as conversations are archived.

## Common Use Cases

### "What did we discuss about X?"
Agent uses QMD semantic search to find relevant past conversations.

### "Remind me of my preferences"
Agent searches memory files for user preferences and settings.

### "Find all mentions of feature Y"
Agent uses keyword search to find exact matches across all groups.

### "What are the patterns in our conversations?"
Agent uses semantic search to find thematically related discussions.

## Troubleshooting

### Agent says "I don't have access to QMD tools"
1. Check that the service was restarted after installation
2. Verify agent-runner.ts has `mcp__qmd__*` in allowedTools
3. Check logs: `tail -50 ~/nanoclaw/logs/nanoclaw.error.log`

### Search returns no results
```bash
# Re-embed all documents
qmd embed -f
```

### QMD command not found
```bash
# Add to PATH
export PATH="/Users/agentsc/.bun/bin:$PATH"

# Verify installation
which qmd
```

### Service can't find qmd
Check that PATH in launchd plist includes `/Users/agentsc/.bun/bin`:
```bash
grep PATH ~/Library/LaunchAgents/com.nanoclaw.plist
```

## Performance

- **First run:** Downloads models (~2GB, 1-2 minutes)
- **Keyword search:** < 1 second
- **Semantic search:** 1-2 seconds
- **Hybrid query:** 2-3 seconds
- **Embedding:** 1-2 seconds per document

Models are cached in `~/.cache/qmd/models/` and reused across runs.

## Learn More

- Full documentation: [QMD-INTEGRATION.md](QMD-INTEGRATION.md)
- Test cases: [TESTING-QMD.md](TESTING-QMD.md)
- QMD project: https://github.com/tobi/qmd
