/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { StatusCodes } from 'http-status-codes';
import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	REGISTRATIONS,
	registerRejectedResponse,
	registerResponse,
	type Registration,
} from './__story_mockdata__/signUp';

const ACCOUNT = 'Sign up · account';

export const signUpMocks = defineStoryMocks({
	controls: {
		registration: choiceControl<Registration>('Registration', {
			group: ACCOUNT,
			description:
				'What `POST /register` answers when the form is submitted. `accepted` signs the new admin straight in, which leaves the page.',
			options: REGISTRATIONS,
			value: 'accepted',
		}),
	},
	handlers: (values) => [
		rest.post('http://localhost/api/v1/register', (_req, res, ctx) =>
			values.registration === 'accepted'
				? res(ctx.json(registerResponse()))
				: res(
						ctx.status(StatusCodes.CONFLICT),
						ctx.json(registerRejectedResponse()),
					),
		),
	],
	config: () => ({
		route: ROUTES.SIGN_UP,
		// Signing up is what a browser with no session does, so the shell has no
		// side nav, top nav or banners to draw.
		appContext: { isLoggedIn: false },
	}),
});
