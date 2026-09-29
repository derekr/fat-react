import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { z } from 'zod';
import type { Redaction } from './index';
import { redactResponse, type RedactPatchMode } from './protocol';

/** A framework-independent Request -> Response handler for one redaction. */
export function createRedactionHandler<Schema extends z.ZodType>(
  action: Redaction<Schema>,
  targetId: string,
  render: (context: { input: z.output<Schema>; signals: unknown; request: Request }) => ReactNode | Promise<ReactNode>,
  mode: RedactPatchMode = 'inner',
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method !== (action.method ?? 'post').toUpperCase() || url.pathname !== new URL(action.path, url).pathname) {
      return new Response('Not found', { status: 404 });
    }

    let rawInput: unknown;
    let signals: unknown;
    try {
      rawInput = JSON.parse(url.searchParams.get('redactionInput') ?? 'null');
      signals = request.method === 'GET'
        ? JSON.parse(url.searchParams.get('datastar') ?? '{}')
        : await request.json();
    } catch {
      return new Response('Invalid request', { status: 400 });
    }

    const result = action.schema.safeParse(rawInput);
    if (!result.success) return new Response('Invalid input', { status: 400 });

    // The caller must authenticate/authorize and validate any signals used in render().
    const element = await render({ input: result.data, signals, request });
    return redactResponse(targetId, renderToStaticMarkup(element), mode);
  };
}
