import { z } from 'zod';

import { requiredString } from './shared';

export const pagerdutySchema = z.object({
	routingKey: requiredString('routing_key_required'),
});
