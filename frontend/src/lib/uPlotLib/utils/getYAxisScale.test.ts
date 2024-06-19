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
					labelsArray: [],
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

	it('threshold absent, series data absent and softmin and softmax is absent', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: [],
			yAxisUnit: undefined,
			softMin: null,
			softMax: null,
		} as GetYAxisScale);

		expect(result).toEqual({ auto: true });
	});

	it('Threshold absent, series data present softmin and softmax present', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: mockSeriesData,
			yAxisUnit: mockYAxisUnit,
			softMin: mockSoftMin,
			softMax: mockSoftMax,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [5, 30],
		});
	});

	it('Only series data present', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: mockSeriesData,
			yAxisUnit: mockYAxisUnit,
			softMin: null,
			softMax: null,
		} as GetYAxisScale);

		expect(result).toEqual({ auto: true });
	});

	it('Threshold absent, series data present, softmin present and softmax absent', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: mockSeriesData,
			yAxisUnit: mockYAxisUnit,
			softMin: mockSoftMin,
			softMax: null,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [5, 25],
		});
	});

	it('Threshold absent, series data present, softmin absent and softmax present', () => {
		const result = getYAxisScale({
			thresholds: [],
			series: mockSeriesData,
			yAxisUnit: mockYAxisUnit,
			softMin: null,
			softMax: mockSoftMax,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [15, 30],
		});
	});

	it('Threshold present, series absent and softmin and softmax present', () => {
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

	it('Only threshold data present', () => {
		const result = getYAxisScale({
			thresholds: mockThresholds,
			series: [],
			yAxisUnit: mockYAxisUnit,
			softMin: null,
			softMax: null,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [10, 20],
		});
	});

	it('Threshold present, series absent, softmin absent and softmax present', () => {
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

	it('Threshold data present, series data absent, softmin present and softmax absent', () => {
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

	it('Threshold data absent, series absent, softmin and softmax present', () => {
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

	it('All data present', () => {
		const result = getYAxisScale({
			thresholds: mockThresholds,
			series: mockSeriesData,
			yAxisUnit: mockYAxisUnit,
			softMin: mockSoftMin,
			softMax: mockSoftMax,
		} as GetYAxisScale);

		expect(result).toEqual({
			auto: false,
			range: [5, 30],
		});
	});
});
