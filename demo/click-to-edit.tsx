import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleBase = `${base}examples/`;
const contactPath = `${exampleBase}__redact/contact`;
const read = defineRedaction({ path: contactPath, method: 'get', schema: z.object({}) });
const edit = defineRedaction({ path: `${contactPath}/edit`, method: 'get', schema: z.object({}) });
const save = defineRedaction({ path: contactPath, method: 'put', schema: z.object({}) });
const reset = defineRedaction({ path: `${contactPath}/reset`, method: 'patch', schema: z.object({}) });

const example = `const read = defineRedaction({ path: contactPath, method: 'get', schema: z.object({}) });
const edit = defineRedaction({ path: \`\${contactPath}/edit\`, method: 'get', schema: z.object({}) });
const save = defineRedaction({ path: contactPath, method: 'put', schema: z.object({}) });

<Recast asChild signals={{ contactEditing: false }}>
  <section>
    <Redact id="contact-detail" src={contactPath} />
    <Recast asChild show="!$contactEditing">
      <div><Rewire asChild action={edit} input={{}} indicator="_contactLoading">
        <button data-attr:disabled="$_contactLoading">Edit</button>
      </Rewire></div>
    </Recast>
    <Recast asChild show="$contactEditing">
      <div><Rewire asChild action={save} input={{}} indicator="_contactLoading">
        <button data-attr:disabled="$_contactLoading">Save</button>
      </Rewire></div>
    </Recast>
  </section>
</Recast>

// The server patches #contact-detail with inputs such as:
// <input name="firstName" data-bind:contact-first-name value="Juniper" />`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 02 / Server edits</div>
      <h1>Click To <em>Edit.</em></h1>
      <p className="lede">The server owns the contact and renders either a read-only view or an editor. React wires the controls; Datastar morphs only the detail host.</p>
      <Recast asChild signals={{ contactEditing: false }}>
        <div className="demo-grid editor-shell">
          <section className="panel result" aria-labelledby="contact-title">
            <div className="panel-heading"><span className="step">01 / SERVER-RENDERED DETAIL</span><span className="live"><span /> LIVE HTML</span></div>
            <h2 id="contact-title">A sample contact.</h2>
            <p className="panel-description">This record is invented. Save a change, cancel a draft, or restore the original.</p>
            <Redact id="contact-detail" className="editor-host" src={contactPath} fallback="Loading contact…" />
            <Recast asChild show="!$contactEditing"><div className="editor-controls">
              <Rewire asChild action={edit} input={{}} indicator="_contactLoading"><button type="button" data-attr:disabled="$_contactLoading">Edit</button></Rewire>
              <Rewire asChild action={reset} input={{}} indicator="_contactLoading"><button type="button" data-attr:disabled="$_contactLoading">Reset</button></Rewire>
            </div></Recast>
            <Recast asChild show="$contactEditing"><div className="editor-controls" style={{ display: 'none' }}>
              <Rewire asChild action={save} input={{}} indicator="_contactLoading"><button type="button" data-attr:disabled="$_contactLoading">Save</button></Rewire>
              <Rewire asChild action={read} input={{}} indicator="_contactLoading"><button type="button" data-attr:disabled="$_contactLoading">Cancel</button></Rewire>
            </div></Recast>
            <Recast asChild show="$_contactLoading"><p className="editor-hint" style={{ display: 'none' }} role="status">Waiting for the server…</p></Recast>
          </section>
          <section className="panel" aria-labelledby="edit-steps-title">
            <div className="panel-heading"><span className="step">02 / THE ROUND TRIP</span><span className="pill">GET · PUT · PATCH</span></div>
            <h2 id="edit-steps-title">One host. Two views.</h2>
            <p className="panel-description">No form state is copied into React. Draft fields are Datastar signals and the saved record lives in the mock backend.</p>
            <ol className="editor-story">
              <li><strong>Edit</strong> requests HTML for three bound fields using <code>@get</code>.</li>
              <li><strong>Save</strong> sends the signals using <code>@put</code>. Empty fields get a server validation message.</li>
              <li><strong>Cancel</strong> discards the draft with a fresh read; <strong>Reset</strong> restores the original record with <code>@patch</code>.</li>
            </ol>
          </section>
        </div>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="edit-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="edit-code-title">The host stays put.</h2></div><p>Rewire connects typed actions to React-owned buttons. Recast switches the controls when the server patches <code>contactEditing</code>; the editor itself arrives as HTML.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SERVER HTML</span><span>demo/click-to-edit.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Sample data only.</footer>
  </div>;
}

void bootstrap(<App />, exampleBase);
