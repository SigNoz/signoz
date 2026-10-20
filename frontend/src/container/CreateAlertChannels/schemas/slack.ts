import { z } from 'zod';

import { requiredString } from './shared';

export const slackSchema = z.object({
	apiUrl: requiredString('webhook_url_required'),
});
