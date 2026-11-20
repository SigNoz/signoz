import type { Meta, StoryObj } from '@storybook/react-vite';

import { initialQueriesMap } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

import { QueryBuilderV2 } from '../QueryBuilderV2';
import {
	addFunction,
	addQueryAndFormula,
	collapseAndHideQueries,
	openAggregationSuggestions,
	openDataSourceSelect,
	openGroupBySelect,
	openQueryActions,
	openTimeAggregationSelect,
	openWhereClauseSuggestions,
	typeInvalidWhereClause,
} from './__story_mockdata__/queryBuilderDialog.play';
import * as AddOns from './QueryBuilderV2.addOns.stories';
import * as Behaviour from './QueryBuilderV2.behaviour.stories';
import * as Hosts from './QueryBuilderV2.stories';
import {
	DEFAULT_ARGS,
	PANEL_EDITOR_ARGS,
	PANEL_EDITOR_PATH,
	routeWith,
} from './QueryBuilderV2.stories.mocks';
import QueryProbe from './QueryProbe';
import ViewPanelDialogFrame from './ViewPanelDialogFrame';

/**
 * Every builder variant inside the view panel dialog, on its surface-2 colors:
 * each host and behaviour story, plus the states only a click opens.
 */
const meta = {
	title: 'Components/Query Builder/In View Panel Dialog',
	component: QueryBuilderV2,
	tags: ['play'],
	args: DEFAULT_ARGS,
	render: (args): JSX.Element => (
		<ViewPanelDialogFrame>
			<QueryBuilderV2 {...args} />
			<div hidden>
				<QueryProbe />
			</div>
		</ViewPanelDialogFrame>
	),
} satisfies Meta<typeof QueryBuilderV2>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `story`, its play looking in the body, where the dialog portals. */
const inBody = (story: Story): Story => {
	const { play } = story;

	return play
		? {
				...story,
				play: (context): void | Promise<void> =>
					play({ ...context, canvasElement: document.body }),
			}
		: story;
};

/** The panel editor's builder, as the dialog mounts it, starting from `query`. */
const panelEditor = (query: DataSource): Story => ({
	args: PANEL_EDITOR_ARGS,
	parameters: {
		signoz: { route: routeWith(PANEL_EDITOR_PATH, initialQueriesMap[query]) },
	},
});

export const LogsExplorer: Story = inBody(Hosts.LogsExplorer);
export const TracesExplorer: Story = inBody(Hosts.TracesExplorer);
export const MetricsExplorer: Story = inBody(Hosts.MetricsExplorer);
export const MeterExplorer: Story = inBody(Hosts.MeterExplorer);
export const PanelEditor: Story = inBody(Hosts.PanelEditor);
export const LogsAlert: Story = inBody(Hosts.LogsAlert);

export const AddOnsFewValues: Story = inBody({
	...AddOns.FewValues,
	args: { ...PANEL_EDITOR_ARGS, ...AddOns.FewValues.args },
});
export const AddOnsManyValues: Story = inBody({
	...AddOns.ManyValues,
	args: { ...PANEL_EDITOR_ARGS, ...AddOns.ManyValues.args },
});
export const MetricsFewGroupBy: Story = inBody({
	...AddOns.MetricsFewGroupBy,
	args: { ...PANEL_EDITOR_ARGS, ...AddOns.MetricsFewGroupBy.args },
});
export const MetricsManyGroupBy: Story = inBody({
	...AddOns.MetricsManyGroupBy,
	args: { ...PANEL_EDITOR_ARGS, ...AddOns.MetricsManyGroupBy.args },
});

export const LogsOnValuePanel: Story = inBody(Behaviour.LogsOnValuePanel);
export const MetricsOnTablePanel: Story = inBody(Behaviour.MetricsOnTablePanel);
export const TracesOnTimeSeriesPanel: Story = inBody(
	Behaviour.TracesOnTimeSeriesPanel,
);
export const GaugeMetricDefaults: Story = inBody(Behaviour.GaugeMetricDefaults);
export const HistogramMetricDefaults: Story = inBody(
	Behaviour.HistogramMetricDefaults,
);
export const ValuePanelTakesOneAggregation: Story = inBody(
	Behaviour.ValuePanelTakesOneAggregation,
);

/** Two traces queries and a formula, with trace matching offered. */
export const QueriesAndFormula: Story = {
	...panelEditor(DataSource.TRACES),
	play: addQueryAndFormula,
};

/** One query collapsed, the other hidden from the chart. */
export const CollapsedAndHidden: Story = {
	...panelEditor(DataSource.LOGS),
	play: collapseAndHideQueries,
};

/** A metrics query with a function added. */
export const WithFunction: Story = {
	...panelEditor(DataSource.METRICS),
	args: { ...PANEL_EDITOR_ARGS, showFunctions: true },
	play: addFunction,
};

/** The signal dropdown, open. */
export const DataSourceOpen: Story = {
	...panelEditor(DataSource.LOGS),
	play: openDataSourceSelect,
};

/** The where clause's key suggestions, open. */
export const WhereClauseSuggestions: Story = {
	...panelEditor(DataSource.TRACES),
	play: openWhereClauseSuggestions,
};

/** The where clause flagged invalid. */
export const WhereClauseInvalid: Story = {
	...panelEditor(DataSource.LOGS),
	play: typeInvalidWhereClause,
};

/** The aggregation editor's suggestions, open. */
export const AggregationSuggestions: Story = {
	...panelEditor(DataSource.TRACES),
	play: openAggregationSuggestions,
};

/** A metrics query's time aggregation dropdown, open. */
export const TimeAggregationOpen: Story = {
	...panelEditor(DataSource.METRICS),
	play: openTimeAggregationSelect,
};

/** The group by dropdown, open. */
export const GroupByOpen: Story = {
	...panelEditor(DataSource.TRACES),
	play: openGroupBySelect,
};

/** The query's actions menu, open. */
export const QueryActionsOpen: Story = {
	...panelEditor(DataSource.LOGS),
	play: openQueryActions,
};
