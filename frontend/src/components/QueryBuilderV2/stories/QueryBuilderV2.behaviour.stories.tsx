import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2 } from '../QueryBuilderV2';
import {
	expectGaugeDefaults,
	expectHistogramDefaults,
	expectSingleAggregation,
	expectTablePanelAddOns,
	expectTimeSeriesAddOns,
	expectValuePanelAddOns,
} from './__story_mockdata__/queryBuilder.play';
import {
	DEFAULT_ARGS,
	PANEL_EDITOR_ARGS,
	PANEL_EDITOR_PATH,
	routeWith,
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
	play: expectValuePanelAddOns,
};

/** Metrics on a Table: reduce-to is offered; group by lives in the aggregation row. */
export const MetricsOnTablePanel: Story = {
	args: { ...PANEL_EDITOR_ARGS, panelType: PANEL_TYPES.TABLE },
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap.metrics) },
	},
	play: expectTablePanelAddOns,
};

/** Traces on a time series: every add-on, with group by as a toggle. */
export const TracesOnTimeSeriesPanel: Story = {
	args: PANEL_EDITOR_ARGS,
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap.traces) },
	},
	play: expectTimeSeriesAddOns,
};

/** Picking a gauge defaults to avg over time and avg across series. */
export const GaugeMetricDefaults: Story = {
	args: METRICS_EXPLORER_ARGS,
	parameters: { signoz: { route: metricsExplorerRoute } },
	play: expectGaugeDefaults,
};

/** Picking a histogram defaults to the p90 across series. */
export const HistogramMetricDefaults: Story = {
	args: METRICS_EXPLORER_ARGS,
	parameters: { signoz: { route: metricsExplorerRoute } },
	play: expectHistogramDefaults,
};

/** A Value panel takes a single aggregation: a second one is not accepted. */
export const ValuePanelTakesOneAggregation: Story = {
	args: { ...PANEL_EDITOR_ARGS, panelType: PANEL_TYPES.VALUE },
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap.logs) },
	},
	play: expectSingleAggregation,
};
