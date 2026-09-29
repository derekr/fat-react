import React, { useEffect } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/file-upload/`;
const upload = defineRedaction({
  path: `${exampleScope}__redact/upload/check`, method: 'post',
  schema: z.object({ kind: z.literal('field-note') }),
});

const example = `const upload = defineRedaction({
  path: uploadPath, method: 'post',
  schema: z.object({ kind: z.literal('field-note') }),
});

<Rewire asChild onSubmit action={upload}
  input={{ kind: 'field-note' }} contentType="form"
  indicator="_uploading">
  <form encType="multipart/form-data">
    <label htmlFor="field-note">Text file</label>
    <input id="field-note" name="fieldNote" type="file"
      accept=".txt,text/plain" required />
    <button type="submit" data-attr:disabled="$_uploading">
      Check file
    </button>
  </form>
</Rewire>
<Redact id="upload-result" />

// The server validates action input and multipart form data,
// then checks type, size, and contents without storing the file.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 11 / Form data</div>
      <h1>File <em>Upload.</em></h1>
      <p className="lede">Submit a small text file to the demo service worker. It validates the form and returns only a line-and-byte summary; the file contents are not stored or displayed.</p>
      <div className="demo-grid upload-shell">
        <section className="panel result" aria-labelledby="upload-title">
          <div className="panel-heading"><span className="step">01 / THE FORM</span><span className="live"><span /> LOCAL MOCK BACKEND</span></div>
          <h2 id="upload-title">Check a text file.</h2>
          <p className="panel-description">Choose a nonempty <code>.txt</code> file up to 4 KB. The backend repeats every check even though the input has an <code>accept</code> hint.</p>
          <Rewire asChild onSubmit action={upload} input={{ kind: 'field-note' }} contentType="form" indicator="_uploading">
            <form className="upload-form" encType="multipart/form-data">
              <label htmlFor="field-note">Text file</label>
              <input id="field-note" name="fieldNote" type="file" accept=".txt,text/plain" required />
              <button type="submit" data-attr:disabled="$_uploading">Check file →</button>
            </form>
          </Rewire>
          <Recast asChild show="$_uploading"><span className="load-status" role="status" style={{ display: 'none' }}>Checking file…</span></Recast>
        </section>
        <section className="panel" aria-labelledby="upload-result-title">
          <div className="panel-heading"><span className="step">02 / SERVER FEEDBACK</span><span className="pill">MULTIPART · POST</span></div>
          <h2 id="upload-result-title">A small summary.</h2>
          <p className="panel-description">The service worker reads the file only to validate it and count lines. It sends back HTML, never the uploaded text.</p>
          <Redact id="upload-result" className="upload-region" fallback="Choose a sample text file to see the result." />
        </section>
      </div>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="upload-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="upload-code-title">Native multipart, typed action.</h2></div><p>Rewire submits the nearest form. The server validates the action input and form independently before returning a targeted HTML patch.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/file-upload.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Local demo only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
