import { expect, screen, waitFor } from 'storybook/test';

const TITLE = /What’s New ⎯ Changelog : November 3, 2026/;

export const showsCloudChangelog = async (): Promise<void> => {
	await screen.findByRole('dialog', { name: TITLE });
	await expect(
		screen.queryByRole('button', { name: /Skip for now/ }),
	).not.toBeInTheDocument();
};

export const showsSelfHostedChangelog = async (): Promise<void> => {
	await screen.findByRole('dialog', { name: TITLE });
	await waitFor(() =>
		expect(
			screen.getByRole('button', { name: /Update my workspace/ }),
		).toBeVisible(),
	);
};
