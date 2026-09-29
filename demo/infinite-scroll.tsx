import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, redactionExpression, Redact, Recast } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleBase = `${base}examples/`;
const exampleScope = `${exampleBase}infinite-scroll/`;
const listPath = `${exampleScope}__redact/scroll`;
const more = defineRedaction({ path: `${listPath}/more`, method: 'get', schema: z.object({}) });
const requestNext = redactionExpression(more, {}, { filterSignals: { include: /^scrollPage$/ } });

const example = `const more = defineRedaction({
  path: \`\${listPath}/more\`, method: 'get', schema: z.object({}),
});
const requestNext = redactionExpression(more, {}, {
  filterSignals: { include: /^scrollPage$/ },
});

<Recast asChild signals={{ scrollPage: 1, scrollHasMore: true, scrollReady: false }}>
  <section>
    <div className="scroll-window" tabIndex={0} aria-label="Scrollable archive">
      <Redact id="scroll-items" src={listPath} />
      <Recast asChild show="$scrollReady && $scrollHasMore">
        <div><Recast asChild indicator="_scrollLoading" onIntersect={{
          expression: \`!\$_scrollLoading && $scrollHasMore && \${requestNext}\`,
          half: true, throttle: 300,
        }}><div>Scroll to load more…</div></Recast></div>
      </Recast>
    </div>
  </section>
</Recast>

// The server validates scrollPage and appends the next batch:
redactPatch('scroll-items', renderedCards, 'append');`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main scroll-shell">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 04 / Intersection</div>
      <h1>Infinite <em>Scroll.</em></h1>
      <p className="lede">No scroll listener or React paging state. When the sentinel enters view, Datastar requests the next batch and appends its HTML to the host.</p>
      <Recast asChild signals={{ scrollPage: 1, scrollHasMore: true, scrollReady: false }}>
        <section className="panel result load-panel" aria-labelledby="scroll-title">
          <div className="panel-heading"><span className="step">01 / THE SCROLL WINDOW</span><span className="live"><span /> LIVE HTML</span></div>
          <h2 id="scroll-title">The little archive, continued.</h2>
          <p className="panel-description">Four entries at a time. Scroll inside the collection, or focus it and use the keyboard.</p>
          <div className="scroll-window" tabIndex={0} aria-label="Scrollable archive">
            <Redact id="scroll-items" className="scroll-list" src={listPath} fallback="Loading the first page…" />
            <Recast asChild show="$scrollReady && $scrollHasMore"><div style={{ display: 'none' }}>
              <Recast asChild indicator="_scrollLoading" onIntersect={{
                expression: `!$_scrollLoading && $scrollHasMore && ${requestNext}`,
                half: true, throttle: 300,
              }}><div className="scroll-sentinel" role="status">Scroll to load more…</div></Recast>
            </div></Recast>
          </div>
          <Recast asChild show="!$scrollHasMore"><p className="scroll-finished" style={{ display: 'none' }} role="status">You reached the end of the archive.</p></Recast>
          <p className="scroll-guide"><strong>What’s happening:</strong> the server checks the page against a per-tab cursor. The sentinel stays React-owned below the morph host and is hidden after the last batch.</p>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="scroll-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="scroll-code-title">The viewport becomes the trigger.</h2></div><p>Recast provides typed intersection modifiers. <code>redactionExpression</code> quotes the action URL; the backend remains responsible for pagination.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/infinite-scroll.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Sample data only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
