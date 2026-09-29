import type { ReactNode } from 'react';
import type { z } from 'zod';
import { attachDirectives, coreAttributes, eventAttribute, type EventModifiers } from './directives';
import { actionExpression, actionUrl, type RequestOptions } from './protocol';

export { redactPatch, redactResponse, redactionAck } from './protocol';
export type { RedactPatchMode } from './protocol';
export { Recast } from './directives';
export type { CoreDirectives, EventModifiers } from './directives';

export type Redaction<Schema extends z.ZodType = z.ZodType> = {
  path: string;
  schema: Schema;
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'query';
};

/** A shared action description. Keep the handler on the server; never ship it to the browser. */
export function defineRedaction<Schema extends z.ZodType>(action: Redaction<Schema>): Redaction<Schema> {
  return action;
}

export type RewireProps<Schema extends z.ZodType> = EventModifiers & RequestOptions & {
  action: Redaction<Schema>;
  input: z.input<Schema>;
  children: ReactNode;
  asChild?: boolean;
  event?: string;
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'query';
  bind?: string;
  indicator?: string;
} & (
  | { onClick?: true; onSubmit?: never }
  | { onSubmit: true; onClick?: never }
);

/** Connect an existing React control to an SSE-producing server action. */
export function Rewire<Schema extends z.ZodType>({
  action,
  input,
  children,
  asChild = false,
  onSubmit,
  onClick,
  event,
  method = action.method ?? 'post',
  bind,
  indicator,
  contentType, filterSignals, selector, headers, openWhenHidden, payload, retry,
  retryInterval, retryScaler, retryMaxWait, retryMaxCount, requestCancellation,
  ...modifiers
}: RewireProps<Schema>) {
  if (event && (onSubmit || onClick)) throw new Error('Use event or onClick/onSubmit, not both.');
  if (bind && !asChild) throw new Error('Rewire bind requires asChild so the binding reaches the input.');
  const name = event ?? (onSubmit ? 'submit' : 'click');
  const attribute = eventAttribute(name, { ...modifiers, prevent: modifiers.prevent ?? (name === 'submit') });
  const options = { contentType, filterSignals, selector, headers, openWhenHidden, payload, retry,
    retryInterval, retryScaler, retryMaxWait, retryMaxCount, requestCancellation };
  const binding = { ...coreAttributes({ bind, indicator }), [attribute]: actionExpression(method, actionUrl(action.path, input), options) };

  if (asChild) {
    return attachDirectives(children, binding);
  }

  // A wrapper uses event bubbling, so it also works with controls that do not forward props.
  return <div data-rewire="" {...binding}>{children}</div>;
}

type RedactProps = {
  id: string;
  src?: string;
  fallback?: string;
  className?: string;
};

/** React owns this host; Datastar alone updates its children. */
export function Redact({ id, src, fallback = 'Loading…', className }: RedactProps) {
  return (
    <div
      id={id}
      className={className}
      data-redact-host=""
      data-fallback={fallback}
      data-init={src ? actionExpression('get', src) : undefined}
      aria-live="polite"
    />
  );
}

/** One page-level read stream; its SSE events can morph any Redact host. */
export function Repipe({ src }: { src: string }) {
  return <div hidden data-repipe="" data-init={`@get(${JSON.stringify(src)}, {requestCancellation: 'none'})`} />;
}
