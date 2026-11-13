import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import { QueryBuilderV2 } from '../QueryBuilderV2';
import {
	metricsFewGroupBy,
	metricsManyGroupBy,
	tracesFewAddOns,
	tracesManyAddOns,
} from './__story_mockdata__/queryBuilderAddOns';
import {
	expectMetricsGroupBy,
	expectTracesAddOnsOpen,
} from './__story_mockdata__/queryBuilderAddOns.play';
import {
	DEFAULT_ARGS,
	PANEL_EDITOR_ARGS,
	PANEL_EDITOR_PATH,
	routeWith,
} from './QueryBuilderV2.stories.mocks';
import QueryProbe from './QueryProbe';

/**
 * The add-ons a query opens with values already set: group by, having, order
 * by, limit and legend format side by side, with one value each and with
 * enough to wrap.
 */
const meta = {
	title: 'Components/Query Builder/Add-ons',
	component: QueryBuilderV2,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 1100 })],
	args: { ...DEFAULT_ARGS, ...PANEL_EDITOR_ARGS },
	render: (args): JSX.Element => (
		<>
			<QueryBuilderV2 {...args} />
			<QueryProbe />
		</>
	),
} satisfies Meta<typeof QueryBuilderV2>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Traces with every add-on open, one value in each. */
export const FewValues: Story = {
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, tracesFewAddOns) },
	},
	play: expectTracesAddOnsOpen(1),
};

/** Traces with every add-on open and filled past one line. */
export const ManyValues: Story = {
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, tracesManyAddOns) },
	},
	play: expectTracesAddOnsOpen(9),
};

/** A histogram grouped by one key, beside the aggregation selects. */
export const MetricsFewGroupBy: Story = {
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, metricsFewGroupBy) },
	},
	play: expectMetricsGroupBy(1),
};

/** A histogram grouped by enough keys to wrap the group-by select. */
export const MetricsManyGroupBy: Story = {
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, metricsManyGroupBy) },
	},
	play: expectMetricsGroupBy(7),
};
