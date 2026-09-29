import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';
import './live-activity-feed.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/live-activity-feed/`;
const feedPath = `${exampleScope}__redact/feed`;
const replay = defineRedaction({ path: feedPath, method: 'get', schema: z.object({}) });

const example = `const replay = defineRedaction({
  path: feedPath, method: 'get', schema: z.object({}),
});

<Recast asChild signals={{ _feedRunning: false }}>
  <section>
    <Redact id="feed-items" src={feedPath} />
    <Rewire asChild action={replay} input={{}}>
      <button type="button" data-attr:disabled="$_feedRunning">
        Replay events
      </button>
    </Rewire>
  </section>
</Recast>

// The GET returns one SSE response. Its first patch starts a
// fresh view; each later event appends an invented activity row.
// The response ends after the bounded sample sequence.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);
  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 16 / Streaming append</div>
      <h1>Live Activity <em>Feed.</em></h1>
      <p className="lede">Watch fictional archive activity arrive over one SSE response. Each new row is appended; previous rows stay in the host.</p>
      <Recast asChild signals={{ _feedRunning: false }}>
        <section className="panel result feed-shell" aria-labelledby="feed-title">
          <div className="panel-heading"><span className="step">01 / THE STREAM</span><span className="live"><span /> TIMED EVENTS</span></div>
          <h2 id="feed-title">Archive activity.</h2>
          <p className="panel-description">Four invented events arrive over a few seconds. Replay starts a fresh stream once the sequence finishes.</p>
          <Redact id="feed-items" className="feed-items" src={feedPath} fallback="Connecting to the feed…" />
          <Rewire asChild action={replay} input={{}}><button type="button" className="feed-replay" data-attr:disabled="$_feedRunning">Replay events ↻</button></Rewire>
          <p className="load-explainer">The server resets the view once, then sends append patches for each new row. The stream closes after this bounded demo sequence.</p>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="feed-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="feed-code-title">Keep what arrived.</h2></div><p>An initial inner patch makes replay predictable; subsequent append patches add rows without replacing the existing DOM.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/live-activity-feed.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented events only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
