# ralph-wiggum 🫡

> *"I'm helping!"*

A tiny CLI tool that turns [Claude Code](https://docs.anthropic.com/en/docs/claude-code) into an autonomous task runner. Give it a PRD (Product Requirements Document), and it will work through each task one at a time, committing as it goes.

## How it works

1. You define tasks in `PRD.md` under the "Planned" section
2. Run `./ralph-wiggum` (or pass a max iteration count like `./ralph-wiggum 5`)
3. Each iteration, Claude picks the highest priority task, implements it, updates `progress.txt`, commits, and moves the task to "In Review"
4. Stops when the PRD is complete or max iterations are reached

Uses [gum](https://github.com/charmbracelet/gum) for the terminal UI.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/sasha-computer/ralph-wiggum/main/install.sh | bash
```

This drops `ralph-wiggum`, `prompt.md`, `PRD.md`, and a Claude Code command into your current directory.

## Usage

```bash
# Add tasks to PRD.md using the /prd slash command in Claude Code, then:
./ralph-wiggum      # single iteration
./ralph-wiggum 10   # up to 10 iterations
```

## Stack

Bash, Claude Code, gum
