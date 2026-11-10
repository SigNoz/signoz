/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	MUTATION_OUTCOMES,
	type MutationOutcome,
	mutationResolver,
} from '../../stories/__story_mockdata__/mutationOutcome';

import {
	seedTimezone,
	TIMEZONES,
	type TimezoneChoice,
	updatedUserResponse,
} from './__story_mockdata__/account';

const PREFERENCES = 'Account · preferences';
const PROFILE = 'Account · profile';

export const accountMocks = defineStoryMocks({
	controls: {
		timezone: choiceControl<TimezoneChoice>('Timezone', {
			group: PREFERENCES,
			description:
				"Whether a timezone other than the browser's is stored. An override adds the amber marker and the button that clears it.",
			options: TIMEZONES,
			value: 'browser',
		}),
		nameUpdate: choiceControl<MutationOutcome>('Name update', {
			group: PROFILE,
			description:
				'How the PATCH behind "Update name" answers. `success` raises the "Name updated" toast, `loading` never answers, `error` opens the error modal.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
		passwordUpdate: choiceControl<MutationOutcome>('Password update', {
			group: PROFILE,
			description:
				'How the request behind "Reset password" answers. `success` raises the "Password updated" toast, `loading` never answers, `error` opens the error modal.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
	},
	handlers: (values) => [
		rest.put(
			'http://localhost/api/v2/users/me',
			mutationResolver(values.nameUpdate, updatedUserResponse()),
		),

		rest.put(
			'http://localhost/api/v2/users/me/factor_password',
			mutationResolver(values.passwordUpdate, updatedUserResponse()),
		),
	],
	config: () => ({ route: ROUTES.MY_SETTINGS }),
	effect: ({ timezone }) => seedTimezone(timezone),
});
