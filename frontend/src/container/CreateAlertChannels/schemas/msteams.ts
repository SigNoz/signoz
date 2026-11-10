import { z } from 'zod';

import { requiredString } from './shared';

export const msTeamsSchema = z.object({
	webhookUrl: requiredString('webhook_url_required'),
});
