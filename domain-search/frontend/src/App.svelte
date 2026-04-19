<script>
  import { Copy, Check, Globe, Zap, Search, FileDown, Terminal } from 'lucide-svelte'

  let copied = $state('')
  const installBrew = 'brew install sasha-computer/tap/domain-search'
  const installLinux = 'curl -fsSL https://raw.githubusercontent.com/sasha-computer/domain-search/main/install.sh | bash'
  const installUv = 'uvx domain-search creative'

  function copy(text, id) {
    navigator.clipboard.writeText(text)
    copied = id
    setTimeout(() => copied = '', 2000)
  }

  // Simulated terminal output
  const termLines = [
    { domain: 'creative.dev', status: 'available', type: 'exact', visual: '' },
    { domain: 'creative.studio', status: 'available', type: 'exact', visual: '' },
    { domain: 'creati.ve', status: 'available', type: 'hack', visual: 'creati.ve' },
    { domain: 'creative.io', status: 'registered', type: 'exact', visual: '' },
    { domain: 'creative.com', status: 'registered', type: 'exact', visual: '' },
    { domain: 'creative.ai', status: 'registered', type: 'exact', visual: '' },
    { domain: 'creativ.es', status: 'registered', type: 'hack', visual: 'creativ.es' },
  ]

  let visibleLines = $state(0)
  let terminalReady = $state(false)

  function startTerminal() {
    terminalReady = true
    visibleLines = 0
    const interval = setInterval(() => {
      visibleLines++
      if (visibleLines >= termLines.length) clearInterval(interval)
    }, 180)
  }

  // Intersection observer to trigger terminal animation
  let terminalEl = $state(null)

  $effect(() => {
    if (!terminalEl) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !terminalReady) startTerminal() },
      { threshold: 0.5 }
    )
    obs.observe(terminalEl)
    return () => obs.disconnect()
  })
</script>

