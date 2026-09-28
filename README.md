# fat/react

Server components without reinventing the browser. Render JSX to HTML on the server, stream patches over SSE, and morph a stable host in an existing React app.

## Try it locally

```sh
npm ci
npm run dev
```

The interactive demo uses a service worker as a temporary mock backend, so it works on static GitHub Pages. It includes a button with `asChild`, a delegated wrapper button, and a form whose value is sent to the server. The demo store may reset whenever the browser restarts the service worker.

## API sketch

```tsx
const add = defineFatAction({
  path: '/api/basket/add',
  schema: z.object({ item: z.string() }),
});

<FatWire asChild action={add} input={{ item: 'peach' }}>
  <Button>Add a peach</Button>
</FatWire>

<Fat id="basket" src="/api/basket" />
```

`input` is checked by TypeScript against the action schema. A custom `Button` must forward DOM attributes for `asChild`. Without `asChild`, `FatWire` delegates the event from a `div` wrapper and works with opaque children. Use `onSubmit` to wire a form; form fields can use `data-bind:*` signals.

The action description is **not** a server action implementation. The server must validate the request against the schema, authorize the operation, and render HTML. `createFatHandler(action, targetId, render)` in `src/server.tsx` handles request parsing, schema validation, server-side JSX rendering and a single SSE patch response. `fatResponse(targetId, html)` constructs a patch response directly; `fatPatch(targetId, html)` constructs an event for longer-lived streams. Keep the handler and any private state in server-only code. A browser-delivered script cannot carry an executable server closure.

```tsx
const handleAdd = createFatHandler(add, 'basket', async ({ input, request }) => {
  const user = await authenticate(request);
  await basketFor(user).add(input.item);
  return <Basket items={await basketFor(user).items()} />;
});
```

The demo service worker implements that endpoint shape with HTML templates because GitHub Pages cannot run a server. It returns genuine SSE morph events, but is **not** a production backend. HTTP streaming compression (Brotli or gzip where supported) belongs at the real server/proxy layer; buffering must be disabled for live streams.

## Deploy the demo

Enable GitHub Pages with **GitHub Actions** as its source. Push to `main` or run the `Deploy demo to GitHub Pages` workflow manually. The workflow builds using the repository name as the URL base, so assets, action endpoints, and the service worker stay within the Pages project path. For a local production preview, run `npm run build && npm run preview`.
