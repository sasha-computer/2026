# sashas.life personal website

## Project Description
- Currently, the project simply scaffolds a personal website with header, nav bar, body and footer. 
- The website is minimalist in design, *almost* brutalist.
- The font is [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville). 
  - Ideally, the font is served directly and *not* via Google.
- The website should be modular; the goal is have personal writing, running trackers, bookshelf tracker and what I'm reading and much more.

## Environment Setup
- This project uses Hugo as a static site generator.
- Use `bun` for any JS tooling instead of `npm` or `yarn`.
- Stay away from frameworks like React, Svelte or Vue. Stick as close to HTML, CSS and JS as possible.
- This website will be deployed via Cloudflare Pages (build command: `hugo`, output: `public/`).

## Code conventions
- Where necessary, create modular code to reuse elsewhere in the website (i.e. repetitive calls to the DOM API etc. to make a somewhat easier API interface for readability).
- Make the code as readable as possible. 
- Don't overcomment, only comment the top of files with the general purpose of the file, it's main function signatures and input/outputs.
- 2-space indentation for JS/TS files.

## Project Structure
```
.
├── hugo.toml              # Hugo config
├── content/
│   ├── _index.md          # Homepage content
│   └── running.md         # Running page
├── layouts/
│   ├── _default/
│   │   ├── baseof.html    # Base template (head, nav)
│   │   ├── single.html    # Single page template
│   │   ├── list.html      # List template (for blog)
│   │   └── running.html   # Running page layout
│   ├── index.html         # Homepage template
│   └── partials/
│       └── nav.html       # Shared navbar
├── static/
│   ├── css/style.css      # Global styles
│   ├── fonts/             # Self-hosted Libre Baskerville
│   ├── js/
│   │   ├── calendar.js    # Calendar widget
│   │   └── runs.js        # Run data fetching
│   └── runs.md            # Running data
└── public/                # Generated output (git-ignored)
```

## Important Notes
- "apex predator of grug is complexity"
- "complexity bad, very very bad"

## Future Goals
- This website will act as a public reflection of my (Sasha!) life: what I read, what I write, what I'm up to. etc. 
  - This [article](https://borretti.me/article/i-wish-people-were-more-public) is inspiration.
