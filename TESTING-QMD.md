# Testing QMD Integration

This document contains test cases to verify the QMD integration is working correctly.

## Pre-flight Checks

### 1. Verify Bun is installed
```bash
which bun
# Expected: /Users/agentsc/.bun/bin/bun
```

### 2. Verify QMD is installed
```bash
which qmd
# Expected: /Users/agentsc/.bun/bin/qmd
```

### 3. Verify collections exist
```bash
qmd collection list
# Expected: 6 collections (main, global, 4 Discord channels)
```

### 4. Verify service is running
```bash
launchctl list | grep gandalf
# Expected: Process ID, exit code 0, com.gandalf
```

### 5. Verify PATH in service config
```bash
grep -A1 PATH ~/Library/LaunchAgents/com.gandalf.plist
# Expected: PATH includes /Users/agentsc/.bun/bin
```

## CLI Tests

### Test 1: Keyword Search
```bash
export PATH="/Users/agentsc/.bun/bin:$PATH"
qmd search "memory" -c gandalf-main -n 3
```

**Expected:** Results from main/CLAUDE.md with snippets containing "memory"

### Test 2: Vector Semantic Search
```bash
qmd vsearch "how to remember information" -c gandalf-main -n 3
```

**Expected:** Results related to memory/storage concepts, even without exact keyword match

### Test 3: Hybrid Query
```bash
qmd query "agent capabilities and features" -c gandalf-global --min-score 0.2
```

**Expected:** Relevant results from global CLAUDE.md with scores > 0.2

### Test 4: Get Specific Document
```bash
qmd get qmd://gandalf-main/claude.md
```

**Expected:** Full contents of main/CLAUDE.md

### Test 5: Multi-get with Pattern
```bash
qmd multi-get "*/claude.md" -l 20
```

**Expected:** First 20 lines from all CLAUDE.md files across collections

### Test 6: Collection Status
```bash
qmd status
```

**Expected:**
- Index size (~3-5 MB)
- 3 documents indexed
- 3 vectors embedded
- List of 6 collections

## Agent Integration Tests

These tests should be performed from Discord by sending messages to the main channel.

### Test 1: List QMD Collections
**Send:** "Use the QMD status tool to show all indexed collections"

**Expected:** Agent calls `mcp__qmd__status` and reports:
- 6 collections
- Collection names and file counts
- Index status

### Test 2: Search Main Memory
**Send:** "Search our main channel memory for information about 'scheduling'"

**Expected:** Agent calls `mcp__qmd__query` with:
- `query`: "scheduling"
- `collection`: "gandalf-main"

Results should include mentions of task scheduling from CLAUDE.md

### Test 3: Semantic Search Across All Groups
**Send:** "What have we discussed about memory systems? Search all groups."

**Expected:** Agent calls `mcp__qmd__vsearch` without collection filter, returns results from multiple groups mentioning memory/storage concepts

### Test 4: Get Specific File
**Send:** "Get the global CLAUDE.md file using QMD"

**Expected:** Agent calls `mcp__qmd__get` with path `qmd://gandalf-global/claude.md`, returns file contents

### Test 5: Multi-get Pattern
**Send:** "Get all CLAUDE.md files from all groups, limit 30 lines each"

**Expected:** Agent calls `mcp__qmd__multi_get` with:
- `pattern`: "*/claude.md" or "**/*CLAUDE.md"
- `max_lines`: 30

## Update Script Tests

### Test 1: Manual Update
```bash
bash scripts/update-qmd-embeddings.sh
```

**Expected:**
- Runs `qmd update` successfully
- Runs `qmd embed` successfully
- No errors

### Test 2: Setup Script Re-run
```bash
bash scripts/setup-qmd.sh
```

**Expected:**
- Detects existing collections
- Updates if needed
- No errors or duplicates

## Error Cases

### Test 1: Invalid Collection Name
```bash
qmd search "test" -c gandalf-nonexistent
```

**Expected:** Error message about collection not found

### Test 2: Invalid Document Path
```bash
qmd get qmd://gandalf-main/nonexistent.md
```

**Expected:** Error message about document not found

### Test 3: QMD Not in PATH
```bash
env PATH=/usr/bin:/bin qmd status
```

**Expected:** "command not found: qmd"

## Performance Tests

### Test 1: Embedding Speed
```bash
time qmd embed
```

**Expected:** < 5 seconds for 3 documents (already embedded, should be fast)

### Test 2: Search Speed (Keyword)
```bash
time qmd search "memory" -c gandalf-main
```

**Expected:** < 1 second

### Test 3: Search Speed (Semantic)
```bash
time qmd vsearch "agent capabilities" -c gandalf-global
```

**Expected:** 1-2 seconds

### Test 4: Search Speed (Hybrid)
```bash
time qmd query "task scheduling features" --min-score 0.3
```

**Expected:** 2-3 seconds

## Integration with Gandalf

### Test 1: Agent Can Call QMD Tools
From Discord main channel:
**Send:** "What QMD tools do you have access to?"

**Expected:** Agent lists:
- mcp__qmd__query
- mcp__qmd__vsearch
- mcp__qmd__search
- mcp__qmd__get
- mcp__qmd__multi_get
- mcp__qmd__status

### Test 2: Agent Uses QMD When Prompted
**Send:** "Search for 'Discord' in our conversations"

**Expected:** Agent proactively uses QMD search tools, not just grep/find

### Test 3: Agent Respects Collection Boundaries
**Send:** "Search only the main channel for 'admin'"

**Expected:** Agent includes `collection: "gandalf-main"` parameter

## Scheduled Task Test (Future)

Once scheduled task is set up:

### Test 1: Verify Task Exists
From Discord main channel:
**Send:** "List all scheduled tasks"

**Expected:** Shows hourly QMD embedding update task

### Test 2: Verify Task Runs
Wait 1 hour after task creation, then:
```bash
sqlite3 store/messages.db "
  SELECT last_run_time, next_run_time, status
  FROM tasks
  WHERE prompt LIKE '%qmd%'
  ORDER BY last_run_time DESC
  LIMIT 1;
"
```

**Expected:**
- `last_run_time` within last hour
- `next_run_time` ~1 hour in future
- `status` = 'completed'

## Troubleshooting Reference

### Issue: "command not found: qmd"
**Fix:** Add to PATH: `export PATH="/Users/agentsc/.bun/bin:$PATH"`

### Issue: Agent can't access QMD tools
**Check:**
1. Is `mcp__qmd__*` in allowedTools? (agent-runner.ts:287)
2. Is QMD in mcpServers config? (agent-runner.ts:293)
3. Was service restarted after code changes?
4. Check logs: `tail -50 ~/gandalf/logs/gandalf.error.log`

### Issue: No search results
**Fix:** Re-embed: `qmd embed -f`

### Issue: Models not downloading
**Check:**
1. Internet connection
2. Disk space (~2GB needed)
3. Cache directory writeable: `ls -la ~/.cache/qmd/`

### Issue: Search is slow
**Expected:** First run downloads models (1-2 min), subsequent runs fast (< 2s)

## Success Criteria

✅ All CLI tests pass
✅ All agent integration tests pass
✅ QMD tools appear in agent's tool list
✅ Agents use QMD when asked to search memory
✅ No errors in Gandalf logs related to QMD
✅ Collections update correctly when files change
✅ Performance is acceptable (< 2s per search)

## Next Steps After Validation

1. Set up hourly embedding update task (from main channel)
2. Add custom context for each Discord channel
3. Test cross-group search functionality
4. Monitor search quality and adjust min_score thresholds
5. Consider adding conversation summaries for better indexing
