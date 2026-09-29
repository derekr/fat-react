import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Repipe, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';
import './cross-tab-updates.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/cross-tab-updates/`;
const streamPath = `${exampleScope}__redact/live/stream`;
const update = defineRedaction({
  path: `${exampleScope}__redact/live/update`, method: 'post',
  schema: z.object({ section: z.literal('note') }),
});

const example = `const update = defineRedaction({
  path: updatePath, method: 'post',
  schema: z.object({ section: z.literal('note') }),
});

<Recast asChild signals={{ liveDraft: '' }}>
  <section>
    <Repipe src={streamPath} />
    <Redact id="live-record" />
    <Rewire asChild onSubmit action={update}
      input={{ section: 'note' }}>
      <form>
        <input data-bind:live-draft required maxLength={80} />
        <button type="submit">Save note</button>
      </form>
    </Rewire>
  </section>
</Recast>

// The server broadcasts a patch to every open read stream.
// A tab that reconnects receives the current server state.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);
  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 14 / Shared stream</div>
      <h1>Cross-Tab <em>Updates.</em></h1>
      <p className="lede">Open two copies of this page. Save a sample note in either tab; the mock backend pushes its latest HTML to both.</p>
      <Recast asChild signals={{ liveDraft: '' }}>
        <div className="demo-grid live-shell">
          <section className="panel result" aria-labelledby="live-title">
            <div className="panel-heading"><span className="step">01 / SHARED VIEW</span><span className="live"><span /> READ STREAM</span></div>
            <h2 id="live-title">The current note.</h2>
            <p className="panel-description">One page-level SSE stream delivers updates to the Redact host, including changes made in another tab.</p>
            <Repipe src={streamPath} />
            <Redact id="live-record" className="live-region" fallback="Connecting to the shared stream…" />
          </section>
          <section className="panel" aria-labelledby="live-write-title">
            <div className="panel-heading"><span className="step">02 / THE COMMAND</span><span className="pill">POST · BROADCAST</span></div>
            <h2 id="live-write-title">Write a new note.</h2>
            <p className="panel-description">Try a short invented phrase, then switch to your other tab. The server validates the draft and broadcasts the new view.</p>
            <Rewire asChild onSubmit action={update} input={{ section: 'note' }} indicator="_liveSaving" filterSignals={{ include: /^liveDraft$/ }}>
              <form className="live-form">
                <label htmlFor="live-draft">Sample note</label>
                <input id="live-draft" name="liveDraft" data-bind:live-draft="" placeholder="e.g. The little map is ready" required maxLength={80} autoComplete="off" />
                <button type="submit" data-attr:disabled="$_liveSaving">Save to both tabs →</button>
              </form>
            </Rewire>
            <a className="live-new-tab" href={`${base}examples/cross-tab-updates/`} target="_blank" rel="noopener noreferrer">Open a second tab ↗</a>
          </section>
        </div>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="live-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="live-code-title">Write once. Push to both.</h2></div><p>The command response can be empty. The long-lived Repipe streams carry the server's updated HTML to each Redact host.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/cross-tab-updates.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented notes only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
