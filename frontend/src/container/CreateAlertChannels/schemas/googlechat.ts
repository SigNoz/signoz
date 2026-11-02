import { z } from 'zod';

import { requiredString } from './shared';

export const googleChatSchema = z.object({
	webhookUrl: requiredString('webhook_url_required'),
});
