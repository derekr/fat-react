import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/dependent-selects/`;
const options = defineRedaction({
  path: `${exampleScope}__redact/habitats/options`, method: 'get', schema: z.object({}),
});

const example = `const options = defineRedaction({
  path: optionsPath, method: 'get', schema: z.object({}),
});

<Recast asChild signals={{ region: '', habitat: '' }}>
  <section>
    <Rewire asChild event="change" action={options} input={{}}
      bind="region" indicator="_loadingHabitats">
      <select aria-controls="habitat-options">
        <option value="">Choose a region…</option>
        <option value="ridge">Amber Ridge</option>
      </select>
    </Rewire>
    <Redact id="habitat-options" />
    <Redact id="habitat-description" />
  </section>
</Recast>

// The server validates the region, returns a bound select,
// and checks the region/habitat pair before showing a note.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 10 / Dependent fields</div>
      <h1>Dependent <em>Selects.</em></h1>
      <p className="lede">Pick an invented region to request its habitats. Then choose a habitat to get a field note. The server validates both choices together.</p>
      <Recast asChild signals={{ region: '', habitat: '' }}>
        <div className="demo-grid habitat-shell">
          <section className="panel result" aria-labelledby="habitat-title">
            <div className="panel-heading"><span className="step">01 / THE CHOICES</span><span className="live"><span /> SERVER OPTIONS</span></div>
            <h2 id="habitat-title">Explore a region.</h2>
            <p className="panel-description">The first select is React-owned. The second arrives from the backend and lives inside its Redact host.</p>
            <div className="habitat-field"><label htmlFor="region-choice">Region</label>
              <Rewire asChild event="change" action={options} input={{}} bind="region" indicator="_loadingHabitats" requestCancellation="auto">
                <select id="region-choice" name="region" defaultValue="" aria-controls="habitat-options">
                  <option value="">Choose a region…</option><option value="ridge">Amber Ridge</option><option value="marsh">Silver Marsh</option><option value="grove">Moss Grove</option>
                </select>
              </Rewire>
            </div>
            <Redact id="habitat-options" className="habitat-field habitat-options" fallback="Choose a region to load its habitats." />
            <Recast asChild show="$_loadingHabitats"><span className="load-status" role="status" style={{ display: 'none' }}>Loading habitats…</span></Recast>
          </section>
          <section className="panel" aria-labelledby="habitat-note-title">
            <div className="panel-heading"><span className="step">02 / THE FIELD NOTE</span><span className="pill">VALIDATED PAIR</span></div>
            <h2 id="habitat-note-title">A note from the server.</h2>
            <p className="panel-description">Switch regions to reset the habitat choice and note. A stale or mismatched pair cannot produce a description.</p>
            <Redact id="habitat-description" className="habitat-description" fallback="Choose a habitat to see its field note." />
          </section>
        </div>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="habitat-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="habitat-code-title">The next choice comes from the server.</h2></div><p>The backend sends a new select into a Redact host and clears the old habitat signal. It validates the pair again before rendering the note.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/dependent-selects.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Imaginary places only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
