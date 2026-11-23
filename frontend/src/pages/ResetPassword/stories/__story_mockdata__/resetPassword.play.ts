/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent } from 'storybook/test';

import {
	type ResetPasswordArgs,
	showsResetForm,
} from '../ResetPassword.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: ResetPasswordArgs;
}

export const showPasswordMismatch = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsResetForm(args)) {
		return;
	}
	const password = await screen.findByTestId('password', undefined, {
		timeout: 15000,
	});
	const confirm = await screen.findByPlaceholderText(
		/confirm your new password/i,
	);

	await userEvent.type(password, 'password123');
	await userEvent.type(confirm, 'password456');
	await userEvent.click(canvasElement);
	await screen.findByText(/passwords don't match/i);
};
