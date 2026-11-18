import { z } from 'zod';

import { requiredString } from './shared';

// rows with a blank title or text are dropped on save, so only the rest are checked
const fieldRow = z
	.object({ title: z.string().optional(), value: z.string().optional() })
	.refine((row) => !row.title?.trim() || !!row.value?.trim(), {
		message: 'slack_field_value_required',
		path: ['value'],
	});

const actionRow = z
	.object({
		text: z.string().optional(),
		url: z.string().optional(),
		name: z.string().optional(),
	})
	.refine(
		(row) => !row.text?.trim() || !!row.url?.trim() || !!row.name?.trim(),
		{
			message: 'slack_action_url_or_name_required',
			path: ['url'],
		},
	);

export const slackSchema = z.object({
	apiUrl: requiredString('webhook_url_required'),
	fields: z.array(fieldRow).nullish(),
	actions: z.array(actionRow).nullish(),
});
