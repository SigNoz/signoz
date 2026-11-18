import { z } from 'zod';

import { requiredString } from './shared';

export const jsmOpsSchema = z.object({
	apiKey: requiredString('api_key_required'),
});
