import { Dimensions } from 'hooks/useDimensions';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import onClickPlugin from '../plugins/onClickPlugin';
import tooltipPlugin from '../plugins/tooltipPlugin';
import {
	getUplotDistributionChartOptions,
	DistributionSeriesConfig,
} from './getUplotDistributionChartOptions';

// Mock dependencies
jest.mock('lib/getLabelName', () => ({
	__esModule: true,
	default: jest.fn(
		(_: unknown, queryName: string, legend: string): string =>
			legend || queryName,
	),
}));

jest.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: jest.fn(
		(label: string): string => `#${label.slice(0, 6).padEnd(6, '0')}`,
	),
}));

jest.mock('./getAxes', () => ({
	__esModule: true,
	default: jest.fn((): unknown[] => [
		{
			stroke: 'black',
			grid: { stroke: '#e0e0e0', width: 0.2, show: true },
			ticks: { width: 0.3, show: true },
			gap: 5,
		},
		{
			stroke: 'black',
			grid: { stroke: '#e0e0e0', width: 0.2 },
			ticks: { width: 0.3, show: true },
			values: jest.fn(),
			gap: 5,
			size: jest.fn(),
		},
	]),
}));

jest.mock('../plugins/tooltipPlugin', () => ({
	__esModule: true,
	default: jest.fn((): { hooks: Record<string, never> } => ({ hooks: {} })),
}));

jest.mock('../plugins/onClickPlugin', () => ({
	__esModule: true,
	default: jest.fn((): { hooks: Record<string, never> } => ({ hooks: {} })),
}));

