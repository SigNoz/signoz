import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ComponentType } from 'react';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { screen, userEvent } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';
import type { GlobalMockArgs } from '@/storybook/globals';

import QuickFilters from './QuickFilters';
import {
	attributeValuesHandler,
	checkboxConfig,
	handlers,
	LONG_FILTER_VALUES,
	loadingFiltersHandlers,
	queryBuilder,
	selectedServiceQueryBuilder,
} from './QuickFilters.stories.mocks';
import { QuickFiltersSource, SignalType } from './types';

const meta = {
	title: 'Components/Quick Filters',
	// `QuickFilters.defaultProps` declares `onFilterChange: null` against a prop
	// typed as an optional function, so the component does not satisfy
	// `ComponentType` as written. The defaults are load-bearing for the jest
	// suite, hence the cast rather than a change to them.
	component: QuickFilters as unknown as ComponentType<
		ComponentProps<typeof QuickFilters>
	>,
	tags: ['play'],
	// The rail the explorers give it (`Explorer.styles.scss`, `.filter`).
	decorators: [withCanvas({ width: 260 })],
	args: {
		config: checkboxConfig,
		handleFilterVisibilityChange: (): void => undefined,
		signal: SignalType.LOGS,
		source: QuickFiltersSource.LOGS_EXPLORER,
	},
	parameters: {
		msw: { handlers },
		signoz: { queryBuilder },
	},
	// The settings announcement covers the panel it points at, and it is a
	// first-run state rather than the panel's own; `SettingsAnnouncement` is the
	// story that keeps it.
	beforeEach: (): void => {
		setLocalStorageKey(LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT, 'false');
	},
} satisfies Meta<typeof QuickFilters>;

export default meta;

type Story = StoryObj<typeof meta>;

type TooltipsStory = StoryObj<
	ComponentProps<typeof QuickFilters> & GlobalMockArgs
>;

/** Interaction: the settings panel is opened through the admin settings control. */
export const SettingsOpen: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(await screen.findByTestId('settings-icon'));
		await screen.findByText('Edit quick filters');
	},
};

/** Mutation: changing the settings list reveals the fixed save and discard footer. */
export const SettingsDirtyFooter: Story = {
	play: async (): Promise<void> => {
		await userEvent.click(await screen.findByTestId('settings-icon'));
		await userEvent.click(await screen.findByRole('button', { name: 'Add' }));
		await screen.findByRole('button', { name: 'Save changes' });
	},
};

/** First run: the one-off announcement pointing an admin at the settings control. */
export const SettingsAnnouncement: Story = {
	beforeEach: (): void => {
		removeLocalStorageKey(LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT);
	},
};

/** Loading: dynamic filters are intentionally left pending to display the panel skeleton. */
export const LoadingFilters: Story = {
	parameters: {
		msw: {
			handlers: loadingFiltersHandlers,
		},
	},
};

/** Empty: a loaded quick-filter configuration with no filters has no result rows. */
export const NoResults: Story = {
	args: { config: [], signal: undefined },
};

/** Selection: an expanded checkbox shows the actual selected service values. */
export const SelectedExpandedCheckbox: Story = {
	args: { signal: undefined },
	parameters: {
		signoz: {
			queryBuilder: selectedServiceQueryBuilder,
		},
	},
};

/**
 * Every tooltip the panel renders, held open: the reveal on each truncated
 * filter value. Nothing bounds those values, so the panel is answered with
 * service names long enough to be cut. The Service name filter carries them, so
 * the signal that would add the workspace's own dynamic filters is left off.
 */
export const Tooltips: TooltipsStory = {
	args: { signal: undefined, tooltipsOpen: true },
	parameters: {
		msw: { handlers: [attributeValuesHandler(LONG_FILTER_VALUES), ...handlers] },
	},
};
