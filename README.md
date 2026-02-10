# 2026

Monorepo for my 2026 projects.

## ⭐ pdfcards

A local PDF reader with built-in highlighting and spaced repetition flashcards. Highlight text in any PDF, turn those highlights into flashcards, and review them with an SRS system (Again/Hard/Good/Easy). All data stored locally. Built in response to [Dwarkesh Patel and Andy Matuschak's conversation on studying and spaced repetition](https://www.youtube.com/watch?v=OFuu4pesKf0). Very early stages but it works.

[![Dwarkesh x Andy Matuschak](./pdfcards/dwarkesh_matuschak.jpg)](https://www.youtube.com/watch?v=OFuu4pesKf0)

**Stack:** Bun · TypeScript · pdf.js

→ [browse code](./pdfcards)

## ⭐ ralph-wiggum

A tiny CLI tool that turns Claude Code into an autonomous task runner. Give it a PRD, run `./ralph-wiggum 10`, and it works through each task one by one: picks the highest priority item, implements it, commits, updates progress, and moves on. Uses [gum](https://github.com/charmbracelet/gum) for the terminal UI. Stops when the PRD is done or max iterations are hit.

**Stack:** Bash · Claude Code · gum

→ [browse code](./ralph-wiggum)

## ⭐ sashas-life

My personal website, built with Hugo. A minimal site with a running log that parses Apple Health and Garmin data into a calendar view.

**Stack:** Hugo · HTML · CSS · JavaScript

→ [browse code](./sashas-life)

## ⭐ boundless-debug

Debug tool for Boundless proof requests. Fetches a proof request from the BoundlessMarket contract on Base, downloads the guest program ELF (supports IPFS), and executes it locally in the RISC Zero zkVM in execute-only mode. Reports cycles, journal output, and any errors. Human-readable output by default, JSON with `--json` for scripting.

**Stack:** Rust · RISC Zero · Nix

→ [browse code](./boundless-debug)

## ⭐ practice-problems

A collection of handwritten coding practice problems in Python and Scheme. Memoized factorials with closures, recursive joins, depth-weighted sums, parentheses generation, currying, palindromes, and more.

**Stack:** Python · Scheme

→ [browse code](./practice-problems)
