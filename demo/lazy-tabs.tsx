import React, { useEffect, type KeyboardEvent } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/lazy-tabs/`;
const tabsPath = `${exampleScope}__redact/tabs`;
const showTab = defineRedaction({
  path: `${tabsPath}/show`, method: 'get',
  schema: z.object({ tab: z.enum(['overview', 'specimens', 'notes']) }),
});
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'specimens', label: 'Specimens' },
  { id: 'notes', label: 'Notes' },
] as const;

function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
    (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus();
  buttons[next].click();
}

const example = `const showTab = defineRedaction({
  path: showTabPath, method: 'get',
  schema: z.object({ tab: z.enum(['overview', 'specimens', 'notes']) }),
});

<Recast asChild signals={{ activeTab: 'overview' }}>
  <section>
    <div role="tablist" aria-label="Field guide sections">
      <Rewire asChild action={showTab} input={{ tab: 'specimens' }}
        indicator="_tabLoading">
        <button type="button" role="tab" id="tab-specimens"
          aria-controls="tabs-content"
          data-attr:aria-selected="$activeTab === 'specimens' ? 'true' : 'false'">
          Specimens
        </button>
      </Rewire>
    </div>
    <div id="tabs-content" role="tabpanel">
      <Redact id="tabs-panel" src={tabsPath} />
    </div>
  </section>
</Recast>

// The server validates the tab ID, patches activeTab,
// and morphs #tabs-panel with the requested HTML.`;

function App() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 08 / On-demand panels</div>
      <h1>Lazy <em>Tabs.</em></h1>
      <p className="lede">Switch between sections of an invented field guide. React owns the tabs; the mock backend validates each selection and sends HTML for the requested panel.</p>
      <Recast asChild signals={{ activeTab: 'overview', _tabLoading: false }}>
        <section className="panel result tabs-shell" aria-labelledby="tabs-title">
          <div className="panel-heading"><span className="step">01 / FIELD GUIDE</span><span className="live"><span /> ON-DEMAND HTML</span></div>
          <h2 id="tabs-title">Pick a section.</h2>
          <p className="panel-description">The overview loads on entry. Each other panel arrives when selected. Use Left and Right Arrow, Home, or End to switch tabs by keyboard.</p>
          <div className="tabs-list" role="tablist" aria-label="Field guide sections" onKeyDown={onTabKeyDown}>
            {tabs.map(({ id, label }, index) => <Rewire key={id} asChild action={showTab} input={{ tab: id }} indicator="_tabLoading">
              <button type="button" role="tab" id={`tab-${id}`} aria-controls="tabs-content" aria-selected={index === 0} tabIndex={index === 0 ? 0 : -1}
                data-attr:aria-selected={`$activeTab === '${id}' ? 'true' : 'false'`}
                data-attr:tabindex={`$activeTab === '${id}' ? '0' : '-1'`}>{label}</button>
            </Rewire>)}
          </div>
          <Recast asChild attr={{ 'aria-labelledby': "'tab-' + $activeTab", 'aria-busy': "$_tabLoading ? 'true' : 'false'" }}>
            <div id="tabs-content" role="tabpanel" tabIndex={0} className="tabs-panel">
              <Redact id="tabs-panel" className="tabs-region" src={tabsPath} fallback="Loading the overview…" />
            </div>
          </Recast>
          <Recast asChild show="$_tabLoading"><span className="tabs-pending" role="status" style={{ display: 'none' }}>Loading section…</span></Recast>
        </section>
      </Recast>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="tabs-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="tabs-code-title">One host, several panels.</h2></div><p>Typed action input names the panel. The backend validates that name and returns both the active-tab signal and new HTML for the Redact host.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/lazy-tabs.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented field notes only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
