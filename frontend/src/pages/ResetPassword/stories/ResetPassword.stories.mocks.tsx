/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { StatusCodes } from 'http-status-codes';
import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

const LINK = 'Reset password · link';

const RESET_TOKENS = ['valid', 'expired'] as const;

type ResetToken = (typeof RESET_TOKENS)[number];

/** The token the reset email put in the link, which the page verifies on load. */
const RESET_TOKEN = 'e5a3f0c1-2b47-4d5e-9a7c-8f1b2d3e4c5d';

const VERIFY_URL = 'http://localhost/api/v2/reset_password_tokens/verify';

const expiredTokenHandler = rest.post(VERIFY_URL, (_req, res, ctx) =>
	res(
		ctx.status(StatusCodes.GONE),
		ctx.json({
			error: {
				code: 'token_expired',
				message:
					'This reset link has expired. Ask for a new one from the login page.',
				url: 'https://signoz.io/docs/userguide/manage-users/',
				errors: [],
			},
		}),
	),
);

export const resetPasswordMocks = defineStoryMocks({
	controls: {
		token: choiceControl<ResetToken>('Reset link', {
			group: LINK,
			description:
				'What the token in the link verifies as. An expired one replaces the form with the dead-link screen.',
			options: RESET_TOKENS,
			value: 'valid',
		}),
	},
	handlers: (values, response) => [
		values.token === 'valid'
			? rest.post(
					VERIFY_URL,
					response.json(() => ({ status: 'success' })),
				)
			: expiredTokenHandler,
		rest.post('http://localhost/api/v2/factor_password/reset', (_req, res, ctx) =>
			res(ctx.status(StatusCodes.NO_CONTENT)),
		),
	],
	config: () => ({
		route: `${ROUTES.PASSWORD_RESET}?token=${RESET_TOKEN}`,
		// The link is opened signed out, so the shell has no side nav, top nav or
		// banners to draw.
		appContext: { isLoggedIn: false },
	}),
});
