import { Widgets } from 'types/api/dashboard/getAll';
import {
	MetricRangePayloadProps,
	MetricRangePayloadV3,
} from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { PanelMode } from '../../types';
import { prepareBarPanelConfig } from '../utils';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';

jest.mock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
	() => ({
		getStoredSeriesVisibility: jest.fn(),
	}),
);

jest.mock('lib/uPlotLib/plugins/onClickPlugin', () => ({
	__esModule: true,
	default: jest.fn().mockReturnValue({ name: 'onClickPlugin' }),
}));

jest.mock('lib/dashboard/getQueryResults', () => ({
	getLegend: jest.fn(
		(_queryData: unknown, _query: unknown, labelName: string) =>
			`legend-${labelName}`,
	),
}));

jest.mock('lib/getLabelName', () => ({
	__esModule: true,
	default: jest.fn(
		(_metric: unknown, _queryName: string, _legend: string) => 'baseLabel',
	),
}));

jest.mock(
	'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils',
	() => ({
		getInitialStackedBands: jest.fn().mockReturnValue([]),
	}),
);

const getLegendMock = jest.requireMock('lib/dashboard/getQueryResults')
	.getLegend as jest.Mock;
const getLabelNameMock = jest.requireMock('lib/getLabelName')
	.default as jest.Mock;
const getInitialStackedBandsMock = jest.requireMock(
	'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils',
).getInitialStackedBands as jest.Mock;

const createApiResponse = (
	result: MetricRangePayloadProps['data']['result'] = [],
): MetricRangePayloadProps => ({
	data: {
		result,
		resultType: 'matrix',
		newResult: null as unknown as MetricRangePayloadV3,
	},
});

const createWidget = (overrides: Partial<Widgets> = {}): Widgets =>
	({
		id: 'widget-1',
		yAxisUnit: 'ms',
		isLogScale: false,
		thresholds: [],
		customLegendColors: {},
		...overrides,
	}) as Widgets;

const defaultTimezone = {
	name: 'UTC',
	value: 'UTC',
	offset: 'UTC',
	searchIndex: 'UTC',
};

