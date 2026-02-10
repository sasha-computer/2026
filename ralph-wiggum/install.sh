#!/usr/bin/env bash
# Install ralph-wiggum into current directory
set -e

BASE="https://raw.githubusercontent.com/neutronmoderator/ralph-wiggum/main"

curl -fsSL "$BASE/ralph-wiggum" -o ralph-wiggum
curl -fsSL "$BASE/prompt.md" -o prompt.md
curl -fsSL "$BASE/PRD.md" -o PRD.md
touch progress.txt
mkdir -p .claude/commands
curl -fsSL "$BASE/.claude/commands/prd.md" -o .claude/commands/prd.md
chmod +x ralph-wiggum

echo "Done! Run /prd in Claude Code to add tasks, then ./ralph-wiggum to start."
