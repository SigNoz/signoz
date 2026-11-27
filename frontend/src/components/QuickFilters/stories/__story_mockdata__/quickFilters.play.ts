/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ComponentProps } from 'react';
import { QuickFilterManagePermissions } from 'lib/authz/hooks/useAuthZ/permissions/quick-filter.permissions';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { grantsAll } from '@/storybook/access/access';
import { hoverTruncatableText } from '@/storybook/play/truncatedText';
import type { GlobalMockArgs } from '@/storybook/globals';

import type QuickFilters from '../../QuickFilters';
import { longTitleConfig } from '../QuickFilters.stories.mocks';
import { FiltersType } from '../../types';

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

export const hoverTruncatedTitle = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	const [filter] = args.config ?? [];
	// Duration and slider sections render no title of their own.
	if (filter?.type !== FiltersType.CHECKBOX || !filter.title) {
		return;
	}

	const [label] = await within(canvasElement).findAllByText(
		filter.title,
		{},
		UNTIL_LOADED,
	);
	await hoverTruncatableText(label, filter.title, {
		cut: filter.title === longTitleConfig[0].title || undefined,
	});
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
