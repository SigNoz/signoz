import { z } from 'zod';

export const requiredString = (messageKey: string): z.ZodString =>
	// an untouched field arrives as undefined, which would otherwise report zod's
	// own "expected string" instead of the message the form should show
	z.string({ error: messageKey }).trim().min(1, messageKey);

export const channelNameSchema = z.object({
	name: requiredString('channel_name_required'),
});
