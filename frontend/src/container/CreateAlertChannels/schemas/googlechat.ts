import { z } from 'zod';

import { isValidGoogleChatWebhookURL } from '../utils';
import { requiredString } from './shared';

export const googleChatSchema = z.object({
	webhookUrl: requiredString('webhook_url_required').refine(
		isValidGoogleChatWebhookURL,
		{ message: 'google_chat_webhook_url_invalid' },
	),
});
