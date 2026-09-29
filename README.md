# Redact

Server components without reinventing the browser. Render JSX to HTML on the server, stream patches over SSE, and morph a stable host in an existing React app.

## Try it locally

```sh
npm ci
npm run dev
```

The interactive demo uses a service worker as a temporary mock backend, so it works on static GitHub Pages. It includes a button with `asChild`, a delegated wrapper button, a form, and one long-lived read stream. The demo store may reset whenever the browser restarts the service worker.

The [examples gallery](https://derekr.github.io/redact/examples/) starts with [Active Search](https://derekr.github.io/redact/examples/active-search/), which exercises bound inputs, debounced GET actions, and targeted HTML morphs. The examples use their own service-worker scope under `/redact/examples/`, independent of the home demo stream. Its core-attribute map shows which directives can be expressed with JSX. Pro-only features are not included.

## API sketch

```tsx
const add = defineRedaction({
  path: '/api/basket/add',
  schema: z.object({ item: z.string() }),
});

<Rewire asChild action={add} input={{ item: 'peach' }}>
  <Button>Add a peach</Button>
</Rewire>

<Repipe src="/api/stream" />
<Redact id="basket" />
```

`input` is checked by TypeScript against the action schema. A custom `Button` must forward DOM attributes for `asChild`. Without `asChild`, `Rewire` delegates the event from a `div` wrapper and works with opaque children. Use `onSubmit` to wire a form; form fields can use `data-bind:*` signals.

For input and other browser events, use `event`, `method`, `bind`, and typed modifiers on `Rewire`:

```tsx
const search = defineRedaction({ path: '/api/search', method: 'get', schema: z.object({}) });

<Rewire asChild event="input" action={search} input={{}} bind="search" debounce={200} requestCancellation="auto">
  <input type="search" placeholder="Search…" />
</Rewire>
<Redact id="search-results" src="/api/search" />
```

`Rewire` accepts core event modifiers (`delay`, `debounce`, `throttle`, their edge options, `once`, `passive`, `capture`, `eventCase`, `viewTransition`, `window`, `document`, `outside`, `prevent`, `stop`) and backend request options (`filterSignals`, `headers`, `contentType`, retry controls, and cancellation). Timings are integer milliseconds. It refuses conflicting event attributes on an `asChild` element. The existing `onClick` and `onSubmit` shorthands still work.

`Recast` is a JSX companion for non-action core directives such as `signals`, `computed`, `bind`, `text`, `show`, `attr`, `classes`, `styles`, `effect`, `init`, `indicator`, `preserveAttr`, refs, and non-request events. It uses the same `asChild` prop-forwarding rule; native `data-*` attributes remain available for advanced modifiers or uncommon combinations.

`Repipe` opens a long-lived SSE read request for the page. The backend can send zero or more `redactPatch(targetId, html)` events on it, targeting any `Redact` host. `Rewire` sends short-lived write requests; after publishing the new state to the read stream, a write endpoint can return `redactionAck()` (a valid, empty SSE response). For a simpler request/response setup, omit `Repipe`, give `Redact` a `src` for its initial GET, and return a patch directly from each action.

The action description is **not** a server action implementation. The server must validate the request against the schema, authorize the operation, and render HTML. `createRedactionHandler(action, targetId, render)` in `src/server.tsx` handles request parsing, schema validation, server-side JSX rendering and a single SSE patch response. `redactResponse(targetId, html)` constructs a patch response directly; `redactPatch(targetId, html)` constructs an event for longer-lived streams. Keep the handler and any private state in server-only code. A browser-delivered script cannot carry an executable server closure.

```tsx
const handleAdd = createRedactionHandler(add, 'basket', async ({ input, request }) => {
  const user = await authenticate(request);
  await basketFor(user).add(input.item);
  return <Basket items={await basketFor(user).items()} />;
});
```

The demo service worker implements that endpoint shape with HTML templates because GitHub Pages cannot run a server. It returns genuine SSE morph events, but is **not** a production backend. HTTP streaming compression (Brotli or gzip where supported) belongs at the real server/proxy layer; buffering must be disabled for live streams.

## Deploy the demo

Enable GitHub Pages with **GitHub Actions** as its source. Push to `main` or run the `Deploy demo to GitHub Pages` workflow manually. The workflow builds using the repository name as the URL base, so assets, action endpoints, and the service worker stay within the Pages project path. For a local production preview, run `npm run build && npm run preview`.
