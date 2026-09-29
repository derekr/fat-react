import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { defineRedaction, Redact, Recast, Rewire } from '../src';
import { bootstrap } from './bootstrap';
import './style.css';
import './examples.css';
import './context-menu.css';

const base = import.meta.env.BASE_URL;
const exampleScope = `${base}examples/context-menu/`;
const endpoint = `${exampleScope}__redact/context`;
const menuInput = z.object({ id: z.enum(['fern', 'map', 'sky']), generation: z.number().int().positive() });
const resolveItems = defineRedaction({ path: `${endpoint}/items`, method: 'get', schema: menuInput });
const resolveCollections = defineRedaction({ path: `${endpoint}/collections`, method: 'get', schema: menuInput });
const cards = [
  { id: 'fern', title: 'Copperleaf fern', kind: 'Botanical drawing' },
  { id: 'map', title: 'Pocket trail map', kind: 'Route sketch' },
  { id: 'sky', title: 'Evening sky notes', kind: 'Field observation' },
] as const;
type CardId = typeof cards[number]['id'];
type OpenMenu = { id: CardId; generation: number; x: number; y: number; trigger: HTMLElement };

const example = `const resolveItems = defineRedaction({
  path: itemsPath, method: 'get',
  schema: z.object({ id: cardId, generation: z.number().int() }),
});

<Rewire asChild event="contextmenu" prevent
  action={resolveItems} input={{ id, generation }}>
  <article onContextMenu={openMenu}>…</article>
</Rewire>

// React owns the stable popover and both submenu shells.
// Recast signals choose the open submenu. Each server
// response morphs only its own Redact outlet.`;

