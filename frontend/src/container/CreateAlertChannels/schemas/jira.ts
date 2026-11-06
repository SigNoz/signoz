import { z } from 'zod';

import { JiraDeployment } from '../types';
import { isValidJiraReopenDuration } from '../utils';
import { requiredString } from './shared';

const required = requiredString('jira_required_fields');

export const jiraSchema = z
	.object({
		deployment: z.enum(JiraDeployment),
		site: required,
		auth: z
			.object({
				email: z.string().optional(),
				apiToken: z.string().optional(),
				pat: z.string().optional(),
			})
			.optional(),
		project: required,
		issueType: required,
		reopenDuration: z
			.string()
			.optional()
			.refine((v) => !v || isValidJiraReopenDuration(v), {
				message: 'jira_reopen_duration_invalid',
			}),
	})
	.refine(
		(values) =>
			values.deployment === JiraDeployment.selfhosted ||
			(!!values.auth?.email?.trim() && !!values.auth?.apiToken?.trim()),
		{ message: 'jira_cloud_credentials_required', path: ['auth', 'email'] },
	)
	.refine(
		(values) =>
			values.deployment !== JiraDeployment.selfhosted ||
			!!values.auth?.pat?.trim(),
		{ message: 'jira_pat_required', path: ['auth', 'pat'] },
	);
