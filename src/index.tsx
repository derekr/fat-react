import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { z } from 'zod';
import { actionExpression, actionUrl } from './protocol';

export { redactPatch, redactResponse, redactionAck } from './protocol';

export type Redaction<Schema extends z.ZodType = z.ZodType> = {
  path: string;
  schema: Schema;
};

/** A shared action description. Keep the handler on the server; never ship it to the browser. */
export function defineRedaction<Schema extends z.ZodType>(action: Redaction<Schema>): Redaction<Schema> {
  return action;
}

type RewireProps<Schema extends z.ZodType> = {
  action: Redaction<Schema>;
  input: z.input<Schema>;
  children: ReactNode;
  asChild?: boolean;
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
}: RewireProps<Schema>) {
  const event = onSubmit ? 'submit__prevent' : 'click';
  const attribute = `data-on:${event}`;
  const binding = { [attribute]: actionExpression('post', actionUrl(action.path, input)) };

  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error('Rewire asChild requires exactly one React element.');
    }
    return cloneElement(children as ReactElement<Record<string, unknown>>, binding);
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
