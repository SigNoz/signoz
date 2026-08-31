/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	seedTimezone,
	TIMEZONES,
	type TimezoneChoice,
	updatedUserResponse,
} from './__story_mockdata__/account';

const PREFERENCES = 'Account · preferences';

export const accountMocks = defineStoryMocks({
	controls: {
		timezone: choiceControl<TimezoneChoice>('Timezone', {
			group: PREFERENCES,
			description:
				"Whether a timezone other than the browser's is stored. An override adds the amber marker and the button that clears it.",
			options: TIMEZONES,
			value: 'browser',
		}),
	},
	handlers: (_values, response) => [
		rest.patch(
			'http://localhost/api/v2/users/me',
			response.json(() => updatedUserResponse()),
		),

		rest.post(
			'http://localhost/api/v2/users/me/factor_password',
			response.json(() => updatedUserResponse()),
		),
	],
	config: () => ({ route: ROUTES.MY_SETTINGS }),
	effect: ({ timezone }) => seedTimezone(timezone),
});
