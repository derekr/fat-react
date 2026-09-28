import { z } from 'zod';
import { defineFatAction, FatWire } from '../src';

const action = defineFatAction({ path: '/api/add', schema: z.object({ quantity: z.number() }) });

// These examples are type-checked by `npm run build` and are not included in the demo bundle.
export const valid = <FatWire action={action} input={{ quantity: 1 }}><button>Add</button></FatWire>;
// @ts-expect-error quantity must be a number.
export const invalid = <FatWire action={action} input={{ quantity: 'one' }}><button>Add</button></FatWire>;
