import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2 } from '../QueryBuilderV2';
import {
	addOnToggles,
	appendToAggregation,
	DEFAULT_ARGS,
	expectFirstQuery,
	PANEL_EDITOR_ARGS,
	PANEL_EDITOR_PATH,
	payloadIn,
	routeWith,
	selectMetric,
} from './QueryBuilderV2.stories.mocks';
import QueryProbe from './QueryProbe';

const METRICS_EXPLORER_ARGS = {
	config: { initialDataSource: DataSource.METRICS, queryVariant: 'static' },
	showFunctions: false,
} as const;

const metricsExplorerRoute = routeWith(
	ROUTES.METRICS_EXPLORER_EXPLORER,
	initialQueriesMap.metrics,
);

/**
 * Builder rules that hold without a backend: which add-ons a panel kind
 * offers, the aggregations a metric type defaults to, and input limits. The
 * probe below the builder prints the payload each play asserts on.
 */
const meta = {
	title: 'Components/Query Builder/Behaviour',
	component: QueryBuilderV2,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 1100 })],
	args: DEFAULT_ARGS,
	render: (args): JSX.Element => (
		<>
			<QueryBuilderV2 {...args} />
			<QueryProbe />
		</>
	),
} satisfies Meta<typeof QueryBuilderV2>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A Value panel offers only the legend add-on. */
export const LogsOnValuePanel: Story = {
	args: { ...PANEL_EDITOR_ARGS, panelType: PANEL_TYPES.VALUE },
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap.logs) },
	},
	play: async ({ canvasElement }) => {
		await waitFor(() =>
			expect(addOnToggles(canvasElement)).toStrictEqual(['legend_format']),
		);
	},
};

/** Metrics on a Table: reduce-to is offered; group by lives in the aggregation row. */
export const MetricsOnTablePanel: Story = {
	args: { ...PANEL_EDITOR_ARGS, panelType: PANEL_TYPES.TABLE },
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap.metrics) },
	},
	play: async ({ canvasElement }) => {
		await waitFor(() =>
			expect(addOnToggles(canvasElement)).toStrictEqual([
				'having',
				'order_by',
				'limit',
				'legend_format',
				'reduce_to',
			]),
		);
	},
};

/** Traces on a time series: every add-on, with group by as a toggle. */
export const TracesOnTimeSeriesPanel: Story = {
	args: PANEL_EDITOR_ARGS,
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap.traces) },
	},
	play: async ({ canvasElement }) => {
		await waitFor(() =>
			expect(addOnToggles(canvasElement)).toStrictEqual([
				'group_by',
				'having',
				'order_by',
				'limit',
				'legend_format',
			]),
		);
	},
};

/** Picking a gauge defaults to avg over time and avg across series. */
export const GaugeMetricDefaults: Story = {
	args: METRICS_EXPLORER_ARGS,
	parameters: { signoz: { route: metricsExplorerRoute } },
	play: async ({ canvasElement }) => {
		await selectMetric(canvasElement, 'container_cpu_utilization');

		await expectFirstQuery(canvasElement, {
			aggregations: [
				expect.objectContaining({
					metricName: 'container_cpu_utilization',
					timeAggregation: 'avg',
					spaceAggregation: 'avg',
				}),
			],
		});
	},
};

/** Picking a histogram defaults to the p90 across series. */
export const HistogramMetricDefaults: Story = {
	args: METRICS_EXPLORER_ARGS,
	parameters: { signoz: { route: metricsExplorerRoute } },
	play: async ({ canvasElement }) => {
		await selectMetric(canvasElement, 'signoz_latency_bucket');

		await expectFirstQuery(canvasElement, {
			aggregations: [
				expect.objectContaining({
					metricName: 'signoz_latency_bucket',
					spaceAggregation: 'p90',
				}),
			],
		});
	},
};

/** A Value panel takes a single aggregation: a second one is not accepted. */
export const ValuePanelTakesOneAggregation: Story = {
	args: { ...PANEL_EDITOR_ARGS, panelType: PANEL_TYPES.VALUE },
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap.logs) },
	},
	play: async ({ canvasElement }) => {
		await expectFirstQuery(canvasElement, {
			aggregations: [{ expression: 'count()' }],
		});

		const { before, after } = appendToAggregation(
			canvasElement,
			', count_distinct(service.name)',
		);
		await expect(after).toBe(before);

		await expectFirstQuery(canvasElement, {
			aggregations: [{ expression: 'count()' }],
		});
		await expect(
			payloadIn(canvasElement).queries[0].spec.aggregations,
		).toHaveLength(1);
	},
};
