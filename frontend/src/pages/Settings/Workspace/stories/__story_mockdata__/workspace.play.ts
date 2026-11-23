/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	offersAddCard,
	offersContactSupport,
	showsDomainCard,
	showsLicenseKey,
	type WorkspaceArgs,
} from '../Workspace.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: WorkspaceArgs;
}

const untilLoaded = { timeout: 10000 };

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
	args,
}: PlayContext): Promise<void> => {
	if (!showsDomainCard(args)) {
		return;
	}
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
	if (!showsDomainCard(args)) {
		return;
	}
	await submitNewSubdomain(canvasElement);
	if (args.domainUpdate === 'success') {
		await waitFor(() =>
			expect(screen.getByText(/workspace url is being updated/i)).toBeVisible(),
		);
	}
};

export const copyLicenseKey = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsLicenseKey(args)) {
		return;
	}
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
	if (!showsDomainCard(args)) {
		return;
	}

	await submitNewSubdomain(canvasElement);

	if (args.domainUpdate !== 'error' || !offersContactSupport(args)) {
		return;
	}

	await userEvent.click(
		await screen.findByRole('button', { name: /contact support/i }, untilLoaded),
	);

	// Only a plan without premium support is offered the modal over the chat widget.
	if (offersAddCard(args)) {
		await screen.findByRole(
			'dialog',
			{ name: /Add Credit Card for Chat Support/i },
			untilLoaded,
		);
	}
};
