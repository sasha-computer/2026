#!/bin/bash
# Setup QMD collections for NanoClaw
# This script creates a QMD collection for each group's memory and conversations

set -e

# Ensure PATH includes bun bin directory
export PATH="/Users/agentsc/.bun/bin:$PATH"

echo "Setting up QMD collections for NanoClaw..."

# Create collections for all group folders
for group_dir in groups/*/; do
  if [ -d "$group_dir" ]; then
    folder=$(basename "$group_dir")
    collection_name="nanoclaw-$folder"

    echo "Creating collection: $collection_name for $group_dir"
    qmd collection add "$group_dir" --name "$collection_name" --mask "**/*.md"

    # Add context description for the collection
    if [ "$folder" = "main" ]; then
      qmd context add "qmd://$collection_name" "Main admin channel for NanoClaw. Contains system configuration, scheduled tasks, and administrative operations."
    elif [ "$folder" = "global" ]; then
      qmd context add "qmd://$collection_name" "Shared global memory across all non-main NanoClaw groups. Contains common knowledge and cross-group context."
    else
      qmd context add "qmd://$collection_name" "Discord channel group for NanoClaw. Contains conversations and channel-specific memory."
    fi
  fi
done

echo ""
echo "Collections created. Running initial embedding..."
qmd embed

echo ""
echo "Setup complete! Collection status:"
qmd status
