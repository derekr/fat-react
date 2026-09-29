import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleBase = `${base}examples/`;
const search = defineRedaction({ path: `${exampleBase}__redact/search`, method: 'get', schema: z.object({}) });
const example = `const base = import.meta.env.BASE_URL;
const exampleBase = \`\${base}examples/\`;
const search = defineRedaction({
  path: \`\${exampleBase}__redact/search\`,
  method: 'get',
  schema: z.object({}),
});

<Rewire
  asChild
  event="input"
  method="get"
  action={search}
  input={{}}
  bind="contactSearch"
  debounce={200}
  requestCancellation="auto"
>
  <input type="search" placeholder="Search contacts…" />
</Rewire>

<Redact id="contact-results" src={\`\${exampleBase}__redact/search\`} />`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 01 / Requests</div>
      <h1>Active <em>Search.</em></h1>
      <p className="lede">The input keeps its own value. A debounced read sends the query, and the response morphs the results table. No React state or per-row diffing.</p>
      <div className="demo-grid">
        <section className="panel controls" aria-labelledby="search-title">
          <div className="panel-heading"><span className="step">01 / THE CONTROL</span><span className="pill">Typed JSX</span></div>
          <h2 id="search-title">Find a contact.</h2>
          <p className="panel-description">Try “Juniper”, “Sparrow”, or a name that isn’t here.</p>
          <label className="field-label" htmlFor="contact-search">Search by name</label>
          <Rewire asChild event="input" method="get" action={search} input={{}} bind="contactSearch" debounce={200} requestCancellation="auto">
            <input className="search-input" id="contact-search" type="search" placeholder="Search contacts…" autoComplete="off" maxLength={80} />
          </Rewire>
          <p className="helper">200 ms debounce. Previous searches to this URL can be cancelled when a newer query arrives.</p>
        </section>
        <section className="panel result" aria-labelledby="results-title">
          <div className="panel-heading"><span className="step">02 / THE SERVER VIEW</span><span className="live"><span /> LIVE HTML</span></div>
          <h2 id="results-title">Matching contacts.</h2>
          <p className="panel-description">Each result is a full HTML fragment, patched into the same host.</p>
          <Redact id="contact-results" className="search-region" src={`${exampleBase}__redact/search`} fallback="Loading contacts…" />
        </section>
      </div>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="search-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="search-code-title">No stringly modifier soup.</h2></div><p>Rewire turns <code>debounce={200}</code> into the input event modifier, while <code>bind</code> carries the query in the request.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT</span><span>demo/active-search.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore the attribute map</a></p>
    </main>
    <footer>REDACT <span>·</span> All contacts on this page are invented.</footer>
  </div>;
}

void bootstrap(<App />, exampleBase);
