import { z } from 'zod';

import { requiredString } from './shared';

const required = requiredString('incidentio_required_fields');

export const incidentIOSchema = z.object({
	url: required,
	token: z
		.string({ error: 'incidentio_required_fields' })
		.refine((token) => token === token.trim(), {
			message: 'incidentio_token_whitespace',
		})
		.pipe(
			required.refine((token) => !/^bearer( |$)/i.test(token), {
				message: 'incidentio_token_bearer_prefix',
			}),
		),
});
