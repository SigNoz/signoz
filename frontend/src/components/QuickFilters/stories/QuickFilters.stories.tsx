import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ComponentType } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { withCanvas } from '@/storybook/decorators/withCanvas';
import type { GlobalMockArgs } from '@/storybook/globals';

import QuickFilters from '../QuickFilters';
import {
	dirtySettings,
	hoverTruncatedTitle,
	openQueryPicker,
	openSettings,
} from './__story_mockdata__/quickFilters.play';
import {
	checkboxConfig,
	fieldApis,
	fieldValuesHandler,
	handlers,
	LONG_FILTER_VALUES,
	loadingFiltersHandlers,
	longTitleConfig,
	MANY_FILTER_VALUES,
	queryBuilder,
	selectedServiceQueryBuilder,
	noSavedFiltersHandler,
	noSavedTracesFiltersHandler,
} from './QuickFilters.stories.mocks';
import { FiltersType, QuickFiltersSource } from '../types';

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
		quickFilterSource: QuickFiltersSource.LOGS_EXPLORER,
		useFieldApis: fieldApis,
	},
	parameters: {
		msw: { handlers },
		signoz: { queryBuilder },
	},
} satisfies Meta<typeof QuickFilters>;

export default meta;

type Story = StoryObj<typeof meta>;

type GlobalArgsStory = StoryObj<
	ComponentProps<typeof QuickFilters> & GlobalMockArgs
>;

/** Interaction: the settings panel is opened through the admin settings control. */
export const SettingsOpen: GlobalArgsStory = {
	play: openSettings,
};

/** Mutation: changing the settings list reveals the fixed save and discard footer. */
export const SettingsDirtyFooter: GlobalArgsStory = {
	play: dirtySettings,
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
	args: { config: [] },
	parameters: {
		msw: { handlers: [noSavedFiltersHandler, ...handlers] },
	},
};

/** A filter with more values than it lists at first: the value search and Show More. */
export const ShowMoreValues: Story = {
	parameters: {
		msw: {
			handlers: [
				noSavedFiltersHandler,
				fieldValuesHandler(MANY_FILTER_VALUES),
				...handlers,
			],
		},
	},
};

/** A filter whose attribute has no values in the time range. */
export const NoValuesFound: Story = {
	parameters: {
		msw: {
			handlers: [noSavedFiltersHandler, fieldValuesHandler([]), ...handlers],
		},
	},
};

/** Selection: an expanded checkbox shows the actual selected service values. */
export const SelectedExpandedCheckbox: Story = {
	parameters: {
		msw: { handlers: [noSavedFiltersHandler, ...handlers] },
		signoz: {
			queryBuilder: selectedServiceQueryBuilder,
		},
	},
};

/** The duration min/max row, which a checkbox-only config never reaches. */
export const DurationFilter: Story = {
	args: {
		quickFilterSource: QuickFiltersSource.TRACES_EXPLORER,
		config: [
			...checkboxConfig,
			{
				attributeKey: {
					dataType: DataTypes.Float64,
					key: 'duration_nano',
					type: '',
				},
				defaultOpen: true,
				title: 'Duration',
				type: FiltersType.DURATION,
			},
		],
	},
	parameters: {
		msw: { handlers: [noSavedTracesFiltersHandler, ...handlers] },
	},
};

/**
 * Every tooltip the panel renders, held open: the reveal on each truncated
 * filter value. Nothing bounds those values, so the panel is answered with
 * service names long enough to be cut. The Service name filter carries them, so
 * the workspace's own saved filter list is answered empty.
 */
export const Tooltips: GlobalArgsStory = {
	args: { tooltipsOpen: true },
	parameters: {
		msw: {
			handlers: [
				noSavedFiltersHandler,
				fieldValuesHandler(LONG_FILTER_VALUES),
				...handlers,
			],
		},
	},
};

/** A section title too long for the rail: hovering it shows the full title once. */
export const TruncatedTitle: GlobalArgsStory = {
	args: { config: longTitleConfig },
	parameters: {
		msw: { handlers: [noSavedFiltersHandler, ...handlers] },
	},
	play: hoverTruncatedTitle,
};

const [firstQuery] = queryBuilder.currentQuery.builder.queryData;

/** Interaction: the query picker lists every query the filters can follow. */
export const QueryPickerOpen: GlobalArgsStory = {
	parameters: {
		signoz: {
			queryBuilder: {
				...queryBuilder,
				currentQuery: {
					builder: {
						queryData: [
							{ ...firstQuery, queryName: 'A' },
							{ ...firstQuery, queryName: 'B' },
						],
					},
				},
			},
		},
	},
	play: openQueryPicker,
};
