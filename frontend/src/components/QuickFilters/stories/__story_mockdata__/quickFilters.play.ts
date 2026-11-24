/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ComponentProps } from 'react';
import { QuickFilterManagePermissions } from 'lib/authz/hooks/useAuthZ/permissions/quick-filter.permissions';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { grantsAll } from '@/storybook/access/access';
import type { GlobalMockArgs } from '@/storybook/globals';

import type QuickFilters from '../../QuickFilters';

interface PlayContext {
	canvasElement: HTMLElement;
	args: ComponentProps<typeof QuickFilters> & GlobalMockArgs;
}

const UNTIL_LOADED = { timeout: 15_000 };

/** The settings control stays enabled when the check itself fails. */
const canManageQuickFilters = (args: PlayContext['args']): boolean =>
	args.authzState === 'error' ||
	grantsAll(args, ...QuickFilterManagePermissions);

/**
 * The settings control renders disabled while its permission check is in
 * flight and is swapped for the enabled one once the check answers, so it is
 * looked up again on every attempt; a click on the disabled one is dropped in
 * silence.
 */
const settingsControl = (canvasElement: HTMLElement): Promise<HTMLElement> =>
	waitFor(async () => {
		const control = within(canvasElement).getByTestId('settings-icon-container');

		await expect(control).not.toHaveAttribute('aria-disabled', 'true');

		return control;
	}, UNTIL_LOADED);

export const openSettings = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canManageQuickFilters(args)) {
		return;
	}

	await userEvent.click(await settingsControl(canvasElement));
	await screen.findByText('Edit quick filters');
};

export const dirtySettings = async (context: PlayContext): Promise<void> => {
	if (!canManageQuickFilters(context.args)) {
		return;
	}

	await openSettings(context);
	await userEvent.click(await screen.findByRole('button', { name: 'Add' }));
	await screen.findByRole('button', { name: 'Save changes' });
};

/**
 * Nested tooltips on one trigger merge into a single stacked tooltip, so a
 * duplicate shows as the title repeated inside it, not as a second tooltip.
 */
export const hoverTruncatedTitle = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const title = args.config?.[0]?.title;
	if (!title) {
		return;
	}

	const [label] = await within(canvasElement).findAllByText(
		title,
		{},
		UNTIL_LOADED,
	);
	// A hover before the text is measured finds no tooltip to open.
	await waitFor(() => expect(label).toHaveAttribute('data-truncated'));
	await userEvent.hover(label);

	const tooltip = await waitFor(async () => {
		const match = screen
			.queryAllByRole('tooltip')
			.find((element) => element.textContent?.includes(title));

		await expect(match).toBeVisible();

		return match as HTMLElement;
	});

	await expect(tooltip.textContent?.split(title)).toHaveLength(2);
};

export const openQueryPicker = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const trigger = await waitFor(async () => {
		const element = canvasElement.querySelector<HTMLElement>(
			'[data-slot="combobox-trigger"]',
		);

		await expect(element).toBeInTheDocument();

		return element as HTMLElement;
	});

	await userEvent.click(trigger);
	await screen.findByRole('listbox');
};
