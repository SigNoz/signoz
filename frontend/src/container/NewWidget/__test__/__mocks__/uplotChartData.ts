import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export const BarNonStackedChartData = {
	apiResponse: {
		data: {
			result: [
				{
					metric: {
						'service.name': 'recommendationservice',
					},
					values: [
						[1758713940, '33.933'],
						[1758715020, '31.767'],
					],
					queryName: 'A',
					metaData: {
						alias: '__result_0',
						index: 0,
						queryName: 'A',
					},
					legend: '',
				},
				{
					metric: {
						'service.name': 'frontend',
					},
					values: [
						[1758713940, '20.0'],
						[1758715020, '25.0'],
					],
					queryName: 'B',
					metaData: {
						alias: '__result_1',
						index: 1,
						queryName: 'B',
					},
					legend: '',
				},
			],
			resultType: 'time_series',
			newResult: {
				data: {
					resultType: 'time_series',
					result: [
						{
							queryName: 'A',
							legend: '',
							series: [
								{
									labels: {
										'service.name': 'recommendationservice',
									},
									labelsArray: [
										{
											'service.name': 'recommendationservice',
										},
									],
									values: [
										{
											timestamp: 1758713940000,
											value: '33.933',
										},
										{
											timestamp: 1758715020000,
											value: '31.767',
										},
									],
									metaData: {
										alias: '__result_0',
										index: 0,
										queryName: 'A',
									},
								},
							],
							predictedSeries: [],
							upperBoundSeries: [],
							lowerBoundSeries: [],
							anomalyScores: [],
							list: null,
						},
						{
							queryName: 'B',
							legend: '',
							series: [
								{
									labels: {
										'service.name': 'frontend',
									},
									labelsArray: [
										{
											'service.name': 'frontend',
										},
									],
									values: [
										{
											timestamp: 1758713940000,
											value: '20.0',
										},
										{
											timestamp: 1758715020000,
											value: '25.0',
										},
									],
									metaData: {
										alias: '__result_1',
										index: 1,
										queryName: 'B',
									},
								},
							],
							predictedSeries: [],
							upperBoundSeries: [],
							lowerBoundSeries: [],
							anomalyScores: [],
							list: null,
						},
					],
				},
			},
		},
	} as MetricRangePayloadProps,
	fillSpans: false,
	stackedBarChart: false,
};

export const BarStackedChartData = {
	...BarNonStackedChartData,
	stackedBarChart: true,
};

export const TimeSeriesChartData = {
	...BarNonStackedChartData,
	stackedBarChart: false,
};
