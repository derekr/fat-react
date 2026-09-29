import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/delete-row/`;
const rowsPath = `${exampleScope}__redact/rows`;
const reset = defineRedaction({ path: `${rowsPath}/reset`, method: 'post', schema: z.object({}) });

const example = `const reset = defineRedaction({
  path: resetPath, method: 'post', schema: z.object({}),
});

<section>
  <Redact id="delete-rows" src={rowsPath} />
  <Rewire asChild action={reset} input={{}}>
    <button type="button">Restore sample rows</button>
  </Rewire>
</section>

// The backend owns the list inside the Redact host.
// Each server-rendered button has a native data-on:click
// DELETE expression with an ID the server validates.
// The response morphs the list with that row removed.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 09 / Deleting rows</div>
      <h1>Delete <em>Row.</em></h1>
      <p className="lede">Remove an invented archive entry. The backend owns each row and its Delete button, validates the requested ID, and morphs the remaining list.</p>
      <section className="panel result delete-shell" aria-labelledby="delete-title">
        <div className="panel-heading"><span className="step">01 / THE ARCHIVE</span><span className="live"><span /> SERVER-OWNED ROWS</span></div>
        <h2 id="delete-title">A little index.</h2>
        <p className="panel-description">Delete one row or all four. Restore the sample when you’re ready to try again.</p>
        <Redact id="delete-rows" className="delete-region" src={rowsPath} fallback="Loading sample entries…" />
        <div className="delete-actions"><Rewire asChild action={reset} input={{}} indicator="_resettingRows">
          <button type="button" data-attr:disabled="$_resettingRows">Restore sample rows</button>
        </Rewire></div>
        <p className="load-explainer">The <code>DELETE</code> URL names a row, but the server checks that ID and whether the row still exists before updating its list.</p>
      </section>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="delete-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="delete-code-title">The row belongs to the server.</h2></div><p>React owns the Redact host and typed reset button. The mock backend renders row controls inside the host and handles each validated delete.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/delete-row.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented archive entries only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
