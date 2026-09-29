import React, { useEffect, useRef } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/modal-details/`;
const details = defineRedaction({
  path: `${exampleScope}__redact/details/view`, method: 'get',
  schema: z.object({ id: z.enum(['fern', 'map', 'star']) }),
});
const entries = [
  { id: 'fern', name: 'Copperleaf fern' },
  { id: 'map', name: 'Paper trail map' },
  { id: 'star', name: 'Evening star chart' },
] as const;

const example = `const details = defineRedaction({
  path: detailsPath, method: 'get',
  schema: z.object({ id: z.enum(['fern', 'map', 'star']) }),
});

const dialog = useRef<HTMLDialogElement>(null);

<Rewire asChild action={details} input={{ id: 'fern' }}
  indicator="_detailsLoading">
  <button type="button" onClick={() => dialog.current?.showModal()}>
    View fern
  </button>
</Rewire>
<dialog ref={dialog} aria-labelledby="details-title">
  <h2 id="details-title">Entry details</h2>
  <Recast asChild show="$_detailsLoading">
    <p>Loading entry…</p>
  </Recast>
  <Redact id="modal-content" />
  <button type="button" onClick={() => dialog.current?.close()}>Close</button>
</dialog>

// showModal() runs on the click; HTML arrives later by SSE.
// The server validates the requested ID before rendering.`;

function App() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 12 / On-demand details</div>
      <h1>Modal <em>Details.</em></h1>
      <p className="lede">The dialog opens immediately on click. Its details arrive afterward from the mock backend, without delaying the browser’s native dialog interaction.</p>
      <Recast asChild signals={{ _detailsLoading: false }}>
        <section className="panel result modal-shell" aria-labelledby="modal-title">
          <div className="panel-heading"><span className="step">01 / THE COLLECTION</span><span className="live"><span /> ASYNC DETAILS</span></div>
          <h2 id="modal-title">Choose an entry.</h2>
          <p className="panel-description">Click any invented entry. The dialog opens first and shows a loading state until its validated GET response arrives.</p>
          <div className="modal-choices">
            {entries.map(({ id, name }) => <Rewire key={id} asChild action={details} input={{ id }} indicator="_detailsLoading">
              <button type="button" onClick={() => dialog.current?.showModal()} data-attr:disabled="$_detailsLoading">{name} <span aria-hidden="true">↗</span></button>
            </Rewire>)}
          </div>
          <dialog ref={dialog} className="details-dialog" aria-labelledby="details-title">
            <div className="details-heading"><div><span className="step">SERVER DETAIL</span><h2 id="details-title">Entry details</h2></div>
              <button type="button" className="details-close" onClick={() => dialog.current?.close()} aria-label="Close details">×</button></div>
            <Recast asChild show="$_detailsLoading"><p className="details-loading" style={{ display: 'none' }} role="status">Loading entry details…</p></Recast>
            <Recast asChild show="!$_detailsLoading"><div><Redact id="modal-content" className="details-region" fallback="Choose an entry to view its details." /></div></Recast>
            <button type="button" className="details-done" onClick={() => dialog.current?.close()}>Close</button>
          </dialog>
          <p className="load-explainer">The dialog and trigger belong to React. Datastar morphs only the contents of <code>#modal-content</code>.</p>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="modal-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="modal-code-title">Open now, fill later.</h2></div><p>Native <code>showModal()</code> opens the dialog on click. Rewire starts an independent GET; the server validates the ID before sending the detail fragment.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/modal-details.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented records only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
