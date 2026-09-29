import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/progress-bar/`;
const run = defineRedaction({
  path: `${exampleScope}__redact/progress/run`, method: 'post',
  schema: z.object({ archive: z.literal('sample') }),
});

const example = `const run = defineRedaction({
  path: runPath, method: 'post',
  schema: z.object({ archive: z.literal('sample') }),
});

<Recast asChild signals={{ _progressRunning: false }}>
  <section>
    <Rewire asChild action={run} input={{ archive: 'sample' }}
      indicator="_progressRunning">
      <button type="button" data-attr:disabled="$_progressRunning">
        Process sample archive
      </button>
    </Rewire>
    <Redact id="progress-result" fallback="Ready to start." />
  </section>
</Recast>

// The server validates the action input, then streams an initial
// patch and five stages; the last stage includes completion.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 07 / Streaming updates</div>
      <h1>Progress <em>Bar.</em></h1>
      <p className="lede">Start a simulated archive job. A single request stays open while the mock server streams progress and then the completed view into one host.</p>
      <Recast asChild signals={{ _progressRunning: false }}>
        <div className="demo-grid progress-shell">
          <section className="panel result" aria-labelledby="progress-title">
            <div className="panel-heading"><span className="step">01 / THE JOB</span><span className="live"><span /> STREAMING HTML</span></div>
            <h2 id="progress-title">Process an archive.</h2>
            <p className="panel-description">Watch the response arrive in stages. The percentage comes from the demo backend, not a browser timer.</p>
            <Rewire asChild action={run} input={{ archive: 'sample' }} indicator="_progressRunning">
              <button type="button" className="progress-start" data-attr:disabled="$_progressRunning">Process sample archive →</button>
            </Rewire>
            <Redact id="progress-result" className="progress-region" fallback="Ready to start the sample job." />
            <Recast asChild show="$_progressRunning"><span className="progress-pending" style={{ display: 'none' }}>One response is still streaming…</span></Recast>
          </section>
          <section className="panel" aria-labelledby="progress-steps-title">
            <div className="panel-heading"><span className="step">02 / THE STREAM</span><span className="pill">ONE POST · MANY PATCHES</span></div>
            <h2 id="progress-steps-title">One open response.</h2>
            <p className="panel-description">A backend action may return several SSE events. Each one morphs the same React-owned host as the job advances.</p>
            <ol className="validation-story">
              <li><strong>Start</strong> with a typed <code>POST</code> action. The server validates the requested sample archive.</li>
              <li><strong>Stream</strong> incremental HTML patches with a labeled native <code>progress</code> element and live status text.</li>
              <li><strong>Finish</strong> with a completed server-rendered view. The button unlocks when the response closes.</li>
            </ol>
          </section>
        </div>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="progress-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="progress-code-title">A response can keep talking.</h2></div><p>Rewire starts the request and tracks its lifetime. The backend emits successive <code>datastar-patch-elements</code> events until the job finishes.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/progress-bar.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Simulated work, invented data.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
