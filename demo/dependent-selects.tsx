import React, { useEffect, useState } from 'react';
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

<Recast asChild signals={{ region: '', habitat: '', selectionGeneration: 0, habitatsReadyGeneration: 0 }}>
  <section>
    <Rewire asChild event="change" action={options} input={{}}>
      <div>
        <Recast asChild bind="region" events={[{
          event: 'change', expression: "$habitat = ''; $selectionGeneration++",
        }]}>
          <select onChange={() => setGeneration(g => g + 1)}>…</select>
        </Recast>
      </div>
    </Rewire>
    <Recast asChild show="$selectionGeneration !== $habitatsReadyGeneration">
      <select disabled><option>Loading habitats…</option></select>
    </Recast>
    <Recast asChild show="$selectionGeneration === $habitatsReadyGeneration">
      <div><Redact key={generation} id={'habitat-options-' + generation} /></div>
    </Recast>
    <Redact key={generation} id={'habitat-description-' + generation} />
  </section>
</Recast>

// The host IDs change immediately; a late response targets
// a removed host. The server validates every region/habitat pair.`;

function App() {
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 10 / Dependent fields</div>
      <h1>Dependent <em>Selects.</em></h1>
      <p className="lede">Pick an invented region to request its habitats. Switch quickly between regions: old choices vanish immediately, and a slower response cannot replace the latest selection.</p>
      <Recast asChild signals={{ region: '', habitat: '', selectionGeneration: 0, habitatsReadyGeneration: 0 }}>
        <div className="demo-grid habitat-shell">
          <section className="panel result" aria-labelledby="habitat-title">
            <div className="panel-heading"><span className="step">01 / THE CHOICES</span><span className="live"><span /> SERVER OPTIONS</span></div>
            <h2 id="habitat-title">Explore a region.</h2>
            <p className="panel-description">The first select is React-owned. The second arrives from the backend and lives inside its Redact host.</p>
            <Rewire asChild event="change" action={options} input={{}} indicator="_loadingHabitats" requestCancellation="auto">
              <div className="habitat-field"><label htmlFor="region-choice">Region</label>
                <Recast asChild bind="region" events={[{ event: 'change', expression: "$habitat = ''; $selectionGeneration++" }]}>
                  <select id="region-choice" name="region" defaultValue="" aria-controls={`habitat-options-${generation}`}
                    onChange={() => setGeneration((current) => current + 1)}>
                    <option value="">Choose a region…</option><option value="ridge">Amber Ridge</option><option value="marsh">Silver Marsh</option><option value="grove">Moss Grove</option>
                  </select>
                </Recast>
              </div>
            </Rewire>
            <Recast asChild show="$selectionGeneration !== $habitatsReadyGeneration">
              <div className="habitat-field habitat-placeholder" style={{ display: 'none' }}>
                <label htmlFor="habitat-pending">Habitat</label>
                <select id="habitat-pending" disabled aria-label="Habitat choices loading"><option>Loading habitats…</option></select>
              </div>
            </Recast>
            <Recast asChild show="$selectionGeneration === $habitatsReadyGeneration">
              <div><Redact key={generation} id={`habitat-options-${generation}`} className="habitat-field habitat-options"
                fallback="Choose a region to load its habitats." /></div>
            </Recast>
          </section>
          <section className="panel" aria-labelledby="habitat-note-title">
            <div className="panel-heading"><span className="step">02 / THE FIELD NOTE</span><span className="pill">VALIDATED PAIR</span></div>
            <h2 id="habitat-note-title">A note from the server.</h2>
            <p className="panel-description">Switch regions to reset the habitat choice and note. A stale or mismatched pair cannot produce a description.</p>
            <Recast asChild show="!$_loadingNote"><div><Redact key={generation} id={`habitat-description-${generation}`}
              className="habitat-description" fallback="Choose a habitat to see its field note." /></div></Recast>
            <Recast asChild show="$_loadingNote"><span className="load-status" role="status" style={{ display: 'none' }}>Loading field note…</span></Recast>
          </section>
        </div>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="habitat-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="habitat-code-title">The next choice comes from the server.</h2></div><p>Changing regions immediately replaces the dependent hosts and clears the habitat signal. A late response targets the old generation; the backend validates the new pair.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/dependent-selects.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Imaginary places only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
