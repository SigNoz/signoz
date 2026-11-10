/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	serviceAccountsMocks,
	untilLoaded,
} from '../ServiceAccounts.stories.mocks';

interface PlayContext {
	args: PageStoryArgs<typeof serviceAccountsMocks>;
}

export const openFilterMenu = async (): Promise<void> => {
	// The trigger is disabled until the list and its permission check answer, so
	// waiting on the text alone lands on a button that drops the click.
	const trigger = await waitFor(() => {
		const button = screen.getByRole('button', { name: /all accounts/i });

		if (
			button.getAttribute('aria-busy') === 'true' ||
			button.getAttribute('aria-disabled') === 'true'
		) {
			throw new Error('the filter trigger is still disabled');
		}

		return button;
	}, untilLoaded);

	await userEvent.click(trigger);
	// Every active row carries an ACTIVE badge, so the menu option is matched on
	// its own count suffix.
	await screen.findByText(/^active ⎯/i, undefined, untilLoaded);
};

export const openAssignRoles = async (): Promise<void> => {
	await userEvent.click(
		await screen.findByTestId('sa-roles-select', undefined, untilLoaded),
	);
	await screen.findByTestId(
		'sa-roles-select-item-role-oncall-responder',
		undefined,
		untilLoaded,
	);
};

export const failAccountSave = async (): Promise<void> => {
	await userEvent.type(
		await screen.findByDisplayValue('ci-pipeline', undefined, untilLoaded),
		'-v2',
	);
	await userEvent.click(await screen.findByText(/save changes/i));
	await screen.findByText(/name update/i, undefined, untilLoaded);
};

export const openKeysSecondPage = async (): Promise<void> => {
	const pagination = await waitFor(() => {
		const rendered = document.querySelector('.sa-drawer__keys-pagination');
		if (!rendered) {
			throw new Error('the keys pagination has not rendered yet');
		}
		return rendered as HTMLElement;
	}, untilLoaded);

	await userEvent.click(within(pagination).getByTitle('2'));
	await screen.findByText('archive-exporter', undefined, untilLoaded);
};

export const createKey = async (): Promise<void> => {
	await userEvent.type(
		await screen.findByPlaceholderText(/enter key name/i, undefined, untilLoaded),
		'release-signer',
	);
	await userEvent.click(await screen.findByText(/create key/i));
	await screen.findByText(
		/only time it will be displayed/i,
		undefined,
		untilLoaded,
	);
};

export const openKeyRevokeFromEdit = async (): Promise<void> => {
	// The control is rendered disabled until its permission check answers, and a
	// click on a disabled button is dropped without an error.
	const revoke = await waitFor(async () => {
		const button = screen.getByRole('button', { name: 'Revoke Key' });

		await expect(button).not.toHaveAttribute('aria-disabled', 'true');

		return button;
	}, untilLoaded);

	await userEvent.click(revoke);
	await screen.findByRole(
		'dialog',
		{ name: /revoke production-writer/i },
		untilLoaded,
	);
};

export const saveAccountName = async ({ args }: PlayContext): Promise<void> => {
	await userEvent.type(
		await screen.findByDisplayValue('ci-pipeline', undefined, untilLoaded),
		'-v2',
	);
	await userEvent.click(await screen.findByText(/save changes/i));
	if (args.saveOutcome === 'succeeds') {
		await waitFor(() =>
			expect(
				screen.getByText(/service account updated successfully/i),
			).toBeVisible(),
		);
	}
};

export const createAccount = async ({ args }: PlayContext): Promise<void> => {
	await userEvent.type(
		await screen.findByTestId(
			'create-sa-name-input-field',
			undefined,
			untilLoaded,
		),
		'release-signer',
	);
	await userEvent.click(
		await waitFor(async () => {
			const button = screen.getByTestId('create-sa-submit-btn');

			await expect(button).not.toHaveAttribute('aria-disabled', 'true');
			await expect(button).toBeEnabled();

			return button;
		}, untilLoaded),
	);
	if (args.accountCreate === 'success') {
		await waitFor(() =>
			expect(
				screen.getByText(/service account created successfully/i),
			).toBeVisible(),
		);
	}
};

export const deleteAccount = async ({ args }: PlayContext): Promise<void> => {
	await userEvent.click(
		await waitFor(async () => {
			const button = screen.getByTestId('confirm-delete-btn');

			await expect(button).not.toHaveAttribute('aria-disabled', 'true');
			await expect(button).toBeEnabled();

			return button;
		}, untilLoaded),
	);
	if (args.accountDelete === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/service account deleted/i)).toBeVisible(),
		);
	}
};

export const saveKeyName = async ({ args }: PlayContext): Promise<void> => {
	await userEvent.type(
		await screen.findByPlaceholderText(/enter key name/i, undefined, untilLoaded),
		'-rotated',
	);
	await userEvent.click(
		await waitFor(async () => {
			const button = within(screen.getByTestId('edit-key-modal')).getByRole(
				'button',
				{ name: 'Save Changes' },
			);

			await expect(button).not.toHaveAttribute('aria-disabled', 'true');
			await expect(button).toBeEnabled();

			return button;
		}, untilLoaded),
	);
	if (args.keyUpdate === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/key updated successfully/i)).toBeVisible(),
		);
	}
};

export const revokeKeyFromEdit = async ({
	args,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await waitFor(async () => {
			const button = screen.getByRole('button', { name: 'Revoke Key' });

			await expect(button).not.toHaveAttribute('aria-disabled', 'true');
			await expect(button).toBeEnabled();

			return button;
		}, untilLoaded),
	);
	const dialog = await screen.findByRole(
		'dialog',
		{ name: /revoke production-writer/i },
		untilLoaded,
	);

	await userEvent.click(
		await waitFor(async () => {
			const button = within(dialog).getByRole('button', {
				name: 'Revoke Key',
			});

			await expect(button).not.toHaveAttribute('aria-disabled', 'true');
			await expect(button).toBeEnabled();

			return button;
		}, untilLoaded),
	);
	if (args.keyRevoke === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/key revoked successfully/i)).toBeVisible(),
		);
	}
};

export const revokeKeyFromRow = async ({
	args,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await waitFor(async () => {
			const button = screen.getByRole('button', { name: 'Revoke Key' });

			await expect(button).not.toHaveAttribute('aria-disabled', 'true');
			await expect(button).toBeEnabled();

			return button;
		}, untilLoaded),
	);
	if (args.keyRevoke === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/key revoked successfully/i)).toBeVisible(),
		);
	}
};

export const copyKeySecret = async (): Promise<void> => {
	await userEvent.type(
		await screen.findByPlaceholderText(/enter key name/i, undefined, untilLoaded),
		'release-signer',
	);
	await userEvent.click(await screen.findByText(/create key/i));
	// The copy button is the one beside the new key, which may have no name.
	const key = await screen.findByText(/^sk-/, undefined, untilLoaded);

	await userEvent.click(
		within(key.parentElement as HTMLElement).getByRole('button'),
	);
	await screen.findByText(/key copied to clipboard/i);
};
