import { PANEL_TYPES } from 'constants/queryBuilder';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { GetYAxisScale, getYAxisScale } from './getYAxisScale';

describe('getYAxisScale', () => {
	const mockThresholds: ThresholdProps[] = [
		{
			index: '1',
			keyIndex: 1,
			thresholdValue: 10,
			thresholdUnit: 'percentunit',
			moveThreshold(dragIndex, hoverIndex): void {
				console.log(dragIndex, hoverIndex);
			},
			selectedGraph: PANEL_TYPES.TIME_SERIES,
		},
		{
			index: '2',
			keyIndex: 2,
			thresholdValue: 20,
			thresholdUnit: 'percentunit',
			moveThreshold(dragIndex, hoverIndex): void {
				console.log(dragIndex, hoverIndex);
			},
			selectedGraph: PANEL_TYPES.TIME_SERIES,
		},
	];

	const mockSeriesData: QueryDataV3[] = [
		{
			list: null,
			queryName: 'Mock Query',
			series: [
				{
					labels: {},
					values: [
						{ timestamp: 1, value: '15' },
						{ timestamp: 2, value: '25' },
					],
				},
			],
		},
	];

	const mockYAxisUnit = 'percentunit';
	const mockSoftMin = 5;
	const mockSoftMax = 30;

	it('should return auto true when no thresholds, no series data, no softMin, and no softMax', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: [],
			yAxisUnit: undefined,
			softMin: null,
			softMax: null,
		} as GetYAxisScale);

		expect(result).toEqual({ auto: true });
	});

	it('should return range configuration based on softMin and softMax when thresholds are absent', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: mockSeriesData,
			yAxisUnit: mockYAxisUnit,
			softMin: mockSoftMin,
			softMax: mockSoftMax,
		} as GetYAxisScale);

		expect(result).toEqual({
			range: {
				min: { soft: mockSoftMin, mode: 2 },
				max: { soft: mockSoftMax, mode: 2 },
			},
		});
	});

	// when thresholds are present and series data is absent and soft min and soft max is present
	it('should return range configuration based on softMin and softMax when thresholds are present and series data is absent', () => {
		const result = getYAxisScale({
			thresholds: mockThresholds,
			series: [],
			yAxisUnit: mockYAxisUnit,
			softMin: mockSoftMin,
			softMax: mockSoftMax,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [5, 30],
		});
	});

	// when thresholds are present and series data is absent and soft min is absent and soft max is present
	it('should return range configuration based on softMin and softMax when thresholds are present and series data is absent', () => {
		const result = getYAxisScale({
			thresholds: mockThresholds,
			series: [],
			yAxisUnit: mockYAxisUnit,
			softMin: null,
			softMax: mockSoftMax,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [10, 30],
		});
	});

	// when thresholds are present and series data is absent and soft min is present and soft max is absent
	it('should return range configuration based on softMin present and softMax is absent when thresholds are present and series data is absent', () => {
		const result = getYAxisScale({
			thresholds: mockThresholds,
			series: [],
			yAxisUnit: mockYAxisUnit,
			softMin: mockSoftMin,
			softMax: null,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [5, 20],
		});
	});

	// When threshold absent and series data is absent and soft min and softmax and present
	it('should return range configuration based on softMin and softMax when thresholds are absent and series data is absent', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: [],
			yAxisUnit: mockYAxisUnit,
			softMin: mockSoftMin,
			softMax: mockSoftMax,
		} as GetYAxisScale);

		expect(result).toEqual({
			range: {
				min: { soft: mockSoftMin, mode: 2 },
				max: { soft: mockSoftMax, mode: 2 },
			},
		});
	});
});
