import { z } from 'zod';

import { requiredString } from './shared';

export const telegramSchema = z.object({
	botToken: requiredString('bot_token_required'),
	// the backend reads 0 as missing, and omitBlank deliberately keeps 0
	chatId: z
		.number({ error: 'chat_id_required' })
		.refine((value) => value !== 0, { error: 'chat_id_required' }),
});
