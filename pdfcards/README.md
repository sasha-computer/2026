# pdfcards

> ⚠️ **Early stages.** This works but is very much a prototype. Built in response to [Dwarkesh Patel and Andy Matuschak's conversation on studying and spaced repetition](https://www.youtube.com/watch?v=dJRiWnKtEH4).

[![Dwarkesh x Andy Matuschak](https://img.youtube.com/vi/dJRiWnKtEH4/maxresdefault.jpg)](https://www.youtube.com/watch?v=dJRiWnKtEH4)

A local PDF reader with built-in highlighting and spaced repetition flashcards. Highlight text in any PDF, turn highlights into flashcards, and review them with an SRS system. All data stored locally in `~/.config/pdfx/`.

## How it works

1. Open any PDF in the viewer
2. Highlight text to create flashcards
3. Hit the review button to study with spaced repetition (Again/Hard/Good/Easy ratings)
4. Highlights and review state persist across sessions

## Getting started

Make sure you have [Bun](https://bun.sh) installed.

```bash
git clone https://github.com/sasha-computer/pdfcards.git
cd pdfcards
bun install
bun run index.ts <path-to-your.pdf>
```

Opens a local viewer at `http://localhost:3000`.

## Stack

Bun, TypeScript, pdf.js, vanilla HTML/CSS/JS
