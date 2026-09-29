import { z } from 'zod';
import { defineRedaction, Rewire } from '../src';

const action = defineRedaction({ path: '/api/add', schema: z.object({ quantity: z.number() }) });

// These examples are type-checked by `npm run build` and are not included in the demo bundle.
export const valid = <Rewire action={action} input={{ quantity: 1 }}><button>Add</button></Rewire>;
// @ts-expect-error quantity must be a number.
export const invalid = <Rewire action={action} input={{ quantity: 'one' }}><button>Add</button></Rewire>;
