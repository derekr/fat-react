import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleBase = `${base}examples/`;
const listPath = `${exampleBase}__redact/load`;
const more = defineRedaction({ path: `${listPath}/more`, method: 'get', schema: z.object({}) });

const example = `const more = defineRedaction({
  path: \`\${listPath}/more\`, method: 'get', schema: z.object({}),
});

<Recast asChild signals={{ loadPage: 1, loadHasMore: true }}>
  <section>
    <Redact id="load-items" src={listPath} />
    <Recast asChild show="$loadHasMore">
      <div><Rewire asChild action={more} input={{}}
        indicator="_loadingMore" filterSignals={{ include: /^loadPage$/ }}>
        <button data-attr:disabled="$_loadingMore">Load more</button>
      </Rewire></div>
    </Recast>
  </section>
</Recast>

// After validating the next page, the server responds with:
redactPatch('load-items', renderedCards, 'append');`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 03 / Append patches</div>
      <h1>Click To <em>Load.</em></h1>
      <p className="lede">Each click asks for the next batch. The server responds with an SSE append patch, so the cards you’ve already loaded stay in the host.</p>
      <Recast asChild signals={{ loadPage: 1, loadHasMore: true }}>
        <section className="panel result load-shell load-panel" aria-labelledby="load-title">
          <div className="panel-heading"><span className="step">01 / THE COLLECTION</span><span className="live"><span /> LIVE HTML</span></div>
          <h2 id="load-title">The little archive.</h2>
          <p className="panel-description">Twelve invented entries, four per page. Load the rest without replacing this first set.</p>
          <Redact id="load-items" className="load-region" src={listPath} fallback="Loading the first page…" />
          <div className="load-actions">
            <Recast asChild show="$loadHasMore"><div>
              <Rewire asChild action={more} input={{}} indicator="_loadingMore" filterSignals={{ include: /^loadPage$/ }}>
                <button type="button" data-attr:disabled="$_loadingMore || !$loadHasMore">Load more entries ↓</button>
              </Rewire>
            </div></Recast>
            <Recast asChild show="$_loadingMore"><span className="load-status" role="status" style={{ display: 'none' }}>Fetching the next page…</span></Recast>
            <Recast asChild show="!$loadHasMore"><span className="load-status" role="status" style={{ display: 'none' }}>That’s the whole archive.</span></Recast>
          </div>
          <p className="load-explainer">The server checks the requested <code>loadPage</code> against its per-tab cursor, then sends new HTML and patches the cursor signal. A stale or out-of-range page is rejected.</p>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="load-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="load-code-title">Append, don’t replace.</h2></div><p>Rewire handles the request and loading indicator. The server validates pagination and emits <code>mode append</code> targeted at the Redact host.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/click-to-load.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Sample data only.</footer>
  </div>;
}

void bootstrap(<App />, exampleBase);
