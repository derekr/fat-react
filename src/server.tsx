import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { z } from 'zod';
import type { FatAction } from './index';
import { fatResponse } from './protocol';

/** A framework-independent Request -> Response handler for one Fat action. */
export function createFatHandler<Schema extends z.ZodType>(
  action: FatAction<Schema>,
  targetId: string,
  render: (context: { input: z.output<Schema>; signals: unknown; request: Request }) => ReactNode | Promise<ReactNode>,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== new URL(action.path, url).pathname) {
      return new Response('Not found', { status: 404 });
    }

    let rawInput: unknown;
    let signals: unknown;
    try {
      rawInput = JSON.parse(url.searchParams.get('fatInput') ?? 'null');
      signals = await request.json();
    } catch {
      return new Response('Invalid request', { status: 400 });
    }

    const result = action.schema.safeParse(rawInput);
    if (!result.success) return new Response('Invalid input', { status: 400 });

    // The caller must authenticate/authorize and validate any signals used in render().
    const element = await render({ input: result.data, signals, request });
    return fatResponse(targetId, renderToStaticMarkup(element));
  };
}
