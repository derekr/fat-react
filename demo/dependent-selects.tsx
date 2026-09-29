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

<Recast asChild signals={{ region: '', habitat: '', selectionGeneration: 0, habitatsReadyGeneration: 0,
  noteGeneration: 0, noteReadyGeneration: 0 }}>
  <section>
    <Rewire asChild event="change" action={options} input={{}}>
      <div>
        <Recast asChild bind="region" events={[{
          event: 'change', expression: "$habitat = ''; $selectionGeneration++; $noteGeneration++",
        }]}>
          <select onChange={() => setGeneration(g => g + 1)}>…</select>
        </Recast>
      </div>
    </Rewire>
    <Recast asChild show="$habitatsReadyGeneration === 0">
      <select disabled><option>Choose a region first…</option></select>
    </Recast>
    {generations.map((slot) =>
      <Recast key={slot} asChild show={'$habitatsReadyGeneration === ' + slot}
        classes={{ pending: '$selectionGeneration !== $habitatsReadyGeneration' }}>
        <div><Redact id={'habitat-options-' + slot} /></div>
      </Recast>
    )}
    {noteGenerations.map((slot) =>
      <Recast key={slot} asChild show={'$noteReadyGeneration === ' + slot}
        classes={{ pending: '$noteGeneration !== $noteReadyGeneration' }}>
        <div><Redact id={'habitat-description-' + slot} /></div>
      </Recast>
    )}
  </section>
</Recast>

// A native change listener on the stable shell allocates note hosts
// for Datastar-owned selects. Keep last resolved hosts dimmed while
// new ones load; the server signals readiness after patching.`;

function App() {
  const [generation, setGeneration] = useState(0);
  const [readyGeneration, setReadyGeneration] = useState(0);
  const [noteGeneration, setNoteGeneration] = useState(0);
  const [readyNoteGeneration, setReadyNoteGeneration] = useState(0);
  const generations = generation === 0 ? [] : readyGeneration && readyGeneration !== generation
    ? [readyGeneration, generation] : [generation];
  const noteGenerations = noteGeneration === 0 ? [] : readyNoteGeneration && readyNoteGeneration !== noteGeneration
    ? [readyNoteGeneration, noteGeneration] : [noteGeneration];
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
    const demo = document.getElementById('habitat-demo');
    const onReady = (event: Event) => {
      const { habitats, note } = (event as CustomEvent<{ habitats: number; note: number }>).detail;
      setReadyGeneration(habitats);
      setReadyNoteGeneration(note);
    };
    const onHabitatChange = (event: Event) => {
      if (event.target instanceof HTMLSelectElement && event.target.name === 'habitat') {
        setNoteGeneration((current) => current + 1);
      }
    };
    demo?.addEventListener('habitats-ready', onReady);
    demo?.addEventListener('change', onHabitatChange);
    return () => {
      demo?.removeEventListener('habitats-ready', onReady);
      demo?.removeEventListener('change', onHabitatChange);
    };
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 10 / Dependent fields</div>
      <h1>Dependent <em>Selects.</em></h1>
      <p className="lede">Pick an invented region to request its habitats. Switch quickly between regions: previous choices stay dimmed and disabled until the latest result arrives.</p>
      <Recast asChild signals={{ region: '', habitat: '', selectionGeneration: 0, habitatsReadyGeneration: 0, noteGeneration: 0, noteReadyGeneration: 0 }}
        onSignalPatch="el.dispatchEvent(new CustomEvent('habitats-ready', {detail: {habitats: $habitatsReadyGeneration, note: $noteReadyGeneration}}))"
        onSignalPatchFilter={{ include: /^(habitatsReadyGeneration|noteReadyGeneration)$/ }}>
        <div id="habitat-demo" className="demo-grid habitat-shell">
          <section className="panel result" aria-labelledby="habitat-title">
            <div className="panel-heading"><span className="step">01 / THE CHOICES</span><span className="live"><span /> SERVER OPTIONS</span></div>
            <h2 id="habitat-title">Explore a region.</h2>
            <p className="panel-description">The first select is React-owned. The last resolved habitat choices remain visible but inactive while the backend prepares the next set.</p>
            <Rewire asChild event="change" action={options} input={{}} indicator="_loadingHabitats" requestCancellation="auto">
              <div className="habitat-field"><label htmlFor="region-choice">Region</label>
                <Recast asChild bind="region" events={[{ event: 'change', expression: "$habitat = ''; $selectionGeneration++; $noteGeneration++" }]}>
                  <select id="region-choice" name="region" defaultValue="" aria-controls={`habitat-options-${generation}`}
                    onChange={() => { setGeneration((current) => current + 1); setNoteGeneration((current) => current + 1); }}>
                    <option value="">Choose a region…</option><option value="ridge">Amber Ridge</option><option value="marsh">Silver Marsh</option><option value="grove">Moss Grove</option>
                  </select>
                </Recast>
              </div>
            </Rewire>
            <div className="habitat-display">
              <Recast asChild show="$selectionGeneration !== $habitatsReadyGeneration">
                <span className="habitat-sr-status" role="status" style={{ display: 'none' }}>Updating habitat choices…</span>
              </Recast>
              <Recast asChild show="$habitatsReadyGeneration === 0">
                <div className="habitat-field habitat-placeholder">
                  <label htmlFor="habitat-pending">Habitat</label>
                  <select id="habitat-pending" disabled><option data-text="$selectionGeneration ? 'Loading habitats…' : 'Choose a region first…'">Choose a region first…</option></select>
                </div>
              </Recast>
              {generations.map((slot) => <Recast key={slot} asChild show={`$habitatsReadyGeneration === ${slot}`}
                classes={{ pending: '$selectionGeneration !== $habitatsReadyGeneration' }}
                attr={{ inert: '$selectionGeneration !== $habitatsReadyGeneration', 'aria-busy': "$selectionGeneration !== $habitatsReadyGeneration ? 'true' : 'false'" }}>
                <div className="habitat-resolved"><Redact id={`habitat-options-${slot}`} className="habitat-field habitat-options" /></div>
              </Recast>)}
            </div>
          </section>
          <section className="panel" aria-labelledby="habitat-note-title">
            <div className="panel-heading"><span className="step">02 / THE FIELD NOTE</span><span className="pill">VALIDATED PAIR</span></div>
            <h2 id="habitat-note-title">A note from the server.</h2>
            <p className="panel-description">The previous note stays visible but dimmed until you choose a new habitat and its note arrives.</p>
            <div className="habitat-note-display">
              <Recast asChild show="$noteReadyGeneration === 0">
                <div className="habitat-description habitat-note-loading" role="status">
                  <Recast asChild text="$habitat ? 'Loading field note…' : 'Choose a habitat to see its field note.'"><span>Choose a habitat to see its field note.</span></Recast>
                </div>
              </Recast>
              {noteGenerations.map((slot) => <Recast key={slot} asChild show={`$noteReadyGeneration === ${slot}`}
                classes={{ pending: '$noteGeneration !== $noteReadyGeneration' }}
                attr={{ 'aria-busy': "$noteGeneration !== $noteReadyGeneration ? 'true' : 'false'" }}>
                <div className="habitat-note-resolved"><Redact id={`habitat-description-${slot}`} className="habitat-description" /></div>
              </Recast>)}
            </div>
          </section>
        </div>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="habitat-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="habitat-code-title">The next choice comes from the server.</h2></div><p>The last resolved select and note remain dimmed until their replacements arrive. Each response patches its own outlet before signaling that it is ready.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/dependent-selects.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Imaginary places only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
