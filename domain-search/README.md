<p align="center">
  <img src="assets/hero.png" alt="domain-search" width="200" />
</p>

<h1 align="center">domain-search</h1>

<p align="center">
  Search for available domains across every TLD, right in the terminal.
</p>

<p align="center">
  <a href="#why-domain-search">Why?</a> ·
  <a href="#how-does-it-work">How it works</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#usage">Usage</a>
</p>

## Why domain-search?

You have a name for your project. You open a registrar, type it in, and get one result for `.com`. Taken. So you try another registrar that shows more TLDs — maybe five, maybe ten. Still nothing great. You never find out that `creati.ve` was sitting there available the whole time.

**domain-search fixes this.** It checks your term against the entire IANA TLD list, finds domain hacks where the TLD completes your word, and tells you what's actually available — all from the terminal, no API keys, no paid service.

## How does it work?

<p align="center">
  <img src="assets/domain-search-demo.gif" alt="domain-search demo" width="800" />
</p>

- Checks every TLD in the IANA root zone — not just the popular ones
- Finds domain hacks automatically (`creati.ve`, `nota.ble`, etc.)
- Runs async DNS + RDAP checks in parallel for speed
- No API keys or paid services required
- Exports to JSON, JSONL, or CSV

## Installation

**macOS (Homebrew):**

```bash
brew install sasha-computer/tap/domain-search
```

**Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/sasha-computer/domain-search/main/install.sh | bash
```

**Try without installing** (requires [uv](https://docs.astral.sh/uv/)):

```bash
uvx domain-search creative
```

## Usage

Basic search:

```bash
domain-search creative
```

Search only specific TLDs:

```bash
domain-search creative --tld com io dev ve
```

Skip RDAP for speed (less accurate):

```bash
domain-search creative --skip-rdap
```

Export results:

```bash
domain-search creative --output results.json
domain-search creative --output results.csv
```

## How it searches

For a term like `creative`, the CLI does two passes:

1. **Exact candidates** — `creative.com`, `creative.dev`, etc.
2. **Domain hacks** — `creati.ve` style splits where the TLD completes the word.

Then it checks candidates in stages: loads the full IANA TLD list (cached locally), runs async DNS checks to quickly classify candidates, verifies possibly-available domains with RDAP (unless `--skip-rdap`), and prints a table sorted with available domains first.

## License

MIT
