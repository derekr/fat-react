import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { serializeOptions } from './protocol';

export type EventModifiers = {
  once?: boolean;
  passive?: boolean;
  capture?: boolean;
  eventCase?: 'camel' | 'kebab' | 'snake' | 'pascal';
  delay?: number;
  debounce?: number;
  debounceLeading?: boolean;
  debounceNoTrailing?: boolean;
  throttle?: number;
  throttleNoLeading?: boolean;
  throttleTrailing?: boolean;
  viewTransition?: boolean;
  window?: boolean;
  document?: boolean;
  outside?: boolean;
  prevent?: boolean;
  stop?: boolean;
};

function duration(value: number, name: string): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer in milliseconds.`);
  return `${value}ms`;
}

export function eventAttribute(event: string, modifiers: EventModifiers = {}): string {
  if (!/^[a-z][a-z0-9-]*$/i.test(event)) throw new Error('Event names must contain only letters, numbers, and hyphens.');
  const {
    once, passive, capture, eventCase, delay, debounce, debounceLeading, debounceNoTrailing,
    throttle, throttleNoLeading, throttleTrailing, viewTransition, window: onWindow,
    document: onDocument, outside, prevent, stop,
  } = modifiers;
  if (debounce === undefined && (debounceLeading || debounceNoTrailing)) throw new Error('Debounce edges require debounce.');
  if (throttle === undefined && (throttleNoLeading || throttleTrailing)) throw new Error('Throttle edges require throttle.');
  if (onWindow && onDocument) throw new Error('An event cannot target both window and document.');
  const parts = [`data-on:${event}`];
  if (eventCase) parts.push(`case.${eventCase}`);
  if (once) parts.push('once');
  if (passive) parts.push('passive');
  if (capture) parts.push('capture');
  if (delay !== undefined) parts.push(`delay.${duration(delay, 'delay')}`);
  if (debounce !== undefined) parts.push(`debounce.${duration(debounce, 'debounce')}${debounceLeading ? '.leading' : ''}${debounceNoTrailing ? '.notrailing' : ''}`);
  if (throttle !== undefined) parts.push(`throttle.${duration(throttle, 'throttle')}${throttleNoLeading ? '.noleading' : ''}${throttleTrailing ? '.trailing' : ''}`);
  if (viewTransition) parts.push('viewtransition');
  if (onWindow) parts.push('window');
  if (onDocument) parts.push('document');
  if (outside) parts.push('outside');
  if (prevent) parts.push('prevent');
  if (stop) parts.push('stop');
  return parts.join('__');
}

function keyedAttributes(prefix: string, values: Record<string, string>, result: Record<string, string>) {
  for (const [name, expression] of Object.entries(values)) {
    if (!/^[a-z][a-z0-9-]*$/i.test(name)) throw new Error(`Invalid ${prefix} key: ${name}`);
    result[`data-${prefix}:${name}`] = expression;
  }
}

export type CoreDirectives = {
  bind?: string;
  signals?: Record<string, unknown>;
  computed?: Record<string, string>;
  text?: string;
  show?: string;
  attr?: Record<string, string>;
  classes?: Record<string, string>;
  styles?: Record<string, string>;
  effect?: string;
  init?: string;
  ignore?: boolean;
  ignoreMorph?: boolean;
  indicator?: string;
  jsonSignals?: boolean | { include?: RegExp; exclude?: RegExp };
  onIntersect?: string;
  onInterval?: string;
  onSignalPatch?: string;
  onSignalPatchFilter?: { include?: RegExp; exclude?: RegExp };
  preserveAttr?: string[];
  refSignal?: string;
  events?: Array<{ event: string; expression: string } & EventModifiers>;
};

/** JSX-friendly core directives; advanced modifiers can still use native data-* props. */
export function coreAttributes(directives: CoreDirectives): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (directives.bind) attributes['data-bind'] = directives.bind;
  if (directives.signals) attributes['data-signals'] = JSON.stringify(directives.signals);
  if (directives.computed) keyedAttributes('computed', directives.computed, attributes);
  if (directives.text !== undefined) attributes['data-text'] = directives.text;
  if (directives.show !== undefined) attributes['data-show'] = directives.show;
  if (directives.attr) keyedAttributes('attr', directives.attr, attributes);
  if (directives.classes) keyedAttributes('class', directives.classes, attributes);
  if (directives.styles) keyedAttributes('style', directives.styles, attributes);
  if (directives.effect !== undefined) attributes['data-effect'] = directives.effect;
  if (directives.init !== undefined) attributes['data-init'] = directives.init;
  if (directives.ignore) attributes['data-ignore'] = '';
  if (directives.ignoreMorph) attributes['data-ignore-morph'] = '';
  if (directives.indicator) attributes['data-indicator'] = directives.indicator;
  if (directives.jsonSignals) attributes['data-json-signals'] = directives.jsonSignals === true ? '' : serializeOptions(directives.jsonSignals);
  if (directives.onIntersect) attributes['data-on-intersect'] = directives.onIntersect;
  if (directives.onInterval) attributes['data-on-interval'] = directives.onInterval;
  if (directives.onSignalPatch) attributes['data-on-signal-patch'] = directives.onSignalPatch;
  if (directives.onSignalPatchFilter) attributes['data-on-signal-patch-filter'] = serializeOptions(directives.onSignalPatchFilter);
  if (directives.preserveAttr?.length) attributes['data-preserve-attr'] = directives.preserveAttr.join(' ');
  if (directives.refSignal) attributes['data-ref'] = directives.refSignal;
  for (const { event, expression, ...modifiers } of directives.events ?? []) {
    const key = eventAttribute(event, modifiers);
    if (key in attributes) throw new Error(`Duplicate event directive: ${event}`);
    attributes[key] = expression;
  }
  return attributes;
}

export function attachDirectives(children: ReactNode, attributes: Record<string, string>): ReactElement {
  if (!isValidElement(children) || children.type === Fragment) {
    throw new Error('asChild requires exactly one element (not a fragment).');
  }
  const existing = (children as ReactElement<Record<string, unknown>>).props;
  for (const key of Object.keys(attributes)) {
    if (key in existing || (key.startsWith('data-on:') && Object.keys(existing).some((name) => name.startsWith(`data-on:${key.slice(8).split('__')[0]}`)))) {
      throw new Error(`The child already defines ${key}.`);
    }
  }
  return cloneElement(children as ReactElement<Record<string, unknown>>, attributes);
}

/** Attach core directives to any existing DOM element or prop-forwarding component. */
export function Recast({ asChild, children, ...directives }: CoreDirectives & { asChild?: boolean; children: ReactNode }) {
  const attributes = coreAttributes(directives);
  return asChild ? attachDirectives(children, attributes) : <div {...attributes}>{children}</div>;
}
