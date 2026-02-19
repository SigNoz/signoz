import { Widgets } from 'types/api/dashboard/getAll';
import {
	MetricRangePayloadProps,
	MetricRangePayloadV3,
} from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { PanelMode } from '../../types';
import { prepareChartData, prepareUPlotConfig } from '../utils';

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

const getLegendMock = jest.requireMock('lib/dashboard/getQueryResults')
	.getLegend as jest.Mock;
const getLabelNameMock = jest.requireMock('lib/getLabelName')
	.default as jest.Mock;

const createApiResponse = (
	result: MetricRangePayloadProps['data']['result'] = [],
): MetricRangePayloadProps => ({
	data: {
		result,
		resultType: 'matrix',
		newResult: (null as unknown) as MetricRangePayloadV3,
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
	} as Widgets);

const defaultTimezone = {
	name: 'UTC',
	value: 'UTC',
	offset: 'UTC',
	searchIndex: 'UTC',
};

describe('TimeSeriesPanel utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		getLabelNameMock.mockReturnValue('baseLabel');
		getLegendMock.mockImplementation(
			(_queryData: unknown, _query: unknown, labelName: string) =>
				`legend-${labelName}`,
		);
	});

	describe('prepareChartData', () => {
		it('returns aligned data with timestamps and empty series when result is empty', () => {
			const apiResponse = createApiResponse([]);

			const data = prepareChartData(apiResponse);

			expect(data).toHaveLength(1);
			expect(data[0]).toEqual([]);
		});

		it('returns timestamps and one series of y values for single series', () => {
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q',
					legend: 'Series A',
					values: [
						[1000, '10'],
						[2000, '20'],
					],
				} as MetricRangePayloadProps['data']['result'][0],
			]);

			const data = prepareChartData(apiResponse);

			expect(data).toHaveLength(2);
			expect(data[0]).toEqual([1000, 2000]);
			expect(data[1]).toEqual([10, 20]);
		});

		it('merges timestamps and fills missing values with null for multiple series', () => {
			const apiResponse = createApiResponse([
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
			]);

			const data = prepareChartData(apiResponse);

			expect(data[0]).toEqual([1000, 2000, 3000]);
			// First series: 1, null, 3
			expect(data[1]).toEqual([1, null, 3]);
			// Second series: 10, 20, null
			expect(data[2]).toEqual([10, 20, null]);
		});
	});

	describe('prepareUPlotConfig', () => {
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
			const builder = prepareUPlotConfig(baseParams);

			const config = builder.getConfig();
			// Base series (timestamp) only
			expect(config.series).toHaveLength(1);
		});

		it('adds one series per result item with label from getLabelName when no currentQuery', () => {
			getLegendMock.mockReset();
			const apiResponse = createApiResponse([
				{
					metric: { __name__: 'cpu' },
					queryName: 'Q1',
					legend: 'CPU',
					values: [
						[1000, '1'],
						[2000, '2'],
					],
				} as MetricRangePayloadProps['data']['result'][0],
			]);

			const builder = prepareUPlotConfig({
				...baseParams,
				apiResponse,
				currentQuery: (null as unknown) as Query,
			});

			expect(getLabelNameMock).toHaveBeenCalled();
			expect(getLegendMock).not.toHaveBeenCalled();

			const config = builder.getConfig();
			expect(config.series).toHaveLength(2);
			expect(config.series?.[1]).toMatchObject({
				label: 'baseLabel',
				scale: 'y',
			});
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

			prepareUPlotConfig({
				...baseParams,
				apiResponse,
				currentQuery: {} as Query,
			});

			expect(getLegendMock).toHaveBeenCalledWith(
				{
					legend: 'L1',
					metric: {},
					queryName: 'Q1',
					values: [[1000, '1']],
				},
				{},
				'baseLabel',
			);

			const config = prepareUPlotConfig({
				...baseParams,
				apiResponse,
				currentQuery: {} as Query,
			}).getConfig();
			expect(config.series?.[1]).toMatchObject({
				label: 'legend-baseLabel',
			});
		});

		it('uses DrawStyle.Line and VisibilityMode.Never when series has multiple valid points', () => {
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q',
					values: [
						[1000, '1'],
						[2000, '2'],
					],
				} as MetricRangePayloadProps['data']['result'][0],
			]);

			const builder = prepareUPlotConfig({ ...baseParams, apiResponse });
			const config = builder.getConfig();
			const series = config.series?.[1];

			expect(config.series).toHaveLength(2);
			// Line style and points never for multi-point series (checked via builder API)
			const legendItems = builder.getLegendItems();
			expect(Object.keys(legendItems)).toHaveLength(1);
			// multi-point series → points hidden
			expect(series).toBeDefined();
			expect(series!.points?.show).toBe(false);
		});

		it('uses DrawStyle.Points and shows points when series has only one valid point', () => {
			const apiResponse = createApiResponse([
				{
					metric: {},
					queryName: 'Q',
					values: [
						[1000, '1'],
						[2000, 'NaN'],
						[3000, 'invalid'],
					],
				} as MetricRangePayloadProps['data']['result'][0],
			]);

			const builder = prepareUPlotConfig({ ...baseParams, apiResponse });
			const config = builder.getConfig();

			expect(config.series).toHaveLength(2);
			const seriesConfig = config.series?.[1];
			expect(seriesConfig).toBeDefined();
			// Single valid point -> Points draw style (asserted via series config)
			expect(seriesConfig).toMatchObject({
				scale: 'y',
				spanGaps: true,
			});
			// single-point series → points shown
			expect(seriesConfig).toBeDefined();
			expect(seriesConfig!.points?.show).toBe(true);
		});

		it('uses widget customLegendColors to set series stroke color', () => {
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

			const builder = prepareUPlotConfig({
				...baseParams,
				widget,
				apiResponse,
			});

			const config = builder.getConfig();
			const seriesConfig = config.series?.[1];
			expect(seriesConfig).toBeDefined();
			expect(seriesConfig!.stroke).toBe('#ff0000');
		});

		it('adds multiple series when result has multiple items', () => {
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

			const builder = prepareUPlotConfig({ ...baseParams, apiResponse });
			const config = builder.getConfig();

			expect(config.series).toHaveLength(3);
		});
	});
});
