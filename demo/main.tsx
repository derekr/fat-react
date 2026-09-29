import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { defineRedaction, Redact, Repipe, Rewire } from '../src';
import './style.css';

const base = import.meta.env.BASE_URL;
const sourceUrl = import.meta.env.VITE_SOURCE_URL;
const add = defineRedaction({ path: `${base}__redact/add`, schema: z.object({ item: z.literal('peach') }) });
const remove = defineRedaction({ path: `${base}__redact/remove`, schema: z.object({ item: z.literal('peach') }) });
const save = defineRedaction({ path: `${base}__redact/save`, schema: z.object({ section: z.literal('note') }) });

const reactExample = `<Rewire asChild action={add} input={{ item: 'peach' }}>
  <Button>Add a peach</Button>
</Rewire>

<Rewire asChild onSubmit action={save} input={{ section: 'note' }}>
  <form>
    <input data-bind:note="" name="note" required />
    <button type="submit">Save note</button>
  </form>
</Rewire>

<Repipe src={base + '__redact/stream'} />
<Redact id="redact-basket" />`;

const backendExample = `// The static demo's service worker acts as a mock backend.
if (route === 'save') {
  const signals = await request.json();
  const note = signals?.note;
  if (typeof note !== 'string' || !note.trim() || note.length > 80) {
    return eventStream(patch(render('Please write a note.')));
  }
  store.note = note.trim();
  status = 'Your note was saved.';
}

broadcast(patch(render(status)));
if (route === 'save') sendTo(clientId, patchSignals({ note: '' }));
return eventStream(''); // The write response carries no HTML.`;

