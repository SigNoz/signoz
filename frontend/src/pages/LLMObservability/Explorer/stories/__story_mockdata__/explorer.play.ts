/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { LLMExplorerArgs } from '../Explorer.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: LLMExplorerArgs;
}

/** The page fetches before it renders a filter, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** The table drops its header, and the actions in it, when the query fails. */
const showsExplorerActions = (args: LLMExplorerArgs): boolean =>
	!(args.view === ExplorerViews.TABLE && args.dataState === 'error');

/**
 * The quick-filter panel has no test id of its own, and it only mounts once the
 * workspace's filters have answered.
 */
export const selectFirstQuickFilterValue = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const panel = await waitFor(() => {
		const found = canvasElement.querySelector<HTMLElement>('.quick-filters');

		if (!found) {
			throw new Error('Quick filters did not render');
		}

		return found;
	}, untilLoaded);

	const [filter] = await within(panel).findAllByTestId(
		'checkbox-filter-v2',
		undefined,
		untilLoaded,
	);

	const [row] = await within(filter).findAllByTestId(
		/^checkbox-value-row-/,
		undefined,
		untilLoaded,
	);
	const value = row.dataset.testid?.replace('checkbox-value-row-', '');

	// Every value starts selected, so the checkbox only excludes one; the row
	// itself is the "Only" action that narrows the query to a single value.
	await userEvent.click(within(row).getByRole('button'));
	// The rows remount around the new query and regroup into sections, so they
	// are looked up again on every attempt rather than held from before the click.
	await waitFor(async () => {
		const selected = within(filter).getByTestId('section-selected');

		await expect(
			within(selected)
				.getAllByTestId(/^checkbox-value-row-/)
				.map((item) => item.dataset.testid),
		).toEqual([`checkbox-value-row-${value}`]);
	}, untilLoaded);
};

export const openQuickFiltersSettings = async (): Promise<void> => {
	// The settings control renders disabled while its permission check is in
	// flight and is swapped for the enabled one once the check answers, so it is
	// looked up again on every attempt; a click on the disabled one is dropped in
	// silence.
	const control = await waitFor(async () => {
		const settings = screen.getByTestId('settings-icon-container');

		await expect(settings).not.toHaveAttribute('aria-disabled', 'true');

		return settings;
	}, untilLoaded);

	await userEvent.click(control);
	await screen.findByText('Edit quick filters', undefined, untilLoaded);
};

export const dirtyQuickFiltersSettings = async (): Promise<void> => {
	await openQuickFiltersSettings();

	// One Remove per added filter; the first row's is the one clicked.
	const [removeFilter] = await screen.findAllByRole('button', {
		name: 'Remove',
	});

	await userEvent.click(removeFilter);
	await screen.findByRole('button', { name: 'Save changes' });
};

export const openAddToDashboard = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsExplorerActions(args)) {
		return;
	}

	const canvas = within(canvasElement);
	// Disabled until the explorer stages a query, and a click before then is dropped.
	const addToDashboard = await waitFor(async () => {
		const button = canvas.getByTestId('explorer-add-to-dashboard');

		await expect(button).not.toHaveAttribute('aria-disabled', 'true');

		return button;
	}, untilLoaded);

	await expect(canvas.getByTestId('explorer-create-alert')).not.toHaveAttribute(
		'aria-disabled',
		'true',
	);

	await userEvent.click(addToDashboard);
	await screen.findByTestId('export-panel-dialog', undefined, untilLoaded);
};
