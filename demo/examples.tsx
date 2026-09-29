import React from 'react';
import { Recast } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';

const base = import.meta.env.BASE_URL;
const groups = [
  { name: 'Signals & bindings', attributes: ['data-signals', 'data-bind', 'data-computed', 'data-ref', 'data-json-signals'] },
  { name: 'Display & styling', attributes: ['data-text', 'data-show', 'data-attr', 'data-class', 'data-style'] },
  { name: 'Events & effects', attributes: ['data-on', 'data-init', 'data-effect', 'data-on-intersect', 'data-on-interval', 'data-on-signal-patch', 'data-on-signal-patch-filter'] },
  { name: 'Requests & morphs', attributes: ['data-indicator', 'data-ignore', 'data-ignore-morph', 'data-preserve-attr'] },
];

function App() {
  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={base}>Back home ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> The example shelf</div>
      <h1>Small examples. <em>Whole HTML.</em></h1>
      <p className="lede">Every recipe pairs a typed JSX interface with an honest look at the attributes and server responses underneath.</p>
      <a className="example-feature" href={`${base}examples/active-search/`}>
        <span className="step">01 / LIVE RECIPE</span><strong>Active Search <span aria-hidden="true">↗</span></strong>
        <span>Type a name; a debounced GET sends the bound value and morphs a server-rendered table. Try the request and inspect the code.</span>
        <span className="feature-tags">Rewire · bind · debounce · GET · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/click-to-edit/`}>
        <span className="step">02 / LIVE RECIPE</span><strong>Click To Edit <span aria-hidden="true">↗</span></strong>
        <span>Swap a contact view for a server-rendered editor; validate and save bound fields, cancel a draft, or reset the record.</span>
        <span className="feature-tags">Rewire · Recast · GET · PUT · PATCH · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/click-to-load/`}>
        <span className="step">03 / LIVE RECIPE</span><strong>Click To Load <span aria-hidden="true">↗</span></strong>
        <span>Load the next batch of cards with an SSE append patch. Previously loaded items stay put, and the server validates each page.</span>
        <span className="feature-tags">Rewire · indicator · filterSignals · append · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/infinite-scroll/`}>
        <span className="step">04 / LIVE RECIPE</span><strong>Infinite Scroll <span aria-hidden="true">↗</span></strong>
        <span>Scroll an archive until the sentinel enters view. Intersection triggers the next validated page and appends it to the same host.</span>
        <span className="feature-tags">Recast · onIntersect · throttle · append · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/inline-validation/`}>
        <span className="step">05 / LIVE RECIPE</span><strong>Inline Validation <span aria-hidden="true">↗</span></strong>
        <span>Check an invented catalog code while typing. The server validates again before reserving it and morphs accessible feedback.</span>
        <span className="feature-tags">Rewire · QUERY · debounce · POST · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/bulk-update/`}>
        <span className="step">06 / LIVE RECIPE</span><strong>Bulk Update <span aria-hidden="true">↗</span></strong>
        <span>Select invented archive entries and activate or deactivate them together. The server validates the selection and morphs the table.</span>
        <span className="feature-tags">Recast · bind · Rewire · PUT · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/progress-bar/`}>
        <span className="step">07 / LIVE RECIPE</span><strong>Progress Bar <span aria-hidden="true">↗</span></strong>
        <span>Start a sample archive job and watch one response stream progress updates and its finished view into the same host.</span>
        <span className="feature-tags">Rewire · indicator · POST · streaming SSE · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/lazy-tabs/`}>
        <span className="step">08 / LIVE RECIPE</span><strong>Lazy Tabs <span aria-hidden="true">↗</span></strong>
        <span>Switch between invented field guide panels. Each tab requests validated server HTML when selected.</span>
        <span className="feature-tags">Rewire · GET · aria-selected · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/delete-row/`}>
        <span className="step">09 / LIVE RECIPE</span><strong>Delete Row <span aria-hidden="true">↗</span></strong>
        <span>Delete invented archive rows with validated DELETE requests. The server morphs the list and provides a reset action.</span>
        <span className="feature-tags">DELETE · Rewire · server-owned controls · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/dependent-selects/`}>
        <span className="step">10 / LIVE RECIPE</span><strong>Dependent Selects <span aria-hidden="true">↗</span></strong>
        <span>Choose an invented region to load its habitats, then choose a habitat to reveal a server-rendered description.</span>
        <span className="feature-tags">Rewire · bind · GET · dependent fields · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/file-upload/`}>
        <span className="step">11 / LIVE RECIPE</span><strong>File Upload <span aria-hidden="true">↗</span></strong>
        <span>Submit a small text file as form data. The demo backend validates it locally and returns a summary without storing its contents.</span>
        <span className="feature-tags">Rewire · multipart form · POST · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/modal-details/`}>
        <span className="step">12 / LIVE RECIPE</span><strong>Modal Details <span aria-hidden="true">↗</span></strong>
        <span>Open a native dialog instantly, then load invented record details into it asynchronously.</span>
        <span className="feature-tags">dialog · Rewire · GET · indicator · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/sortable-list/`}>
        <span className="step">13 / LIVE RECIPE</span><strong>Sortable List <span aria-hidden="true">↗</span></strong>
        <span>Reorder invented cards by dragging or with keyboard-friendly buttons. The server validates each move and morphs the list.</span>
        <span className="feature-tags">drag & drop · POST · validated order · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/cross-tab-updates/`}>
        <span className="step">14 / LIVE RECIPE</span><strong>Cross-Tab Updates <span aria-hidden="true">↗</span></strong>
        <span>Open this demo twice. Save an invented note in one tab and watch the other tab receive the new server view.</span>
        <span className="feature-tags">Repipe · Rewire · POST · broadcast SSE · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/multi-step-form/`}>
        <span className="step">15 / LIVE RECIPE</span><strong>Multi-Step Form <span aria-hidden="true">↗</span></strong>
        <span>Create a fictional field card across three server-owned steps, with validated transitions, back navigation, and a review screen.</span>
        <span className="feature-tags">Rewire · data-bind · POST · server state · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/live-activity-feed/`}>
        <span className="step">16 / LIVE RECIPE</span><strong>Live Activity Feed <span aria-hidden="true">↗</span></strong>
        <span>Watch invented archive events arrive one at a time over SSE. Append patches preserve the earlier entries.</span>
        <span className="feature-tags">Rewire · GET · timed SSE · append · Redact</span>
      </a>
      <a className="example-feature" href={`${base}examples/context-menu/`}>
        <span className="step">17 / LIVE RECIPE</span><strong>Context Menu <span aria-hidden="true">↗</span></strong>
        <span>Open a card menu instantly. Static actions and a submenu work right away; card-specific actions and collection choices load into separate outlets.</span>
        <span className="feature-tags">popover · Rewire · Recast · async submenus · Redact</span>
      </a>
      <section className="attribute-guide" aria-labelledby="attributes-title">
        <span className="under-label">CORE ATTRIBUTE MAP</span>
        <h2 id="attributes-title">The browser’s vocabulary, in JSX.</h2>
        <p>Rewire covers backend actions and event modifiers. Recast attaches the remaining core directives to an existing element; native <code>data-*</code> attributes remain available for advanced modifiers. No Pro-only features are required.</p>
        <div className="attribute-grid">{groups.map((group) => <article key={group.name}><h3>{group.name}</h3><div className="attribute-tags">{group.attributes.map((name) => <code key={name}>{name}</code>)}</div></article>)}</div>
      </section>
      <section className="playground" aria-labelledby="playground-title">
        <span className="under-label">A LOCAL SIGNAL</span><h2 id="playground-title">Directives without an endpoint.</h2>
        <p>This control uses <code>Recast</code> for signal creation, an event, text, and visibility. There’s no server request for this transient interaction.</p>
        <Recast asChild signals={{ playgroundCount: 0 }}>
          <div className="playground-inner">
            <Recast asChild events={[{ event: 'click', expression: '$playgroundCount++' }]}><button type="button" className="button button-primary">Count a click</button></Recast>
            <Recast asChild text="'Clicks: ' + $playgroundCount"><output>Clicks: 0</output></Recast>
            <Recast asChild show="$playgroundCount > 0"><span>Now you’ve seen a signal.</span></Recast>
          </div>
        </Recast>
      </section>
    </main>
    <footer>REDACT <span>·</span> Examples built with invented data.</footer>
  </div>;
}

void bootstrap(<App />, `${base}examples/`);
