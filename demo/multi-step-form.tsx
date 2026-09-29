import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';
import './multi-step-form.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/multi-step-form/`;
const wizardPath = `${exampleScope}__redact/wizard`;
const reset = defineRedaction({ path: `${wizardPath}/reset`, method: 'post', schema: z.object({}) });

const example = `const reset = defineRedaction({
  path: resetPath, method: 'post', schema: z.object({}),
});

<Recast asChild signals={{
  wizardTitle: '', wizardCategory: '', wizardDescription: '',
}}>
  <section>
    <Redact id="wizard-panel" src={wizardPath} />
    <Rewire asChild action={reset} input={{}}>
      <button type="button">Start over</button>
    </Rewire>
  </section>
</Recast>

// Server-owned forms use data-bind and data-on:submit__prevent.
// The backend validates each step, stores accepted fields per
// tab, and returns the next form as HTML over SSE.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);
  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 15 / Server-guided form</div>
      <h1>Multi-Step <em>Form.</em></h1>
      <p className="lede">Make an invented field card. Each step is validated before the server renders the next; you can go back, review, or start over.</p>
      <Recast asChild signals={{ wizardTitle: '', wizardCategory: '', wizardDescription: '' }}>
        <section className="panel result wizard-shell" aria-labelledby="wizard-title-heading">
          <div className="panel-heading"><span className="step">01 / THE WORKFLOW</span><span className="live"><span /> VALIDATED STEPS</span></div>
          <h2 id="wizard-title-heading">Create a field card.</h2>
          <p className="panel-description">The server keeps the accepted draft for this tab and checks every transition. No sample card is shared or stored permanently.</p>
          <Redact id="wizard-panel" className="wizard-panel" src={wizardPath} fallback="Preparing your form…" />
          <Rewire asChild action={reset} input={{}}><button type="button" className="wizard-reset">Start over</button></Rewire>
          <p className="load-explainer">React owns this host and the reset control; Datastar owns the server-rendered steps inside the host.</p>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="wizard-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="wizard-code-title">One step at a time.</h2></div><p>Field bindings send drafts; the server validates and remembers accepted fields per tab. A stale or out-of-order action cannot skip a step.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/multi-step-form.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented field cards only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
