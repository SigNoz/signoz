import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2 } from '../QueryBuilderV2';
import QueryProbe from './QueryProbe';

/** The builder's provider reads its starting query from the URL, as every host seeds it. */
const routeWith = (path: string, query: Query): string =>
	`${path}?compositeQuery=${encodeURIComponent(JSON.stringify(query))}`;

const meterQuery: Query = {
	...initialQueriesMap.metrics,
	builder: {
		...initialQueriesMap.metrics.builder,
		queryData: [
			{ ...initialQueriesMap.metrics.builder.queryData[0], source: 'meter' },
		],
	},
};

/** The `compositeQuery` the probe prints for the builder's current state. */
const payloadIn = (canvasElement: HTMLElement): { queries: unknown[] } =>
	JSON.parse(
		within(canvasElement).getByTestId('qb-payload').textContent ?? '{}',
	) as { queries: unknown[] };

const expectFirstQuery = async (
	canvasElement: HTMLElement,
	spec: Record<string, unknown>,
): Promise<void> => {
	await waitFor(() =>
		expect(payloadIn(canvasElement).queries[0]).toMatchObject({
			type: 'builder_query',
			spec: expect.objectContaining(spec),
		}),
	);
};

/**
 * The query builder as each host mounts it: the props come from that host's
 * call site, the starting query from its route. The probe below the builder
 * prints the `query_range` payload its state would send.
 */
const meta = {
	title: 'Components/Query Builder',
	component: QueryBuilderV2,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 1100 })],
	args: { panelType: PANEL_TYPES.TIME_SERIES, version: 'v3' },
	render: (args): JSX.Element => (
		<>
			<QueryBuilderV2 {...args} />
			<QueryProbe />
		</>
	),
} satisfies Meta<typeof QueryBuilderV2>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Logs explorer, graph view: a fixed logs signal with `count()`. */
export const LogsExplorer: Story = {
	args: {
		config: { initialDataSource: DataSource.LOGS, queryVariant: 'static' },
	},
	parameters: {
		signoz: { route: routeWith(ROUTES.LOGS_EXPLORER, initialQueriesMap.logs) },
	},
	play: async ({ canvasElement }) => {
		await expectFirstQuery(canvasElement, {
			signal: 'logs',
			aggregations: [{ expression: 'count()' }],
		});
	},
};

/** Traces explorer: a fixed traces signal, with trace matching offered. */
export const TracesExplorer: Story = {
	args: {
		config: { initialDataSource: DataSource.TRACES, queryVariant: 'static' },
		showTraceOperator: true,
	},
	parameters: {
		signoz: {
			route: routeWith(ROUTES.TRACES_EXPLORER, initialQueriesMap.traces),
		},
	},
	play: async ({ canvasElement }) => {
		await expectFirstQuery(canvasElement, { signal: 'traces' });
	},
};

/** Metrics explorer: a fixed metrics signal, functions hidden. */
export const MetricsExplorer: Story = {
	args: {
		config: { initialDataSource: DataSource.METRICS, queryVariant: 'static' },
		showFunctions: false,
	},
	parameters: {
		signoz: {
			route: routeWith(
				ROUTES.METRICS_EXPLORER_EXPLORER,
				initialQueriesMap.metrics,
			),
		},
	},
	play: async ({ canvasElement }) => {
		await expectFirstQuery(canvasElement, { signal: 'metrics' });
	},
};

/** Meter explorer: metrics read from the meter source. */
export const MeterExplorer: Story = {
	args: {
		config: {
			initialDataSource: DataSource.METRICS,
			queryVariant: 'static',
			signalSource: 'meter',
		},
		showFunctions: false,
	},
	parameters: {
		signoz: { route: routeWith(ROUTES.METER_EXPLORER, meterQuery) },
	},
	play: async ({ canvasElement }) => {
		await expectFirstQuery(canvasElement, { signal: 'metrics', source: 'meter' });
	},
};

/**
 * V2 panel editor: a data-source dropdown per query, several queries,
 * formulas and trace matching.
 */
export const PanelEditor: Story = {
	args: {
		allowedDataSources: [
			TelemetrytypesSignalDTO.logs,
			TelemetrytypesSignalDTO.traces,
			TelemetrytypesSignalDTO.metrics,
		],
		showTraceOperator: true,
		signalSourceChangeEnabled: true,
		savePreviousQuery: true,
	},
	parameters: {
		signoz: {
			route: routeWith('/dashboard/story/panel/story', initialQueriesMap.logs),
		},
	},
	play: async ({ canvasElement }) => {
		await expectFirstQuery(canvasElement, { signal: 'logs' });
		await expect(
			within(canvasElement).getByTestId('query-data-source-selector-0'),
		).toBeVisible();
	},
};

/** Logs alert: a fixed logs signal with functions, as the alert form mounts it. */
export const LogsAlert: Story = {
	args: {
		config: { initialDataSource: DataSource.LOGS, queryVariant: 'static' },
		showFunctions: true,
		signalSourceChangeEnabled: true,
	},
	parameters: {
		signoz: { route: routeWith(ROUTES.ALERTS_NEW, initialQueriesMap.logs) },
	},
	play: async ({ canvasElement }) => {
		await expectFirstQuery(canvasElement, { signal: 'logs' });
	},
};