function Button({ children, ...props }: React.ComponentProps<'button'>) {
  return <button {...props} className="button button-primary">{children}</button>;
}

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) {
      void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
    }
  }, []);

  return (
    <div className="page">
      <header className="masthead">
        <a className="brand" href={base} aria-label="Redact home"><span className="brand-mark">r<span>.</span></span> redact</a>
        {sourceUrl
          ? <a className="source" href={sourceUrl} target="_blank" rel="noreferrer">View source <span aria-hidden="true">↗</span></a>
          : <a className="source" href="#guide-title">Read the guide <span aria-hidden="true">↓</span></a>}
      </header>

      <main>
        <div className="eyebrow"><span className="eyebrow-dot" /> A tiny experiment in server-driven UI</div>
        <h1>Server components <em>without reinventing the browser.</em></h1>
        <p className="lede">Bring server-rendered components to the React app you already have. Send HTML over SSE; let the browser handle the update.</p>

        <div className="demo-grid">
          <Repipe src={`${base}__redact/stream`} />
          <section className="panel controls" aria-labelledby="controls-title">
            <div className="panel-heading"><span className="step">01 / THE COMPONENT</span><span className="pill">You write this</span></div>
            <h2 id="controls-title">Just wire it up.</h2>
            <p className="panel-description">Wrap an existing control with a typed action. No client state, reducers, or manual DOM updates.</p>

            <div className="field-label">Button actions</div>
            <div className="buttons">
              <Rewire asChild action={add} input={{ item: 'peach' }}>
                <Button type="button">Add a peach <span aria-hidden="true">↗</span></Button>
              </Rewire>
              <Rewire action={remove} input={{ item: 'peach' }}>
                <button type="button" className="button button-secondary">Remove one <span aria-hidden="true">−</span></button>
              </Rewire>
            </div>
            <div className="helper">The first uses <code>asChild</code>. The second delegates through a wrapper.</div>

            <div className="divider" />
            <div className="field-label">Form action</div>
            <Rewire asChild onSubmit action={save} input={{ section: 'note' }}>
              <form className="note-form">
                <label htmlFor="note">Leave a note for the basket</label>
                <div className="form-row">
                  <input id="note" name="note" data-bind:note="" placeholder="e.g. Save the ripest one" autoComplete="off" required maxLength={80} />
                  <button type="submit" className="button button-primary">Save note</button>
                </div>
              </form>
            </Rewire>
            <p className="helper">The field value travels with the request. The server validates it and sends back fresh HTML.</p>
          </section>

          <section className="panel result" aria-labelledby="result-title">
            <div className="panel-heading"><span className="step">02 / THE SERVER VIEW</span><span className="live"><span /> LIVE HTML</span></div>
            <h2 id="result-title">The server’s view.</h2>
            <p className="panel-description">One open stream brings server-rendered HTML here. Commands only change state.</p>
            <Redact id="redact-basket" className="redact-region" fallback="Connecting to the mock server…" />
            <div className="panel-footnote">The mock server lives in a service worker, so this demo runs on GitHub Pages.</div>
          </section>
        </div>

        <section className="code-section" data-syntax-theme="dracula" aria-labelledby="code-title">
          <div className="code-intro"><div><span className="under-label">THE CODE BEHIND THE DEMO</span><h2 id="code-title">A small API. A real morph.</h2></div><p>These are the button, form, and CQRS stream patterns running above. The GitHub Pages demo uses a service worker in place of a server.</p></div>
          <div className="code-grid">
            <div className="code-card"><div className="code-heading"><span>01 / REACT</span><span>demo/main.tsx</span></div><pre><code className="language-tsx">{reactExample}</code></pre></div>
            <div className="code-card"><div className="code-heading"><span>02 / MOCK BACKEND</span><span>public/sw.js</span></div><pre><code className="language-javascript">{backendExample}</code></pre></div>
          </div>
        </section>

        <section className="guide" aria-labelledby="guide-title">
          <div className="guide-heading"><span className="under-label">A QUICK FIELD GUIDE</span><h2 id="guide-title">How to use Redact</h2><p>One read stream per page. Short commands when you need them. The server stays in charge of the result.</p></div>
          <div className="guide-grid">
            <article><span className="guide-index">01 — BOUNDARY</span><h3>Reserve a host</h3><p><code>&lt;Redact id="basket" /&gt;</code> renders an empty element. SSE events patch its contents. React owns the host; the server owns what appears inside.</p></article>
            <article><span className="guide-index">02 — ACTIONS</span><h3>Wire existing controls</h3><p>Define an action path and input schema. <code>&lt;Rewire&gt;</code> delegates through a wrapper by default. Add <code>asChild</code> when the child forwards DOM attributes; use <code>onSubmit</code> for a form.</p></article>
            <article><span className="guide-index">03 — PIPE</span><h3>One read stream</h3><p><code>&lt;Repipe src="/api/stream" /&gt;</code> opens the page’s long-lived SSE response. Server writes broadcast HTML patches to it; command responses can contain zero events.</p></article>
            <article><span className="guide-index">04 — THE LINE</span><h3>Keep ownership clear</h3><p>Server-rendered React event handlers do not survive as HTML. Redactions are HTTP commands, not RSC action references. Use client React handlers for React-owned UI and Rewire for server-owned regions.</p></article>
          </div>
        </section>

        <section className="underneath" aria-label="How it works">
          <span className="under-label">UNDER THE HOOD</span>
          <div className="steps">
            <div><span>01</span><strong>React renders the shell</strong><p><code>&lt;Redact /&gt;</code> reserves an empty host. React never renders its children.</p></div>
            <div><span>02</span><strong>A command changes state</strong><p>The server validates input, writes the change, and publishes fresh HTML to the open stream.</p></div>
            <div><span>03</span><strong>The browser morphs it</strong><p>Only the changed DOM gets updated. React can keep re-rendering everything else, if it insists.</p></div>
          </div>
        </section>
      </main>
      <footer>REDACT <span>·</span> Sane server components. Browser included.</footer>
    </div>
  );
}

async function start() {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);

  if (!('serviceWorker' in navigator)) {
    document.body.dataset.error = 'Service workers are needed for this static demo.';
    return;
  }

  try {
    await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
    // Start the morph engine only after the mock backend controls this page.
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-RC.8/bundles/datastar.js';
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not start the live preview.'));
      document.head.append(script);
    });
  } catch (error) {
    document.body.dataset.error = error instanceof Error ? error.message : 'Unable to start the demo.';
  }
}

void start();
