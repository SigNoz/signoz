/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import type { serviceAccountsMocks } from '../ServiceAccounts.stories.mocks';

interface PlayContext {
	args: PageStoryArgs<typeof serviceAccountsMocks>;
}

/** The table fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const enabledButton = (locate: () => HTMLElement): Promise<HTMLElement> =>
	waitFor(async () => {
		const button = locate();

		await expect(button).not.toHaveAttribute('aria-disabled', 'true');
		await expect(button).toBeEnabled();

		return button;
	}, untilLoaded);

export const openFilterMenu = async (): Promise<void> => {
	// The trigger is disabled until the list and its permission check answer, so
	// waiting on the text alone lands on a button that drops the click.
	const trigger = await waitFor(() => {
		const button = screen.getByTestId('sa-filter-trigger');

		if (
			button.getAttribute('aria-busy') === 'true' ||
			button.getAttribute('aria-disabled') === 'true'
		) {
			throw new Error('the filter trigger is still disabled');
		}

		return button;
	}, untilLoaded);

	await userEvent.click(trigger);
	await screen.findByRole('menuitem', { name: 'All accounts' }, untilLoaded);
};

export const openSearchSuggestions = async (): Promise<void> => {
	// The box is read-only until the list and its permission check answer.
	await screen.findByText('ci-pipeline', undefined, untilLoaded);
	const search = screen.getByTestId('sa-list-search');
	await userEvent.click(search.querySelector('.cm-content') ?? search);
	await screen.findByText('status', undefined, untilLoaded);
};

export const assignRoles = async (): Promise<void> => {
	await userEvent.click(
		await screen.findByRole('combobox', undefined, untilLoaded),
	);
	await screen.findByText('oncall-responder', undefined, untilLoaded);
};

export const saveFailed = async (): Promise<void> => {
	await userEvent.type(
		await screen.findByDisplayValue('ci-pipeline', undefined, untilLoaded),
		'-v2',
	);
	await userEvent.click(await screen.findByText(/save changes/i));
	await screen.findByText(/name update/i, undefined, untilLoaded);
};

export const keysSecondPage = async (): Promise<void> => {
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

export const keyCreated = async (): Promise<void> => {
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

export const editKeyThenRevokeConfirm = async (): Promise<void> => {
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

export const accountUpdatedToast = async ({
	args,
}: PlayContext): Promise<void> => {
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

export const accountCreatedToast = async ({
	args,
}: PlayContext): Promise<void> => {
	await userEvent.type(
		await screen.findByTestId('create-sa-name-input', undefined, untilLoaded),
		'release-signer',
	);
	await userEvent.click(
		await enabledButton(() => screen.getByTestId('create-sa-submit-btn')),
	);
	if (args.accountCreate === 'success') {
		await waitFor(() =>
			expect(
				screen.getByText(/service account created successfully/i),
			).toBeVisible(),
		);
	}
};

export const accountDeletedToast = async ({
	args,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await enabledButton(() => screen.getByTestId('confirm-delete-btn')),
	);
	if (args.accountDelete === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/service account deleted/i)).toBeVisible(),
		);
	}
};

export const keyUpdatedToast = async ({ args }: PlayContext): Promise<void> => {
	await userEvent.type(
		await screen.findByPlaceholderText(/enter key name/i, undefined, untilLoaded),
		'-rotated',
	);
	await userEvent.click(
		await enabledButton(() =>
			within(screen.getByTestId('edit-key-modal')).getByRole('button', {
				name: 'Save Changes',
			}),
		),
	);
	if (args.keyUpdate === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/key updated successfully/i)).toBeVisible(),
		);
	}
};

export const keyRevokedFromEditToast = async ({
	args,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await enabledButton(() => screen.getByRole('button', { name: 'Revoke Key' })),
	);
	const dialog = await screen.findByRole(
		'dialog',
		{ name: /revoke production-writer/i },
		untilLoaded,
	);

	await userEvent.click(
		await enabledButton(() =>
			within(dialog).getByRole('button', { name: 'Revoke Key' }),
		),
	);
	if (args.keyRevoke === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/key revoked successfully/i)).toBeVisible(),
		);
	}
};

export const keyRevokedToast = async ({ args }: PlayContext): Promise<void> => {
	await userEvent.click(
		await enabledButton(() => screen.getByRole('button', { name: 'Revoke Key' })),
	);
	if (args.keyRevoke === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/key revoked successfully/i)).toBeVisible(),
		);
	}
};

export const keyCopiedToast = async (): Promise<void> => {
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