describe('BarPanel utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		getLabelNameMock.mockReturnValue('baseLabel');
		getLegendMock.mockImplementation(
			(_queryData: unknown, _query: unknown, labelName: string) =>
				`legend-${labelName}`,
		);
	});

	describe('prepareBarPanelData', () => {
		it('returns aligned data with timestamps and empty series when result is empty', () => {
			const data = prepareChartData(createApiResponse([]));
			expect(data).toHaveLength(1);
			expect(data[0]).toStrictEqual([]);
		});

		it('returns timestamps and one series of y values for single series', () => {
			const data = prepareChartData(
				createApiResponse([
					{
						metric: {},
						queryName: 'Q',
						legend: 'Series A',
						values: [
							[1000, '10'],
							[2000, '20'],
						],
					} as MetricRangePayloadProps['data']['result'][0],
				]),
			);
			expect(data).toHaveLength(2);
			expect(data[0]).toStrictEqual([1000, 2000]);
			expect(data[1]).toStrictEqual([10, 20]);
		});

		it('merges timestamps and fills missing values with null for multiple series', () => {
			const data = prepareChartData(
				createApiResponse([
					{
						metric: {},
						queryName: 'Q1',
						values: [
							[1000, '1'],
							[3000, '3'],
						],
					} as MetricRangePayloadProps['data']['result'][0],
					{
						metric: {},
						queryName: 'Q2',
						values: [
							[1000, '10'],
							[2000, '20'],
						],
					} as MetricRangePayloadProps['data']['result'][0],
				]),
			);
			expect(data[0]).toStrictEqual([1000, 2000, 3000]);
			expect(data[1]).toStrictEqual([1, null, 3]);
			expect(data[2]).toStrictEqual([10, 20, null]);
		});
	});

	describe('prepareBarPanelConfig', () => {
		const baseParams = {
			widget: createWidget(),
			isDarkMode: true,
			currentQuery: {} as Query,
			onClick: jest.fn(),
			onDragSelect: jest.fn(),
			apiResponse: createApiResponse(),
			timezone: defaultTimezone,
			panelMode: PanelMode.DASHBOARD_VIEW,
		};

		it('adds no series when apiResponse has empty result', () => {
			const config = prepareBarPanelConfig(baseParams).getConfig();
			expect(config.series).toHaveLength(1);
		});

		it('adds one series per result item', () => {
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q1',
					values: [[1000, '1']],
				} as MetricRangePayloadProps['data']['result'][0],
				{
					metric: {},
					queryName: 'Q2',
					values: [[1000, '2']],
				} as MetricRangePayloadProps['data']['result'][0],
			]);
			const config = prepareBarPanelConfig({
				...baseParams,
				apiResponse,
			}).getConfig();
			expect(config.series).toHaveLength(3);
		});

		it('uses getLegend for label when currentQuery is provided', () => {
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q1',
					legend: 'L1',
					values: [[1000, '1']],
				} as MetricRangePayloadProps['data']['result'][0],
			]);
			const config = prepareBarPanelConfig({
				...baseParams,
				apiResponse,
				currentQuery: {} as Query,
			}).getConfig();
			expect(getLegendMock).toHaveBeenCalled();
			expect(config.series?.[1]).toMatchObject({ label: 'legend-baseLabel' });
		});

		it('uses getLabelName for label when currentQuery is null', () => {
			getLegendMock.mockReset();
			const apiResponse = createApiResponse([
				{
					metric: { __name__: 'requests' },
					queryName: 'Q1',
					values: [[1000, '1']],
				} as MetricRangePayloadProps['data']['result'][0],
			]);
			prepareBarPanelConfig({
				...baseParams,
				apiResponse,
				currentQuery: null as unknown as Query,
			});
			expect(getLabelNameMock).toHaveBeenCalled();
			expect(getLegendMock).not.toHaveBeenCalled();
		});

		it('passes result metric to each series for cross-panel sync', () => {
			const metric = { host: 'server1', __name__: 'http_requests' };
			const apiResponse = createApiResponse([
				{
					metric,
					queryName: 'Q1',
					values: [[1000, '1']],
				} as MetricRangePayloadProps['data']['result'][0],
			]);
			const config = prepareBarPanelConfig({
				...baseParams,
				apiResponse,
			}).getConfig();
			expect(config.series?.[1]).toMatchObject({ metric });
		});

		it('uses widget customLegendColors for series stroke', () => {
			const widget = createWidget({
				customLegendColors: { 'legend-baseLabel': '#ff0000' },
			});
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q',
					values: [[1000, '1']],
				} as MetricRangePayloadProps['data']['result'][0],
			]);
			const config = prepareBarPanelConfig({
				...baseParams,
				widget,
				apiResponse,
			}).getConfig();
			expect(config.series?.[1]).toMatchObject({ stroke: '#ff0000' });
		});

		it('calls getInitialStackedBands when widget is stackedBarChart', () => {
			const widget = createWidget({ stackedBarChart: true });
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q1',
					values: [[1000, '1']],
				} as MetricRangePayloadProps['data']['result'][0],
				{
					metric: {},
					queryName: 'Q2',
					values: [[1000, '2']],
				} as MetricRangePayloadProps['data']['result'][0],
			]);
			prepareBarPanelConfig({ ...baseParams, widget, apiResponse });
			// seriesCount = result.length + 1 = 3
			expect(getInitialStackedBandsMock).toHaveBeenCalledWith(3);
		});

		it('does not call getInitialStackedBands for non-stacked chart', () => {
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q1',
					values: [[1000, '1']],
				} as MetricRangePayloadProps['data']['result'][0],
			]);
			prepareBarPanelConfig({ ...baseParams, apiResponse });
			expect(getInitialStackedBandsMock).not.toHaveBeenCalled();
		});
	});
});