<main>
  <!-- Hero -->
  <section class="hero">
    <img src="/hero.png" alt="" class="blob" />
    <h1>domain-search</h1>
    <p class="tagline">Find available domains across every TLD, right in the terminal.</p>
  </section>

  <!-- Install tabs -->
  <section class="install">
    <div class="install-tabs">
      <div class="install-option">
        <span class="install-label">macOS</span>
        <div class="install-block">
          <code>{installBrew}</code>
          <button class="copy-btn" onclick={() => copy(installBrew, 'brew')} aria-label="Copy">
            {#if copied === 'brew'}
              <Check size={16} strokeWidth={1.5} />
            {:else}
              <Copy size={16} strokeWidth={1.5} />
            {/if}
          </button>
        </div>
      </div>
      <div class="install-option">
        <span class="install-label">Linux</span>
        <div class="install-block">
          <code>{installLinux}</code>
          <button class="copy-btn" onclick={() => copy(installLinux, 'linux')} aria-label="Copy">
            {#if copied === 'linux'}
              <Check size={16} strokeWidth={1.5} />
            {:else}
              <Copy size={16} strokeWidth={1.5} />
            {/if}
          </button>
        </div>
      </div>
      <div class="install-option">
        <span class="install-label">Try without installing</span>
        <div class="install-block">
          <code>{installUv}</code>
          <button class="copy-btn" onclick={() => copy(installUv, 'uv')} aria-label="Copy">
            {#if copied === 'uv'}
              <Check size={16} strokeWidth={1.5} />
            {:else}
              <Copy size={16} strokeWidth={1.5} />
            {/if}
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Simulated terminal -->
  <section class="terminal-section" bind:this={terminalEl}>
    <div class="terminal">
      <div class="terminal-header">
        <div class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span class="terminal-title">domain-search creative</span>
      </div>
      <div class="terminal-body">
        <div class="term-prompt">
          <span class="term-dollar">$</span> domain-search creative
        </div>
        {#if terminalReady}
          <div class="term-info">Loaded 1,500 TLDs</div>
          <div class="term-table">
            <div class="term-row term-header-row">
              <span class="term-col-domain">Domain</span>
              <span class="term-col-status">Status</span>
              <span class="term-col-type">Type</span>
              <span class="term-col-visual">Visual</span>
            </div>
            {#each termLines as line, i}
              {#if i < visibleLines}
                <div class="term-row" class:fade-in={true}>
                  <span class="term-col-domain" class:domain-available={line.status === 'available'}>{line.domain}</span>
                  <span class="term-col-status {line.status}">{line.status}</span>
                  <span class="term-col-type">{line.type}</span>
                  <span class="term-col-visual">{line.visual}</span>
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="features">
    <div class="feature">
      <div class="feature-icon"><Globe size={20} strokeWidth={1.5} /></div>
      <div>
        <h3>Every TLD</h3>
        <p>Checks 1,500+ TLDs from the IANA root zone. Not just .com and .io.</p>
      </div>
    </div>
    <div class="feature">
      <div class="feature-icon"><Search size={20} strokeWidth={1.5} /></div>
      <div>
        <h3>Domain hacks</h3>
        <p>Finds clever splits like <code>creati.ve</code> and <code>nota.ble</code> automatically.</p>
      </div>
    </div>
    <div class="feature">
      <div class="feature-icon"><Zap size={20} strokeWidth={1.5} /></div>
      <div>
        <h3>Fast</h3>
        <p>Async DNS + RDAP checks run in parallel. 50 concurrent lookups by default.</p>
      </div>
    </div>
    <div class="feature">
      <div class="feature-icon"><FileDown size={20} strokeWidth={1.5} /></div>
      <div>
        <h3>Export</h3>
        <p>Save results as JSON, JSONL, or CSV for further processing.</p>
      </div>
    </div>
    <div class="feature">
      <div class="feature-icon"><Terminal size={20} strokeWidth={1.5} /></div>
      <div>
        <h3>No API keys</h3>
        <p>Uses public DNS and RDAP. No accounts, no tokens, no paid services.</p>
      </div>
    </div>
  </section>

  <!-- Usage -->
  <section class="usage">
    <h2>Usage</h2>
    <div class="usage-examples">
      <div class="usage-item">
        <p class="usage-desc">Search all TLDs</p>
        <code>domain-search creative</code>
      </div>
      <div class="usage-item">
        <p class="usage-desc">Filter to specific TLDs</p>
        <code>domain-search creative --tld com io dev ve</code>
      </div>
      <div class="usage-item">
        <p class="usage-desc">Skip RDAP for speed</p>
        <code>domain-search creative --skip-rdap</code>
      </div>
      <div class="usage-item">
        <p class="usage-desc">Export results</p>
        <code>domain-search creative --output results.csv</code>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <a href="https://github.com/sasha-computer/domain-search" class="github-link">GitHub</a>
  </footer>
</main>

<style>
  main {
    max-width: var(--content-width);
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Hero */
  .hero {
    text-align: center;
    padding-top: 80px;
  }

  .blob {
    width: 180px;
    height: 180px;
    animation: fadeIn 0.8s ease;
  }

  h1 {
    font-family: var(--mono);
    font-size: 3.5rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    animation: fadeIn 0.8s ease 0.1s both;
  }

  .tagline {
    color: var(--muted);
    font-size: 1.2rem;
    margin-bottom: 32px;
    animation: fadeIn 0.8s ease 0.2s both;
  }

  /* Install */
  .install {
    animation: fadeIn 0.8s ease 0.3s both;
  }

  .install-tabs {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .install-option {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .install-label {
    font-family: var(--mono);
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-left: 4px;
  }

  .install-block {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    background: var(--code-bg);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 14px 16px;
    transition: box-shadow 0.3s ease, border-color 0.3s ease;
  }

  .install-block:hover {
    border-color: rgba(126, 200, 160, 0.3);
    box-shadow: 0 0 40px var(--accent-glow);
  }

  .install-block code {
    font-family: var(--mono);
    font-size: 0.65rem;
    color: var(--fg);
    flex: 1;
    word-break: break-all;
    line-height: 1.5;
  }

  .copy-btn {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: color 0.2s, background 0.2s;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-btn:hover {
    color: var(--accent);
    background: rgba(126, 200, 160, 0.1);
  }

  /* Terminal */
  .terminal-section {
    margin-top: 48px;
    animation: fadeIn 0.8s ease 0.4s both;
  }

  .terminal {
    background: #12121a;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    overflow: hidden;
  }

  .terminal-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .terminal-dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .dot.red { background: #e06c75; }
  .dot.yellow { background: #e5c07b; }
  .dot.green { background: #7ec8a0; }

  .terminal-title {
    font-family: var(--mono);
    font-size: 0.7rem;
    color: var(--muted);
  }

  .terminal-body {
    padding: 16px 20px 20px;
    font-family: var(--mono);
    font-size: 0.72rem;
    line-height: 1.6;
    min-height: 240px;
  }

  .term-prompt {
    color: var(--fg);
    margin-bottom: 12px;
  }

  .term-dollar {
    color: var(--accent);
  }

  .term-info {
    color: var(--muted);
    margin-bottom: 12px;
    animation: fadeIn 0.3s ease;
  }

  .term-table {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .term-row {
    display: grid;
    grid-template-columns: 1fr 80px 50px 80px;
    gap: 8px;
    padding: 2px 0;
  }

  .term-header-row {
    color: var(--muted);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 6px;
    margin-bottom: 4px;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .term-col-domain { color: var(--fg); }
  .domain-available { color: var(--available); font-weight: 600; }
  .term-col-status { text-align: left; }
  .term-col-type { color: var(--muted); }
  .term-col-visual { color: var(--muted); }

  .term-col-status.available { color: var(--available); }
  .term-col-status.registered { color: var(--registered); }
  .term-col-status.unknown { color: var(--unknown); }

  .fade-in {
    animation: fadeIn 0.3s ease;
  }

  /* Features */
  .features {
    margin-top: 56px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    animation: fadeIn 0.8s ease 0.5s both;
  }

  .feature {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .feature-icon {
    color: var(--accent);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .feature h3 {
    font-family: var(--mono);
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .feature p {
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .feature code {
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--accent-dim);
    background: rgba(126, 200, 160, 0.08);
    padding: 1px 5px;
    border-radius: 4px;
  }

  /* Usage */
  .usage {
    margin-top: 56px;
    animation: fadeIn 0.8s ease 0.6s both;
  }

  .usage h2 {
    font-family: var(--mono);
    font-size: 1.2rem;
    font-weight: 400;
    margin-bottom: 20px;
  }

  .usage-examples {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .usage-item {
    background: var(--code-bg);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 14px 16px;
  }

  .usage-desc {
    font-size: 0.8rem;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .usage-item code {
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--fg);
  }

  /* Footer */
  footer {
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--muted);
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 48px;
    padding-top: 24px;
    padding-bottom: 40px;
  }

  footer a {
    color: var(--accent);
    text-decoration: none;
  }

  footer a:hover {
    text-decoration: underline;
  }

  .github-link {
    font-family: var(--mono);
    font-size: 0.8rem;
  }

  /* Animation */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Mobile */
  @media (max-width: 500px) {
    h1 {
      font-size: 2.5rem;
    }

    .term-row {
      grid-template-columns: 1fr 70px 40px 60px;
      font-size: 0.6rem;
    }

    .terminal-body {
      padding: 12px 14px 16px;
      font-size: 0.62rem;
    }
  }
</style>
