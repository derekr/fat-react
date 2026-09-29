import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/sortable-list/`;
const listPath = `${exampleScope}__redact/sort`;
const reset = defineRedaction({ path: `${listPath}/reset`, method: 'post', schema: z.object({}) });

const example = `const reset = defineRedaction({
  path: resetPath, method: 'post', schema: z.object({}),
});

<Recast asChild signals={{ draggedCard: '' }}>
  <section>
    <Redact id="sort-items" src={listPath} />
    <Rewire asChild action={reset} input={{}}>
      <button type="button">Restore order</button>
    </Rewire>
  </section>
</Recast>

// Server-rendered cards own native dragstart, dragover,
// drop, and arrow-button directives. The server validates
// every source and destination before saving the order.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 13 / Reordering</div>
      <h1>Sortable <em>List.</em></h1>
      <p className="lede">Drag an invented card onto another, or use its arrow buttons. The mock backend validates the move, stores the new order, and sends back the complete list.</p>
      <Recast asChild signals={{ draggedCard: '' }}>
        <section className="panel result sort-shell" aria-labelledby="sort-title">
          <div className="panel-heading"><span className="step">01 / THE CARDS</span><span className="live"><span /> SERVER ORDER</span></div>
          <h2 id="sort-title">Arrange the archive.</h2>
          <p className="panel-description" id="sort-instructions">Drag a card onto another card to move it. For keyboard access, use the Up and Down buttons.</p>
          <Redact id="sort-items" className="sort-region" src={listPath} fallback="Loading the cards…" />
          <div className="sort-footer"><Rewire asChild action={reset} input={{}} indicator="_sortResetting">
            <button type="button" data-attr:disabled="$_sortResetting">Restore original order</button>
          </Rewire></div>
          <p className="load-explainer">The browser sends a source card and target position. The server accepts only known IDs and renders its authoritative order.</p>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="sort-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="sort-code-title">The server settles the order.</h2></div><p>The Redact host contains server-owned draggable cards and keyboard-friendly controls. A validated POST updates the list before it morphs.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/sortable-list.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented cards only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
