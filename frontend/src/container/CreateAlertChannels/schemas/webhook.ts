import { z } from 'zod';

import { requiredString } from './shared';

export const webhookSchema = z
	.object({
		url: requiredString('webhook_url_required'),
		username: z.string().optional(),
		password: z.string().optional(),
	})
	// the API allows bearer-only and no-auth webhooks, but a username without its
	// password is still an incomplete basic auth pair
	.refine((v) => !v.username || !!v.password, {
		message: 'username_no_password',
		path: ['password'],
	});
