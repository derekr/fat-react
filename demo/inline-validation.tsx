import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/inline-validation/`;
const checkPath = `${exampleScope}__redact/catalog/check`;
const check = defineRedaction({ path: checkPath, method: 'query', schema: z.object({}) });
const reserve = defineRedaction({ path: checkPath, method: 'post', schema: z.object({}) });

const example = `const check = defineRedaction({
  path: checkPath, method: 'query', schema: z.object({}),
});
const reserve = defineRedaction({
  path: checkPath, method: 'post', schema: z.object({}),
});

<Recast asChild signals={{ catalogInvalid: false }}>
  <section>
    <Rewire asChild event="input" action={check} input={{}}
      bind="catalogCode" debounce={350}
      filterSignals={{ include: /^catalogCode$/ }}>
      <input aria-describedby="catalog-feedback"
        data-attr:aria-invalid="$catalogInvalid ? 'true' : 'false'" />
    </Rewire>
    <Redact id="catalog-feedback" />
    <Rewire asChild action={reserve} input={{}}
      filterSignals={{ include: /^catalogCode$/ }}>
      <button type="button">Reserve code</button>
    </Rewire>
  </section>
</Recast>

// The server validates catalogCode for both QUERY and POST.
// It patches #catalog-feedback and the catalogInvalid signal.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 05 / Validation</div>
      <h1>Inline <em>Validation.</em></h1>
      <p className="lede">Type a catalog code. The server checks its format and availability, then returns a small HTML update. Reserving it repeats the check on the server.</p>
      <Recast asChild signals={{ catalogInvalid: false }}>
        <div className="demo-grid validation-shell">
          <section className="panel result" aria-labelledby="validation-title">
            <div className="panel-heading"><span className="step">01 / THE FIELD</span><span className="live"><span /> LIVE FEEDBACK</span></div>
            <h2 id="validation-title">Find an available code.</h2>
            <p className="panel-description" id="catalog-hint">Try <strong>FERN-27</strong> for an available code, <strong>MAPS-04</strong> for one already reserved, or an incomplete code.</p>
            <div className="validation-field">
              <label htmlFor="catalog-code">Catalog code</label>
              <Rewire asChild event="input" action={check} input={{}} bind="catalogCode" debounce={350} indicator="_catalogChecking" filterSignals={{ include: /^catalogCode$/ }} requestCancellation="auto">
                <input id="catalog-code" name="catalogCode" type="text" maxLength={16} autoComplete="off" spellCheck={false} placeholder="FERN-27" aria-describedby="catalog-hint catalog-feedback" data-attr:aria-invalid="$catalogInvalid ? 'true' : 'false'" />
              </Rewire>
            </div>
            <Redact id="catalog-feedback" className="validation-feedback" fallback="Enter a code to check its availability." />
            <div className="validation-actions">
              <Rewire asChild action={reserve} input={{}} indicator="_catalogSaving" filterSignals={{ include: /^catalogCode$/ }}>
                <button type="button" data-attr:disabled="$_catalogSaving">Reserve code</button>
              </Rewire>
              <Recast asChild show="$_catalogChecking"><span style={{ display: 'none' }} role="status">Checking…</span></Recast>
              <Recast asChild show="$_catalogSaving"><span style={{ display: 'none' }} role="status">Reserving…</span></Recast>
            </div>
          </section>
          <section className="panel" aria-labelledby="validation-steps-title">
            <div className="panel-heading"><span className="step">02 / THE ROUND TRIP</span><span className="pill">QUERY · POST</span></div>
            <h2 id="validation-steps-title">Check, then check again.</h2>
            <p className="panel-description">The mock backend owns the reserved-code set. TypeScript describes the action; the server still validates each request.</p>
            <ol className="validation-story">
              <li><strong>Type</strong> to send a debounced <code>QUERY</code> request with the bound code in the JSON body.</li>
              <li><strong>Inspect</strong> the HTML feedback and the server-patched <code>aria-invalid</code> state.</li>
              <li><strong>Reserve</strong> to send a <code>POST</code>. The server rechecks format and availability before storing the code.</li>
            </ol>
          </section>
        </div>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="validation-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="validation-code-title">Validation stays on the server.</h2></div><p>Rewire connects a bound input to a debounced safe <code>QUERY</code> action. The reserve command never trusts the preceding check.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/inline-validation.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Sample codes only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
