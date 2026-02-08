#!/bin/bash
# Update QMD embeddings for all Gandalf collections
# This should be run periodically (e.g., hourly) to keep search indexes fresh

set -e

# Ensure PATH includes bun bin directory
export PATH="/Users/agentsc/.bun/bin:$PATH"

cd /Users/agentsc/nanoclaw

# Update collections (re-index any modified files)
qmd update

# Re-embed any new or modified documents
qmd embed
