import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ComponentType } from 'react';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { rest, type RequestHandler } from 'msw';
import { screen, userEvent } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';
import type { GlobalMockArgs } from '@/storybook/globals';
import { fieldKeysResponse } from '@/storybook/msw/__story_mockdata__/fields';

import QuickFilters from './QuickFilters';
import { FiltersType, QuickFiltersSource, SignalType } from './types';

const customFilters = [
	{ name: 'service.name', fieldDataType: 'string', fieldContext: 'resource' },
	{
		name: 'deployment.environment',
		fieldDataType: 'string',
		fieldContext: 'resource',
	},
];

const queryBuilder = {
	currentQuery: {
		builder: {
			queryData: [
				{
					filter: { expression: '' },
					filters: { items: [], op: 'AND' },
					queryName: 'Logs query',
				},
			],
		},
	},
	lastUsedQuery: 0,
	panelType: 'graph',
	redirectWithQueryBuilderData: (): void => undefined,
	setLastUsedQuery: (): void => undefined,
};

const checkboxConfig = [
	{
		attributeKey: {
			dataType: DataTypes.String,
			key: 'service.name',
			type: 'resource',
		},
		defaultOpen: true,
		title: 'Service name',
		type: FiltersType.CHECKBOX,
	},
];

const attributeValuesHandler = (values: string[]): RequestHandler =>
	rest.get(
		'http://localhost/api/v3/autocomplete/attribute_values',
		(_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						boolAttributeValues: null,
						numberAttributeValues: null,
						stringAttributeValues: values,
					},
				}),
			),
	);

const handlers = [
	rest.get('http://localhost/api/v2/quick_filters/logs', (_req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({ status: 'success', data: { filters: customFilters } }),
		),
	),
	rest.get('http://localhost/api/v1/fields/keys', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(fieldKeysResponse(['k8s.namespace.name']))),
	),
	attributeValuesHandler(['checkout', 'frontend', 'payments']),
];

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
			handlers: [
				rest.get('http://localhost/api/v2/quick_filters/logs', (_req, res, ctx) =>
					res(ctx.delay('infinite')),
				),
			],
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
			queryBuilder: {
				...queryBuilder,
				currentQuery: {
					builder: {
						queryData: [
							{
								filter: { expression: '' },
								filters: {
									items: [
										{
											key: {
												dataType: DataTypes.String,
												key: 'service.name',
												type: 'resource',
											},
											op: 'in',
											value: ['checkout', 'payments'],
										},
									],
									op: 'AND',
								},
								queryName: 'Logs query',
							},
						],
					},
				},
			},
		},
	},
};

const LONG_FILTER_VALUES = [
	'checkout-service.production-eu-central-1.svc.cluster.local',
	'payments-authorisation-worker.production-us-east-2.svc.cluster.local',
	'catalog-availability-projector.staging-ap-south-1.svc.cluster.local',
];

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
