/** Serialize a trusted server-rendered HTML fragment as a Datastar morph event. */
export function fatPatch(targetId: string, html: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(targetId)) {
    throw new Error('Fat target IDs must contain only letters, numbers, underscores, or hyphens.');
  }

  const lines = html.replaceAll('\r', '').split('\n');
  return [
    'event: datastar-patch-elements',
    `data: selector #${targetId}`,
    'data: mode inner',
    ...lines.map((line) => `data: elements ${line}`),
    '',
    '',
  ].join('\n');
}

/** Use this from an HTTP handler after authenticating and validating the request. */
export function fatResponse(targetId: string, html: string): Response {
  return new Response(fatPatch(targetId, html), {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}

export function actionUrl(path: string, input: unknown): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Fat actions require a same-origin absolute path.');
  }
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}fatInput=${encodeURIComponent(JSON.stringify(input))}`;
}

export function actionExpression(method: 'post' | 'get', url: string): string {
  // JSON quoting ensures user input never becomes executable Datastar expression text.
  return `@${method}(${JSON.stringify(url)})`;
}
