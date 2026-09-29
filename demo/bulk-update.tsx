import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/bulk-update/`;
const listPath = `${exampleScope}__redact/bulk`;
const activate = defineRedaction({ path: `${listPath}/activate`, method: 'put', schema: z.object({}) });
const deactivate = defineRedaction({ path: `${listPath}/deactivate`, method: 'put', schema: z.object({}) });
const initialSelection = { note01: false, note02: false, note03: false, note04: false };
const selected = 'Object.values($bulkSelection).some(Boolean)';
const allSelected = 'Object.values($bulkSelection).every(Boolean)';
const selectAll = `$bulkSelection = Object.fromEntries(Object.keys($bulkSelection).map(id => [id, !(${allSelected})]))`;

const example = `const activate = defineRedaction({
  path: activatePath, method: 'put', schema: z.object({}),
});

<Recast asChild signals={{ bulkSelection: {
  note01: false, note02: false, note03: false, note04: false,
} }}>
  <section>
    <Recast asChild text="${allSelected} ? 'Clear selection' : 'Select all entries'"
      events={[{ event: 'click', expression: '${selectAll}' }]}>
      <button type="button">Select all entries</button>
    </Recast>
    <Redact id="bulk-entries" src={listPath} />
    <Rewire asChild action={activate} input={{}}>
      <button type="button">Activate selected</button>
    </Rewire>
  </section>
</Recast>

// Server-rendered rows bind bulkSelection.note01, etc.
// The PUT handler validates every ID and boolean before updating.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 06 / Batch actions</div>
      <h1>Bulk <em>Update.</em></h1>
      <p className="lede">Choose a few invented archive entries, then activate or deactivate them together. The server checks every selected ID before updating its records and returning fresh HTML.</p>
      <Recast asChild signals={{ bulkSelection: initialSelection }}>
        <section className="panel result bulk-shell" aria-labelledby="bulk-title">
          <div className="panel-heading"><span className="step">01 / THE COLLECTION</span><span className="live"><span /> LIVE HTML</span></div>
          <h2 id="bulk-title">Archive entries.</h2>
          <p className="panel-description">Select rows individually or choose them all. This demo stores the statuses in the mock backend.</p>
          <div className="bulk-select-all"><Recast asChild text={`${allSelected} ? 'Clear selection' : 'Select all entries'`} attr={{ disabled: '$_bulkSaving' }} events={[{ event: 'click', expression: selectAll }]}>
            <button type="button">Select all entries</button>
          </Recast></div>
          <Redact id="bulk-entries" className="bulk-region" src={listPath} fallback="Loading archive entries…" />
          <div className="bulk-actions" role="group" aria-label="Bulk actions">
            <Rewire asChild action={activate} input={{}} indicator="_bulkSaving">
              <button type="button" data-attr:disabled={`$_bulkSaving || !(${selected})`}>Activate selected</button>
            </Rewire>
            <Rewire asChild action={deactivate} input={{}} indicator="_bulkSaving">
              <button type="button" className="secondary" data-attr:disabled={`$_bulkSaving || !(${selected})`}>Deactivate selected</button>
            </Rewire>
            <Recast asChild show="$_bulkSaving"><span className="load-status" role="status" style={{ display: 'none' }}>Updating entries…</span></Recast>
          </div>
          <p className="load-explainer">Each <code>PUT</code> sends the selection signal. The server rejects missing, unknown, or malformed IDs, then patches the table and clears the selection.</p>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="bulk-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="bulk-code-title">One request. Several rows.</h2></div><p>React owns the controls and the Redact host. Datastar binds the server-rendered row checkboxes and morphs the host after the validated batch update.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/bulk-update.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Sample data only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