describe('getUplotDistributionChartOptions', () => {
	const mockDimensions: Dimensions = {
		width: 800,
		height: 400,
	};

	const mockSeriesConfigs: DistributionSeriesConfig[] = [
		{ name: 'series1', legend: 'Series 1', queryName: 'A' },
		{ name: 'series2', legend: 'Series 2', queryName: 'B' },
	];

	const mockBucketLabels = ['0-10', '10-20', '20-30'];

	const baseProps = {
		dimensions: mockDimensions,
		isDarkMode: false,
		bucketLabels: mockBucketLabels,
		seriesConfigs: mockSeriesConfigs,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('basic configuration', () => {
		it('should return a valid uPlot options object', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options).toBeDefined();
			expect(options.width).toBe(800);
			expect(options.height).toBe(370); // 400 - 30
			expect(options.padding).toEqual([16, 16, 8, 16]);
		});

		it('should include id when provided', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				id: 'test-chart-id',
			});

			expect(options.id).toBe('test-chart-id');
		});

		it('should include tzDate when provided', () => {
			const tzDate = (ts: number): Date => new Date(ts);
			const options = getUplotDistributionChartOptions({
				...baseProps,
				tzDate,
			});

			expect(options.tzDate).toBe(tzDate);
		});
	});

	describe('axes configuration', () => {
		it('should create axes with bucket label mapping', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.axes).toBeDefined();
			expect(options.axes).toHaveLength(2);
			expect(options.axes?.[0].space).toBe(60);
		});

		it('should map bucket values to labels correctly', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			const xAxisValues = options.axes?.[0].values as (
				u: uPlot,
				vals: number[],
			) => string[];
			const result = xAxisValues({} as uPlot, [0, 1, 2]);

			expect(result).toEqual(['0-10', '10-20', '20-30']);
		});

		it('should handle missing bucket labels gracefully', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			const xAxisValues = options.axes?.[0].values as (
				u: uPlot,
				vals: number[],
			) => string[];
			const result = xAxisValues({} as uPlot, [0, 5, 10]);

			expect(result).toEqual(['0-10', '', '']);
		});
	});

	describe('series configuration', () => {
		it('should create series with bucket series first', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.series).toBeDefined();
			expect(options.series).toHaveLength(3); // 1 bucket + 2 data series
			expect(options.series[0].label).toBe('Bucket');
		});

		it('should apply custom legend colors when provided', () => {
			const customColors = {
				'Series 1': '#FF0000',
				'Series 2': '#00FF00',
			};

			const options = getUplotDistributionChartOptions({
				...baseProps,
				customLegendColors: customColors,
			});

			expect(options.series[1].stroke).toBe('#FF0000');
			expect(options.series[2].stroke).toBe('#00FF00');
		});

		it('should use generated colors when custom colors not provided', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.series[1].stroke).toBeDefined();
			expect(options.series[2].stroke).toBeDefined();
		});

		it('should apply visibility states when provided', () => {
			const visibilityStates = [true, true, false];

			const options = getUplotDistributionChartOptions({
				...baseProps,
				graphsVisibilityStates: visibilityStates,
			});

			expect(options.series[1].show).toBe(true);
			expect(options.series[2].show).toBe(false);
		});

		it('should default to visible when no visibility states provided', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.series[1].show).toBe(true);
			expect(options.series[2].show).toBe(true);
		});
	});

	describe('scales configuration', () => {
		it('should configure x scale for non-time data', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.scales?.x?.time).toBe(false);
		});

		it('should add padding to x scale range', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			const rangeFunc = options.scales?.x?.range as (
				u: uPlot,
				min: number,
				max: number,
			) => [number, number];
			const result = rangeFunc({} as uPlot, 0, 10);

			expect(result).toEqual([-0.5, 10.5]);
		});

		it('should configure linear scale when isLogScale is false', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				isLogScale: false,
			});

			expect(options.scales?.y?.distr).toBe(1);
			expect(options.scales?.y?.log).toBeUndefined();
			expect(options.scales?.y?.auto).toBe(true);
		});

		it('should configure log scale when isLogScale is true', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				isLogScale: true,
			});

			expect(options.scales?.y?.distr).toBe(3);
			expect(options.scales?.y?.log).toBe(10);
			expect(options.scales?.y?.auto).toBe(false);
			expect(options.scales?.y?.range).toBeDefined();
		});
	});

	describe('log scale range calculation', () => {
		it('should calculate range from positive values', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				isLogScale: true,
			});

			const rangeFunc = options.scales?.y?.range as (
				u: uPlot,
				min: number,
				max: number,
			) => [number, number];

			const mockUPlot = ({
				data: [
					[0, 1, 2],
					[10, 100, 1000],
					[5, 50, 500],
				],
			} as unknown) as uPlot;

			const result = rangeFunc(mockUPlot, 0, 1000);

			expect(result[0]).toBe(1); // 10^0
			expect(result[1]).toBe(1000); // 10^3
		});

		it('should return default range when no positive values', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				isLogScale: true,
			});

			const rangeFunc = options.scales?.y?.range as (
				u: uPlot,
				min: number,
				max: number,
			) => [number, number];

			const mockUPlot = ({
				data: [
					[0, 1, 2],
					[0, 0, 0],
					[-5, -10, -15],
				],
			} as unknown) as uPlot;

			const result = rangeFunc(mockUPlot, 0, 0);

			expect(result).toEqual([0.1, 100]);
		});

		it('should handle empty data arrays', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				isLogScale: true,
			});

			const rangeFunc = options.scales?.y?.range as (
				u: uPlot,
				min: number,
				max: number,
			) => [number, number];

			const mockUPlot = ({
				data: [[0, 1, 2]],
			} as unknown) as uPlot;

			const result = rangeFunc(mockUPlot, 0, 0);

			expect(result).toEqual([0.1, 100]);
		});
	});

	describe('cursor configuration', () => {
		it('should enable cursor by default', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.cursor?.show).toBe(true);
			expect(options.cursor?.points?.show).toBe(false);
		});

		it('should enable drag when onBucketZoom is provided', () => {
			const onBucketZoom = jest.fn();
			const options = getUplotDistributionChartOptions({
				...baseProps,
				onBucketZoom,
			});

			expect(options.cursor?.drag?.x).toBe(true);
			expect(options.cursor?.drag?.y).toBe(false);
		});

		it('should not enable drag when onBucketZoom is not provided', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.cursor?.drag).toBeUndefined();
		});
	});

	describe('legend configuration', () => {
		it('should enable legend', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.legend?.show).toBe(true);
			expect(options.legend?.live).toBe(false);
		});
	});

	describe('hooks configuration', () => {
		it('should not add ready hook when setGraphsVisibilityStates is not provided', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.hooks?.ready).toBeUndefined();
		});

		it('should add ready hook when setGraphsVisibilityStates is provided', () => {
			const setGraphsVisibilityStates = jest.fn();
			const options = getUplotDistributionChartOptions({
				...baseProps,
				graphsVisibilityStates: [true, true, false],
				setGraphsVisibilityStates,
			});

			expect(options.hooks?.ready).toBeDefined();
			expect(options.hooks?.ready).toHaveLength(1);
		});

		it('should not add setSelect hook when onBucketZoom is not provided', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.hooks?.setSelect).toBeUndefined();
		});

		it('should add setSelect hook when onBucketZoom is provided', () => {
			const onBucketZoom = jest.fn();
			const options = getUplotDistributionChartOptions({
				...baseProps,
				onBucketZoom,
			});

			expect(options.hooks?.setSelect).toBeDefined();
			expect(options.hooks?.setSelect).toHaveLength(1);
		});
	});

	describe('plugins configuration', () => {
		it('should include tooltip and onClick plugins', () => {
			const options = getUplotDistributionChartOptions(baseProps);

			expect(options.plugins).toBeDefined();
			expect(options.plugins).toHaveLength(2);
		});

		it('should pass apiResponse to plugins when provided', () => {
			const mockApiResponse = ({
				data: {
					result: [],
					resultType: 'matrix',
					newResult: { data: { result: [] } },
				},
			} as unknown) as MetricRangePayloadProps;
			getUplotDistributionChartOptions({
				...baseProps,
				apiResponse: mockApiResponse,
			});

			expect(tooltipPlugin).toHaveBeenCalledWith(
				expect.objectContaining({
					apiResponse: mockApiResponse,
					isDistributionChart: true,
					bucketLabels: mockBucketLabels,
				}),
			);

			expect(onClickPlugin).toHaveBeenCalledWith(
				expect.objectContaining({
					apiResponse: mockApiResponse,
				}),
			);
		});

		it('should use custom onClickHandler when provided', () => {
			const onClickHandler = jest.fn();
			getUplotDistributionChartOptions({
				...baseProps,
				onClickHandler,
			});

			expect(onClickPlugin).toHaveBeenCalledWith(
				expect.objectContaining({
					onClick: onClickHandler,
				}),
			);
		});
	});

	describe('edge cases', () => {
		it('should handle empty seriesConfigs', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				seriesConfigs: [],
			});

			expect(options.series).toHaveLength(1); // Only bucket series
		});

		it('should handle empty bucketLabels', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				bucketLabels: [],
			});

			const xAxisValues = options.axes?.[0].values as (
				u: uPlot,
				vals: number[],
			) => string[];
			const result = xAxisValues({} as uPlot, [0, 1, 2]);

			expect(result).toEqual(['', '', '']);
		});

		it('should handle dark mode', () => {
			const options = getUplotDistributionChartOptions({
				...baseProps,
				isDarkMode: true,
			});

			expect(options).toBeDefined();
			// Dark mode affects color generation, which is mocked
		});
	});
});