function App() {
  const [open, setOpen] = useState<OpenMenu | null>(null);
  const [highlighted, setHighlighted] = useState<CardId | null>(null);
  const [compact, setCompact] = useState(false);
  const nextGeneration = useRef(1);
  const popover = useRef<HTMLDivElement>(null);
  const displayTrigger = useRef<HTMLButtonElement>(null);
  const collectionsTrigger = useRef<HTMLButtonElement>(null);
  const activeSubmenu = useRef('');

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.code-section');
    if (root) void import('microlighter').then(({ highlightAll }) => highlightAll({ root }));
  }, []);
  useLayoutEffect(() => {
    if (!open || !popover.current) return;
    if (!popover.current.matches(':popover-open')) popover.current.showPopover();
    activeSubmenu.current = '';
    requestAnimationFrame(() => popover.current?.querySelector<HTMLButtonElement>('[data-context-panel="root"] [role="menuitem"]')?.focus());
  }, [open]);

  const openMenu = (id: CardId, trigger: HTMLElement, x: number, y: number) => {
    const generation = nextGeneration.current++;
    const narrow = window.innerWidth < 650;
    setOpen({ id, generation, trigger,
      x: Math.max(10, Math.min(x, window.innerWidth - (narrow ? 260 : 510))),
      y: Math.max(10, Math.min(y, window.innerHeight - 340)),
    });
  };
  const closeMenu = (restoreFocus = false) => {
    const trigger = open?.trigger;
    if (popover.current?.matches(':popover-open')) popover.current.hidePopover();
    setOpen(null);
    if (restoreFocus) trigger?.focus({ preventScroll: true });
  };
  const focusPanel = (panel: HTMLElement) => {
    const items = [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter((item) => !item.hasAttribute('disabled'));
    items[0]?.focus();
  };
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const panel = target.closest<HTMLElement>('[data-context-panel]');
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return; }
    if (event.key === 'Tab') { closeMenu(true); return; }
    if (!panel) return;
    if (event.key === 'ArrowLeft' && panel.dataset.contextPanel !== 'root') {
      event.preventDefault();
      panel.querySelector<HTMLButtonElement>('[data-context-back]')?.click();
      (panel.dataset.contextPanel === 'display' ? displayTrigger : collectionsTrigger).current?.focus();
      return;
    }
    if (event.key === 'ArrowRight' && target.dataset.submenu) {
      event.preventDefault();
      target.click();
      const submenu = popover.current?.querySelector<HTMLElement>(`[data-context-panel="${target.dataset.submenu}"]`);
      if (submenu) requestAnimationFrame(() => focusPanel(submenu));
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter((item) => !item.hasAttribute('disabled'));
    const index = items.indexOf(target);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
      (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  return <div className="page">
    <header className="masthead"><a className="brand" href={base}><span className="brand-mark">r<span>.</span></span> redact</a><a className="source" href={`${base}examples/`}>All examples ←</a></header>
    <main className="examples-main">
      <div className="eyebrow"><span className="eyebrow-dot" /> Example 17 / Contextual actions</div>
      <h1>Context <em>Menu.</em></h1>
      <p className="lede">Right-click an invented card, or use its Actions button. Static choices respond at once; card-specific actions and collection choices arrive asynchronously.</p>
      <section className="panel result context-shell" aria-labelledby="context-title">
        <div className="panel-heading"><span className="step">01 / THE CARDS</span><span className="live"><span /> MIXED MENU</span></div>
        <h2 id="context-title">Choose a card.</h2>
        <p className="panel-description">Use right-click, the Actions button, or the keyboard’s context-menu key. Arrow keys move between menu items; Right opens a submenu, Left goes back, and Escape closes it.</p>
        <div className={`context-cards${compact ? ' compact' : ''}`}>
          {cards.map(({ id, title, kind }) => <Rewire key={id} asChild event="contextmenu" prevent action={resolveItems}
            input={{ id, generation: nextGeneration.current }} indicator="_contextItemsLoading">
            <article className={`context-card${highlighted === id ? ' highlighted' : ''}`}
              onContextMenu={(event) => {
                event.preventDefault();
                const trigger = event.currentTarget.querySelector('button')!;
                const rect = trigger.getBoundingClientRect();
                const keyboard = event.clientX === 0 && event.clientY === 0;
                openMenu(id, trigger, keyboard ? rect.left : event.clientX, keyboard ? rect.bottom + 5 : event.clientY);
              }}>
              <div><span>{kind}</span><h3>{title}</h3></div>
              <Rewire asChild action={resolveItems} input={{ id, generation: nextGeneration.current }} indicator="_contextItemsLoading">
                <button type="button" aria-label={`Actions for ${title}`}
                  onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); openMenu(id, event.currentTarget, rect.left, rect.bottom + 5); }}>Actions ···</button>
              </Rewire>
            </article>
          </Rewire>)}
        </div>
        <Redact id="context-result" className="context-result" fallback="Choose an action from a card’s menu." />
        {open && <Recast asChild signals={{ _contextSubmenu: '' }}>
          <div ref={popover} popover="auto" className="context-popover" style={{ left: open.x, top: open.y }}
            onClick={(event) => { if ((event.target as HTMLElement).closest('[data-context-command]')) closeMenu(true); }}
            onKeyDown={onMenuKeyDown} onToggle={(event) => {
              if ((event.nativeEvent as ToggleEvent).newState === 'closed') setOpen(null);
            }}>
            <div role="menu" aria-label={`Actions for ${cards.find((card) => card.id === open.id)?.title}`} data-context-panel="root">
              <span className="context-kicker">CARD ACTIONS</span>
              <button type="button" role="menuitem" className="context-row" onClick={() => { setHighlighted(open.id); closeMenu(true); }}>Highlight card</button>
              <Recast asChild events={[{ event: 'click', expression: "$_contextSubmenu = 'display'" }]} attr={{ 'aria-expanded': "$_contextSubmenu === 'display' ? 'true' : 'false'" }}>
                <button ref={displayTrigger} type="button" role="menuitem" aria-haspopup="menu" aria-expanded="false" data-submenu="display" className="context-row submenu-trigger"
                  onClick={() => { activeSubmenu.current = 'display'; }} onPointerEnter={(event) => { if (activeSubmenu.current !== 'display') event.currentTarget.click(); }}>Display <span aria-hidden="true">›</span></button>
              </Recast>
              <Rewire asChild action={resolveCollections} input={{ id: open.id, generation: open.generation }} indicator="_contextCollectionsLoading">
                <div role="none"><Recast asChild events={[{ event: 'click', expression: "$_contextSubmenu = 'collections'" }]} attr={{ 'aria-expanded': "$_contextSubmenu === 'collections' ? 'true' : 'false'" }}>
                  <button ref={collectionsTrigger} type="button" role="menuitem" aria-haspopup="menu" aria-expanded="false" data-submenu="collections" className="context-row submenu-trigger"
                    onClick={() => { activeSubmenu.current = 'collections'; }} onPointerEnter={(event) => { if (activeSubmenu.current !== 'collections') event.currentTarget.click(); }}>Move to collection <span aria-hidden="true">›</span></button>
                </Recast></div>
              </Rewire>
              <span className="context-divider" role="separator" />
              <span className="context-kicker">SERVER-RESOLVED</span>
              <Recast asChild show="$_contextItemsLoading"><p className="context-loading" style={{ display: 'none' }} role="status">Checking card actions…</p></Recast>
              <Recast asChild show="!$_contextItemsLoading"><div><Redact id={`context-items-${open.generation}`} className="context-outlet" fallback="Checking card actions…" /></div></Recast>
            </div>
            <Recast asChild show="$_contextSubmenu === 'display'"><div role="menu" aria-label="Display" data-context-panel="display" className="context-subpanel" style={{ display: 'none' }}>
              <span className="context-kicker">DISPLAY</span>
              <Recast asChild events={[{ event: 'click', expression: "$_contextSubmenu = ''" }]}><button type="button" role="menuitem" data-context-back="" className="context-row" onClick={() => { activeSubmenu.current = ''; }}>← Back</button></Recast>
              <button type="button" role="menuitem" className="context-row" onClick={() => { setCompact(true); closeMenu(true); }}>Compact cards</button>
              <button type="button" role="menuitem" className="context-row" onClick={() => { setCompact(false); closeMenu(true); }}>Comfortable cards</button>
            </div></Recast>
            <Recast asChild show="$_contextSubmenu === 'collections'"><div role="menu" aria-label="Move to collection" data-context-panel="collections" className="context-subpanel" style={{ display: 'none' }}>
              <span className="context-kicker">COLLECTIONS</span>
              <Recast asChild events={[{ event: 'click', expression: "$_contextSubmenu = ''" }]}><button type="button" role="menuitem" data-context-back="" className="context-row" onClick={() => { activeSubmenu.current = ''; }}>← Back</button></Recast>
              <Recast asChild show="$_contextCollectionsLoading"><p className="context-loading" style={{ display: 'none' }} role="status">Loading collections…</p></Recast>
              <Recast asChild show="!$_contextCollectionsLoading"><div><Redact id={`context-collections-${open.generation}`} className="context-outlet" fallback="Loading collections…" /></div></Recast>
            </div></Recast>
          </div>
        </Recast>}
        <p className="load-explainer">React keeps the popover and submenu shells mounted. Datastar morphs only the card-action and collection outlets; the backend validates every requested ID and command.</p>
      </section>
      <section className="code-section" data-syntax-theme="dracula" aria-labelledby="context-code-title">
        <div className="code-intro"><div><span className="under-label">THE WIRING</span><h2 id="context-code-title">Open first, resolve later.</h2></div><p>Rewire handles the typed request; React opens the native popover on the same event. Each delayed response targets an outlet unique to that opening.</p></div>
        <div className="code-grid search-code"><div className="code-card"><div className="code-heading"><span>REACT + SSE</span><span>demo/context-menu.tsx</span></div><pre><code className="language-tsx">{example}</code></pre></div></div>
      </section>
      <p className="example-back"><a href={`${base}examples/`}>← Explore all examples</a></p>
    </main>
    <footer>REDACT <span>·</span> Invented cards only.</footer>
  </div>;
}

void bootstrap(<App />, exampleScope);
