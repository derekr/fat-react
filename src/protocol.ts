export type RedactPatchMode = 'inner' | 'append';

/** Serialize trusted server-rendered HTML for an inner morph or append to a Redact host. */
export function redactPatch(targetId: string, html: string, mode: RedactPatchMode = 'inner'): string {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(targetId)) {
    throw new Error('Redact target IDs must contain only letters, numbers, underscores, or hyphens.');
  }
  if (mode !== 'inner' && mode !== 'append') throw new Error('Redact patch mode must be inner or append.');

  const lines = html.replaceAll('\r', '').split('\n');
  return [
    'event: datastar-patch-elements',
    `data: selector #${targetId}`,
    `data: mode ${mode}`,
    ...lines.map((line) => `data: elements ${line}`),
    '',
    '',
  ].join('\n');
}

/** Use this from an HTTP handler after authenticating and validating the request. */
export function redactResponse(targetId: string, html: string, mode: RedactPatchMode = 'inner'): Response {
  return new Response(redactPatch(targetId, html, mode), {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}

/** A write command can acknowledge success without returning a DOM patch. */
export function redactionAck(): Response {
  return new Response('', {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
    },
  });
}

export function actionUrl(path: string, input: unknown): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Redaction actions require a same-origin absolute path.');
  }
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}redactionInput=${encodeURIComponent(JSON.stringify(input))}`;
}

export type RequestOptions = {
  contentType?: 'json' | 'form';
  filterSignals?: { include?: RegExp; exclude?: RegExp };
  selector?: string;
  headers?: Record<string, string>;
  openWhenHidden?: boolean;
  payload?: Record<string, unknown>;
  retry?: 'auto' | 'error' | 'always' | 'never';
  retryInterval?: number;
  retryScaler?: number;
  retryMaxWait?: number;
  retryMaxCount?: number;
  requestCancellation?: 'auto' | 'cleanup' | 'disabled';
};

export function serializeOptions(options: Record<string, unknown>): string {
  const entries = Object.entries(options).filter(([, value]) => value !== undefined);
  return `{${entries.map(([key, value]) => {
    if (value instanceof RegExp) return `${JSON.stringify(key)}:${value.toString()}`;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return `${JSON.stringify(key)}:${serializeOptions(value as Record<string, unknown>)}`;
    }
    return `${JSON.stringify(key)}:${JSON.stringify(value)}`;
  }).join(',')}}`;
}

export function actionExpression(method: 'post' | 'get' | 'put' | 'patch' | 'delete' | 'query', url: string, options?: RequestOptions): string {
  // JSON quoting ensures user input never becomes executable Datastar expression text.
  return `@${method}(${JSON.stringify(url)}${options && Object.values(options).some((value) => value !== undefined) ? `, ${serializeOptions(options)}` : ''})`;
}
