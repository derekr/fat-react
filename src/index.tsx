import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { z } from 'zod';
import { actionExpression, actionUrl } from './protocol';

export { fatPatch, fatResponse } from './protocol';

export type FatAction<Schema extends z.ZodType = z.ZodType> = {
  path: string;
  schema: Schema;
};

/** A shared action description. Keep the handler on the server; never ship it to the browser. */
export function defineFatAction<Schema extends z.ZodType>(action: FatAction<Schema>): FatAction<Schema> {
  return action;
}

type WireProps<Schema extends z.ZodType> = {
  action: FatAction<Schema>;
  input: z.input<Schema>;
  children: ReactNode;
  asChild?: boolean;
} & (
  | { onClick?: true; onSubmit?: never }
  | { onSubmit: true; onClick?: never }
);

/** Connect an existing React control to an SSE-producing server action. */
export function FatWire<Schema extends z.ZodType>({
  action,
  input,
  children,
  asChild = false,
  onSubmit,
}: WireProps<Schema>) {
  const event = onSubmit ? 'submit__prevent' : 'click';
  const attribute = `data-on:${event}`;
  const binding = { [attribute]: actionExpression('post', actionUrl(action.path, input)) };

  if (asChild) {
    if (!isValidElement(children)) {
      throw new Error('FatWire asChild requires exactly one React element.');
    }
    return cloneElement(children as ReactElement<Record<string, unknown>>, binding);
  }

  // A wrapper uses event bubbling, so it also works with controls that do not forward props.
  return <div data-fat-wire="" {...binding}>{children}</div>;
}

type FatProps = {
  id: string;
  src: string;
  fallback?: string;
  className?: string;
};

/** React owns this host; Datastar alone updates its children. */
export function Fat({ id, src, fallback = 'Loading…', className }: FatProps) {
  return (
    <div
      id={id}
      className={className}
      data-fat-host=""
      data-fallback={fallback}
      data-init={actionExpression('get', src)}
      aria-live="polite"
    />
  );
}
