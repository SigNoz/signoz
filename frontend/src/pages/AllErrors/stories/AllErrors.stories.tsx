import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	commitFilter,
	exceptionsMocks,
	openResourceFilter,
	pickSuggestion,
} from './AllErrors.stories.mocks';
import AllErrors from '../index';

type AllErrorsArgs = PageStoryArgs<typeof exceptionsMocks>;

const pageStory = storyMocks(exceptionsMocks, {
	route: ROUTES.ALL_ERROR,
	layout: 'app',
});

/**
 * Exception groups over the period, with the quick filters and the filter panel
 * the explorers share.
 *
 * Route: `/exceptions`.
 */
const meta = {
	title: 'Pages/Exceptions/List',
	tags: ['play'],
	component: AllErrors,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AllErrorsArgs>;

export default meta;

type Story = StoryObj<AllErrorsArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const openQuickFiltersSettings = async (): Promise<void> => {
	// The settings control renders disabled while its permission check is in
	// flight and is swapped for the enabled one once the check answers, so it is
	// looked up again on every attempt; a click on the disabled one is dropped in
	// silence.
	const control = await waitFor(() => {
		const settings = screen.getByTestId('settings-icon-container');

		expect(settings).toBeEnabled();

		return settings;
	}, untilLoaded);

	await userEvent.click(control);
	await screen.findByText('Edit quick filters', undefined, untilLoaded);
};

/**
 * Every exception group in the window: the org's quick filters down the left, the
 * resource filter and the time range above, and the table sorted by application
 * with each type linking to its detail page.
 */
export const Default: Story = {};

/**
 * A workspace with nothing thrown in the window and no quick filters configured,
 * so the table and the filter panel both show their empty states.
 */
export const NoExceptions: Story = {
	args: { exceptions: 0, quickFilters: 0 },
};

/** The query area after the quick-filters panel is collapsed. */
export const FiltersCollapsed: Story = {
	args: { filterPanel: false },
};

/** The table mid-query, with the cancel action the toolbar offers while it runs. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/**
 * What cancelling a running query leaves behind: the table is dropped for a
 * placeholder until Run Query is pressed again.
 */
export const QueryCancelled: Story = {
	args: { dataState: 'loading' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(/cancel/i, undefined, untilLoaded),
		);

		await screen.findByText(/query cancelled/i, undefined, untilLoaded);
	},
};

/** The editable quick-filter settings panel. */
export const QuickFiltersSettings: Story = {
	play: openQuickFiltersSettings,
};

const dirtyQuickFiltersSettings = async (): Promise<void> => {
	await openQuickFiltersSettings();

	// One Remove per added filter; the first row's is the one clicked.
	const [removeFilter] = await screen.findAllByRole('button', {
		name: 'Remove',
	});

	await userEvent.click(removeFilter);
	await screen.findByRole('button', { name: 'Save changes' });
};

/** Settings with an unsaved filter removal and the fixed action footer. */
export const QuickFiltersSettingsDirty: Story = {
	play: dirtyQuickFiltersSettings,
};

/**
 * The same panel with a banner above the shell. The banner takes 48px off the
 * layout, so this is the case where the footer used to be pushed off screen:
 * the panel is sized from the filters pane rather than the viewport, which
 * keeps Save changes reachable.
 */
export const QuickFiltersSettingsWithBanner: Story = {
	args: { banner: 'trial-expiry' },
	play: dirtyQuickFiltersSettings,
};

/**
 * The exception count in the bottom strip, in place of the build version: the
 * rows on the page against the total the count query returns.
 */
export const BottomStrip: Story = {
	args: { bottomStrip: true },
};

/** The resource filter opened: every key the exceptions can be narrowed by. */
export const FilterKeySuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openResourceFilter(canvasElement);
		await screen.findByText('Suggested Filters', undefined, untilLoaded);
	},
};

/** The key list grown past its first rows with the Show all shortcut. */
export const FilterAllKeys: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openResourceFilter(canvasElement);
		await screen.findByText('Show all filter items', undefined, untilLoaded);
		await userEvent.keyboard('{Control>}/{/Control}');
		await screen.findByText('cloud.region', undefined, untilLoaded);
	},
};

/** A partial key: the typed text as a free search, then the keys that match. */
export const FilterPartialKey: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const filter = await openResourceFilter(canvasElement);

		await userEvent.type(within(filter).getByRole('combobox'), 'serv');
		await screen.findByText('service.namespace', undefined, untilLoaded);
	},
};

/** A key picked: the operators the exceptions page allows for it. */
export const FilterOperatorSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openResourceFilter(canvasElement);
		await pickSuggestion('service.name');
		await screen.findByText('Operator for', { exact: false }, untilLoaded);
	},
};

/** A key and an operator picked: the values the key holds. */
export const FilterValueSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openResourceFilter(canvasElement);
		await pickSuggestion('service.name');
		await pickSuggestion('=');
		await screen.findByText('Value(s) for', { exact: false }, untilLoaded);
	},
};

/** Two conditions committed as chips, with the dropdown closed again. */
export const FilterChips: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openResourceFilter(canvasElement);
		await commitFilter('service.name', '=', 'checkout');
		await commitFilter('deployment.environment', '!=', 'staging');
		await userEvent.click(canvasElement.ownerDocument.body);
		await within(canvasElement).findByText(
			'deployment.environment != staging',
			undefined,
			untilLoaded,
		);
	},
};

/**
 * A committed chip clicked to change it: its text goes back into the input,
 * with the dropdown shut until the input is typed into.
 */
export const FilterEditChip: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openResourceFilter(canvasElement);
		await commitFilter('service.name', '=', 'checkout');
		await userEvent.click(
			await within(canvasElement).findByText(
				'service.name = checkout',
				undefined,
				untilLoaded,
			),
		);
		// The select remounts whenever its chips change, so it is looked up again.
		await waitFor(
			() =>
				expect(
					within(within(canvasElement).getByTestId('qb-search-select')).getByRole(
						'combobox',
					),
				).toHaveValue('service.name = checkout'),
			untilLoaded,
		);
	},
};

/** The key list while its request is still in flight. */
export const FilterKeysLoading: Story = {
	args: { filterKeys: 'loading' },
	play: async ({ canvasElement }): Promise<void> => {
		await openResourceFilter(canvasElement);
		await waitFor(
			() =>
				expect(
					document.querySelector('.query-builder-search .ant-spin'),
				).not.toBeNull(),
			untilLoaded,
		);
	},
};
