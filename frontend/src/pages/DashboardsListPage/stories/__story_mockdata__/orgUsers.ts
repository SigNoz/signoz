/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ListUsers200 } from 'api/generated/services/sigNoz.schemas';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import { USER_ROLES } from 'types/roles';

/**
 * The address the providers sign in as, so a "mine" view matches rows created
 * by it.
 */
export const STORY_USER_EMAIL = createAppContextMock(USER_ROLES.ADMIN).user
	.email;

export const TEAMMATE_EMAILS = [
	'ada@signoz.io',
	'grace@signoz.io',
	'linus@signoz.io',
] as const;

export const orgUsersResponse = (): ListUsers200 => ({
	status: 'success',
	data: [
		{
			id: 'storybook-user-me',
			email: STORY_USER_EMAIL,
			displayName: 'John Doe',
		},
		...TEAMMATE_EMAILS.map((email, index) => ({
			id: `storybook-user-${index + 1}`,
			email,
			displayName: email.split('@')[0].replace(/^./, (c) => c.toUpperCase()),
		})),
	],
});
