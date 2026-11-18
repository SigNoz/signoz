import { z } from 'zod';

import { requiredString } from './shared';

export const emailSchema = z.object({
	to: requiredString('to_required'),
});
