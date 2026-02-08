# QMD Integration - Implementation Summary

## What Was Done

Successfully integrated QMD (local semantic search engine) into Gandalf, giving agents powerful search capabilities across their memory and conversation archives.

## Components Installed

### 1. Bun Runtime
- Installed via official installer: `curl -fsSL https://bun.sh/install | bash`
- Location: `~/.bun/bin/bun`
- Added to PATH in launchd plist

### 2. QMD Search Engine
- Installed globally: `bun install -g github:tobi/qmd`
- Location: `~/.bun/bin/qmd`
- Models cached in: `~/.cache/qmd/models/` (~2GB total)
- Index stored in: `~/.cache/qmd/index.sqlite`

## Collections Created

All group directories have been indexed as QMD collections:

- `gandalf-main` - Main admin channel (1 file indexed)
- `gandalf-global` - Shared global memory (1 file indexed)
- `gandalf-chan-general-387168` - Discord channel (1 file indexed)
- `gandalf-chan-mac-771898` - Discord channel (empty)
- `gandalf-chan-meta-123334` - Discord channel (empty)
- `gandalf-chan-trading-379090` - Discord channel (empty)

Each collection indexes all `**/*.md` files in its group directory, including:
- `CLAUDE.md` (agent memory)
- `conversations/*.md` (archived conversations)
- Any custom files created by agents

## Code Changes

### src/agent-runner.ts
**Line 286-287:** Added `mcp__qmd__*` to `allowedTools` array
**Line 291-293:** Added QMD MCP server to `mcpServers` configuration:
```typescript
qmd: { command: 'qmd', args: ['mcp'], env: { PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` } }
```

### groups/global/CLAUDE.md
Added "Memory Search (QMD)" section documenting:
- Available QMD tools (query, vsearch, search, get, multi_get)
- When to use search
- Collection naming conventions

### groups/main/CLAUDE.md
Added same QMD documentation plus "QMD Administration" section with commands for:
- Collection status monitoring
- Manual updates and re-embedding
- Collection management
- Context management

### ~/Library/LaunchAgents/com.gandalf.plist
Updated PATH environment variable to include `/Users/agentsc/.bun/bin` so QMD is available to agent subprocesses.

## Scripts Created

### scripts/setup-qmd.sh
Initializes all QMD collections for Gandalf groups:
- Creates collection for each `groups/*/` directory
- Adds context descriptions for each collection
- Runs initial embedding
- Shows status report

### scripts/update-qmd-embeddings.sh
Updates QMD embeddings (should be run periodically):
- Re-indexes modified files via `qmd update`
- Re-embeds new/modified documents via `qmd embed`
- Designed to be run hourly via scheduled task

## Available Search Tools

Agents now have access to these MCP tools:

### mcp__qmd__query
Hybrid search combining BM25 keyword search, vector semantic search, and LLM reranking. Best quality, but slower.

**Parameters:**
- `query` (string) - Search query
- `collection` (string, optional) - Filter to specific collection
- `count` (number, optional) - Number of results (default: 5)
- `min_score` (number, optional) - Minimum similarity score

### mcp__qmd__vsearch
Vector-based semantic search. Finds documents by meaning rather than exact keywords.

**Parameters:** Same as `query`

### mcp__qmd__search
Fast BM25 keyword search. Good for exact phrase matching.

**Parameters:** Same as `query`

### mcp__qmd__get
Retrieve a specific document by path or docid.

**Parameters:**
- `path` (string) - Document path (e.g., `qmd://gandalf-main/claude.md`)
- `from_line` (number, optional) - Start from line number
- `max_lines` (number, optional) - Maximum lines to return

### mcp__qmd__multi_get
Retrieve multiple documents via glob patterns or comma-separated list.

**Parameters:**
- `pattern` (string) - Glob pattern or comma-separated paths
- `max_lines` (number, optional) - Maximum lines per file
- `max_bytes` (number, optional) - Skip files larger than N bytes

### mcp__qmd__status
Get QMD index status and collection information.

## Usage Examples

### Search across all conversations
```typescript
mcp__qmd__query({
  query: "memory system architecture",
  min_score: 0.3
})
```

### Search within specific group
```typescript
mcp__qmd__query({
  query: "user preferences",
  collection: "gandalf-main",
  count: 10
})
```

### Get a specific file
```typescript
mcp__qmd__get({
  path: "qmd://gandalf-main/claude.md"
})
```

### Get multiple conversation files
```typescript
mcp__qmd__multi_get({
  pattern: "conversations/*.md",
  max_lines: 50
})
```

## Maintenance

### Manual Index Update
```bash
cd /Users/agentsc/gandalf
export PATH="/Users/agentsc/.bun/bin:$PATH"
qmd update && qmd embed
```

### Check Status
```bash
qmd status
qmd collection list
```

### Add New Collections
When new groups are created, run:
```bash
bash scripts/setup-qmd.sh
```

## Next Steps (Recommended)

1. **Schedule Hourly Embedding Task** (from main channel):
   ```
   Use mcp__gandalf__schedule_task to run scripts/update-qmd-embeddings.sh every hour
   ```

2. **Test Search Integration** (from main channel):
   ```
   "Search our conversations for 'memory system'"
   ```

3. **Add Custom Context** (optional, from main channel):
   ```bash
   qmd context add qmd://gandalf-chan-general-387168 "General discussion channel with user preferences and casual conversations"
   ```

## Verification

### Collections are indexed
```bash
$ qmd collection list
# Should show 6 collections (main, global, 4 Discord channels)
```

### Search works
```bash
$ qmd search "memory" -c gandalf-main -n 3
# Should return results from main/CLAUDE.md
```

### MCP server runs
```bash
$ qmd mcp
# Should start MCP server on stdio (used by agents)
```

## Troubleshooting

### "command not found: qmd"
Ensure `/Users/agentsc/.bun/bin` is in PATH:
```bash
export PATH="/Users/agentsc/.bun/bin:$PATH"
which qmd
```

### No search results
Re-embed the collections:
```bash
qmd embed -f
```

### Agent can't access QMD tools
1. Check that agent-runner.ts has `mcp__qmd__*` in allowedTools
2. Verify the service was restarted after code changes
3. Check logs at `/Users/agentsc/gandalf/logs/gandalf.error.log`

## Performance Notes

- First search in a session downloads models (~2GB) - takes 1-2 minutes
- Subsequent searches are fast (< 1 second for keyword, 1-2 seconds for semantic)
- Embedding 800-token chunks takes ~1-2 seconds per document
- Re-embedding is idempotent (only processes new/modified documents)
- Index size is currently 3.1 MB for 3 documents

## Security Considerations

- QMD runs locally, no external API calls
- Models are cached in `~/.cache/qmd/models/`
- Index is stored in `~/.cache/qmd/index.sqlite`
- Each group's collection is isolated but searchable via collection filters
- No cross-contamination between groups unless explicitly searched

## Resources

- QMD GitHub: https://github.com/tobi/qmd
- QMD CLAUDE.md: https://github.com/tobi/qmd/blob/main/CLAUDE.md
- Bun Runtime: https://bun.sh
