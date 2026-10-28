import { z } from 'zod';

import { WebhookAuth } from '../types';
import { webhookAuthOf } from '../utils';
import { requiredString } from './shared';

export const webhookSchema = z
	.object({
		url: requiredString('webhook_url_required'),
		webhookAuth: z.enum(WebhookAuth).optional(),
		username: z.string().optional(),
		password: z.string().optional(),
		bearerToken: z.string().optional(),
	})
	.refine(
		(values) =>
			webhookAuthOf(values) !== WebhookAuth.basic ||
			!!values.username?.trim() ||
			!!values.password?.trim(),
		{ message: 'webhook_basic_auth_required', path: ['username'] },
	)
	.refine(
		(values) =>
			webhookAuthOf(values) !== WebhookAuth.bearer || !!values.bearerToken?.trim(),
		{ message: 'webhook_bearer_token_required', path: ['bearerToken'] },
	);
