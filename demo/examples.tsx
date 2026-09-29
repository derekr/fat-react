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
