# Gandalf

## Changes from NanoClaw

- **Discord-only** — WhatsApp/Baileys replaced with Discord.js
- **No containerization** — Agents run as native Node.js subprocesses instead of Apple Container/Docker VMs
- **No trigger required** — Responds to all messages in all channels by default (configurable per-channel via `requiresTrigger`)
- **Auto-registration** — Channels are automatically registered on first message, no manual setup needed
- **Session-based context** — Per-channel conversation context via Claude session IDs stored in SQLite
- **Slash commands** — `/new`, `/clear`, `/status` as native Discord slash commands
- **QMD integration** — Local semantic search across conversations and memory via [QMD](https://github.com/tobi/qmd)

Upstream: [NanoClaw](https://github.com/gavrielc/nanoclaw)
