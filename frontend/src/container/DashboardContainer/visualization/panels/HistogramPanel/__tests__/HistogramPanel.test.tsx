/* eslint-disable simple-import-sort/imports */
import type { UseQueryResult } from 'react-query';
import { render, screen } from 'tests/test-utils';

import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { Widgets } from 'types/api/dashboard/getAll';
import {
	MetricQueryRangeSuccessResponse,
	MetricRangePayloadProps,
} from 'types/api/metrics/getQueryRange';

import HistogramPanel from '../HistogramPanel';
import { HistogramChartProps } from 'container/DashboardContainer/visualization/charts/types';

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: jest.fn().mockReturnValue({ width: 800, height: 400 }),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: jest.fn().mockReturnValue(false),
}));

jest.mock('providers/Timezone', () => ({
	__esModule: true,
	// Provide a no-op provider component so AllTheProviders can render
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<>{children}</>
	),
	// And mock the hook used by HistogramPanel
	useTimezone: jest.fn().mockReturnValue({
		timezone: { value: 'UTC' },
	}),
}));

jest.mock(
	'container/DashboardContainer/visualization/hooks/useScrollWidgetIntoView',
	() => ({
		useScrollWidgetIntoView: jest.fn(),
	}),
);

jest.mock(
	'container/DashboardContainer/visualization/charts/Histogram/Histogram',
	() => ({
		__esModule: true,
		default: (props: HistogramChartProps): JSX.Element => (
			<div data-testid="histogram-chart">
				<div data-testid="histogram-props">
					{JSON.stringify({
						legendPosition: props.legendConfig?.position,
						isQueriesMerged: props.isQueriesMerged,
						yAxisUnit: props.yAxisUnit,
						decimalPrecision: props.decimalPrecision,
					})}
				</div>
				{props.layoutChildren}
			</div>
		),
	}),
);

jest.mock(
	'container/DashboardContainer/visualization/components/ChartManager/ChartManager',
	() => ({
		__esModule: true,
		default: (): JSX.Element => (
			<div data-testid="chart-manager">ChartManager</div>
		),
	}),
);

function createQueryResponse(
	payloadOverrides: Partial<MetricRangePayloadProps> = {},
): { data: { payload: MetricRangePayloadProps } } {
	const basePayload: MetricRangePayloadProps = {
		data: {
			result: [
				{
					metric: {},
					queryName: 'A',
					legend: 'Series A',
					values: [
						[1, '10'],
						[2, '20'],
					],
				},
			],
			resultType: 'matrix',
			newResult: {
				data: {
					result: [],
					resultType: 'matrix',
				},
			},
		},
	};

	return {
		data: {
			payload: {
				...basePayload,
				...payloadOverrides,
			},
		},
	};
}

type WidgetLike = {
	id: string;
	yAxisUnit: string;
	decimalPrecision: number;
	legendPosition: LegendPosition;
	mergeAllActiveQueries: boolean;
};

function createWidget(overrides: Partial<WidgetLike> = {}): WidgetLike {
	return {
		id: 'widget-id',
		yAxisUnit: 'ms',
		decimalPrecision: 2,
		legendPosition: LegendPosition.BOTTOM,
		mergeAllActiveQueries: false,
		...overrides,
	};
}

describe('HistogramPanel', () => {
	it('renders Histogram when container has dimensions', () => {
		const widget = (createWidget() as unknown) as Widgets;
		const queryResponse = (createQueryResponse() as unknown) as UseQueryResult<
			MetricQueryRangeSuccessResponse,
			Error
		>;

		render(
			<HistogramPanel
				panelMode={PanelMode.DASHBOARD_VIEW}
				widget={widget}
				queryResponse={queryResponse}
				isFullViewMode={false}
				onToggleModelHandler={jest.fn()}
				onDragSelect={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('histogram-chart')).toBeInTheDocument();
	});

	it('passes legend position and other props to Histogram', () => {
		const widget = (createWidget({
			legendPosition: LegendPosition.RIGHT,
		}) as unknown) as Widgets;
		const queryResponse = (createQueryResponse() as unknown) as UseQueryResult<
			MetricQueryRangeSuccessResponse,
			Error
		>;

		render(
			<HistogramPanel
				panelMode={PanelMode.DASHBOARD_VIEW}
				widget={widget}
				queryResponse={queryResponse}
				isFullViewMode={false}
				onToggleModelHandler={jest.fn()}
				onDragSelect={jest.fn()}
			/>,
		);

		const propsJson = screen.getByTestId('histogram-props').textContent || '{}';
		const parsed = JSON.parse(propsJson);

		expect(parsed.legendPosition).toBe(LegendPosition.RIGHT);
		expect(parsed.yAxisUnit).toBe('ms');
		expect(parsed.decimalPrecision).toBe(2);
	});

	it('renders ChartManager in full view when queries are not merged', () => {
		const widget = (createWidget({
			mergeAllActiveQueries: false,
		}) as unknown) as Widgets;
		const queryResponse = (createQueryResponse() as unknown) as UseQueryResult<
			MetricQueryRangeSuccessResponse,
			Error
		>;

		render(
			<HistogramPanel
				panelMode={PanelMode.DASHBOARD_VIEW}
				widget={widget}
				queryResponse={queryResponse}
				isFullViewMode
				onToggleModelHandler={jest.fn()}
				onDragSelect={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('chart-manager')).toBeInTheDocument();
	});

	it('does not render ChartManager when queries are merged', () => {
		const widget = (createWidget({
			mergeAllActiveQueries: true,
		}) as unknown) as Widgets;
		const queryResponse = (createQueryResponse() as unknown) as UseQueryResult<
			MetricQueryRangeSuccessResponse,
			Error
		>;

		render(
			<HistogramPanel
				panelMode={PanelMode.DASHBOARD_VIEW}
				widget={widget}
				queryResponse={queryResponse}
				isFullViewMode
				onToggleModelHandler={jest.fn()}
				onDragSelect={jest.fn()}
			/>,
		);

		expect(screen.queryByTestId('chart-manager')).not.toBeInTheDocument();
	});
});
