import { z } from 'zod';

import { isValidJiraReopenDuration } from '../utils';
import { requiredString } from './shared';

const required = requiredString('jira_required_fields');

export const jiraSchema = z.object({
	site: required,
	email: required,
	apiToken: required,
	project: required,
	issueType: required,
	reopenDuration: z
		.string()
		.optional()
		.refine((v) => !v || isValidJiraReopenDuration(v), {
			message: 'jira_reopen_duration_invalid',
		}),
});
