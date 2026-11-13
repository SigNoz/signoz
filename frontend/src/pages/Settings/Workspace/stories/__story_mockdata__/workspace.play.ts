/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { USER_ROLES } from 'types/roles';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { accessFor } from '@/storybook/access/access';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import type { workspaceMocks } from '../Workspace.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: PageStoryArgs<typeof workspaceMocks>;
}

const untilLoaded = { timeout: 10000 };

/** The domain card only renders for an admin on cloud. */
const canEditDomain = ({ args }: Pick<PlayContext, 'args'>): boolean =>
	args.license === 'cloud' &&
	accessFor(args.access, args.permissions, args.revoked).legacyRole ===
		USER_ROLES.ADMIN;

const submitNewSubdomain = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: /edit workspace link/i },
			untilLoaded,
		),
	);
	const input = await screen.findByRole('textbox');
	await userEvent.clear(input);
	await userEvent.type(input, 'watchers');
	await userEvent.click(
		await screen.findByRole('button', { name: /apply changes/i }),
	);
};

export const openCustomDomainMenu = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'custom-domain-menu-trigger',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByRole('menu');
};

export const updateCustomDomain = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await submitNewSubdomain(canvasElement);
	if (args.domainUpdate === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/workspace url is being updated/i)).toBeVisible(),
		);
	}
};

export const copyLicenseKey = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'license-key-row-copy-btn',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByText(/license key copied to clipboard/i);
};

export const openAddCreditCardFromConflict = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canEditDomain({ args })) {
		return;
	}

	await submitNewSubdomain(canvasElement);

	if (args.domainUpdate !== 'error') {
		return;
	}

	await userEvent.click(
		await screen.findByRole('button', { name: /contact support/i }, untilLoaded),
	);

	// Only a plan without premium support is offered the modal over the chat widget.
	if (args.support === 'add-card') {
		await screen.findByRole(
			'dialog',
			{ name: /Add Credit Card for Chat Support/i },
			untilLoaded,
		);
	}
};
