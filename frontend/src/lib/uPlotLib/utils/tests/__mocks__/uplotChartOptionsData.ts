import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';

export const inputPropsTimeSeries = {
	id: '',
	dimensions: {
		width: 400,
		height: 288,
	},
	isDarkMode: true,
	apiResponse: {
		data: {
			result: [
				{
					metric: {
						A: 'A',
					},
					values: [
						[1708623120, '122'],
						[1708623180, '112'],
						[1708623240, '106'],
						[1708623300, '106'],
						[1708623360, '116'],
						[1708623420, '110'],
						[1708623480, '110'],
						[1708623540, '114'],
						[1708623600, '114'],
						[1708623660, '118'],
						[1708623720, '110'],
						[1708623780, '112'],
						[1708623840, '116'],
						[1708623900, '104'],
						[1708623960, '106'],
						[1708624020, '120'],
						[1708624080, '110'],
						[1708624140, '112'],
						[1708624200, '110'],
						[1708624260, '112'],
						[1708624320, '110'],
						[1708624380, '112'],
						[1708624440, '108'],
						[1708624500, '110'],
						[1708624560, '114'],
						[1708624620, '104'],
						[1708624680, '122'],
						[1708624740, '112'],
						[1708624800, '104'],
						[1708624860, '90'],
					],
					queryName: 'A',
					legend: 'A',
				},
			],
			resultType: '',
			newResult: {
				status: 'success',
				data: {
					resultType: '',
					result: [
						{
							queryName: 'A',
							series: [
								{
									labels: {
										A: 'A',
									},
									labelsArray: [{ A: 'A' }],
									values: [
										{
											timestamp: 1708623120000,
											value: '122',
										},
										{
											timestamp: 1708623180000,
											value: '112',
										},
										{
											timestamp: 1708623240000,
											value: '106',
										},
										{
											timestamp: 1708623300000,
											value: '106',
										},
										{
											timestamp: 1708623360000,
											value: '116',
										},
										{
											timestamp: 1708623420000,
											value: '110',
										},
										{
											timestamp: 1708623480000,
											value: '110',
										},
										{
											timestamp: 1708623540000,
											value: '114',
										},
										{
											timestamp: 1708623600000,
											value: '114',
										},
										{
											timestamp: 1708623660000,
											value: '118',
										},
										{
											timestamp: 1708623720000,
											value: '110',
										},
										{
											timestamp: 1708623780000,
											value: '112',
										},
										{
											timestamp: 1708623840000,
											value: '116',
										},
										{
											timestamp: 1708623900000,
											value: '104',
										},
										{
											timestamp: 1708623960000,
											value: '106',
										},
										{
											timestamp: 1708624020000,
											value: '120',
										},
										{
											timestamp: 1708624080000,
											value: '110',
										},
										{
											timestamp: 1708624140000,
											value: '112',
										},
										{
											timestamp: 1708624200000,
											value: '110',
										},
										{
											timestamp: 1708624260000,
											value: '112',
										},
										{
											timestamp: 1708624320000,
											value: '110',
										},
										{
											timestamp: 1708624380000,
											value: '112',
										},
										{
											timestamp: 1708624440000,
											value: '108',
										},
										{
											timestamp: 1708624500000,
											value: '110',
										},
										{
											timestamp: 1708624560000,
											value: '114',
										},
										{
											timestamp: 1708624620000,
											value: '104',
										},
										{
											timestamp: 1708624680000,
											value: '122',
										},
										{
											timestamp: 1708624740000,
											value: '112',
										},
										{
											timestamp: 1708624800000,
											value: '104',
										},
										{
											timestamp: 1708624860000,
											value: '90',
										},
									],
								},
							],
							list: null,
						},
					],
				},
			},
		},
	},
	yAxisUnit: 'none',
	minTimeScale: 1708623105,
	maxTimeScale: 1708624905,
	graphsVisibilityStates: [true, true],
	thresholds: [],
	softMax: null,
	softMin: null,
	panelType: PANEL_TYPES.TIME_SERIES,
} as GetUPlotChartOptions;

export const inputPropsBar = {
	id: '',
	dimensions: {
		width: 400,
		height: 288,
	},
	isDarkMode: true,
	apiResponse: {
		data: {
			result: [
				{
					metric: {
						A: 'A',
					},
					values: [
						[1708623120, '122'],
						[1708623180, '112'],
						[1708623240, '106'],
						[1708623300, '106'],
						[1708623360, '116'],
						[1708623420, '110'],
						[1708623480, '110'],
						[1708623540, '114'],
						[1708623600, '114'],
						[1708623660, '118'],
						[1708623720, '110'],
						[1708623780, '112'],
						[1708623840, '116'],
						[1708623900, '104'],
						[1708623960, '106'],
						[1708624020, '120'],
						[1708624080, '110'],
						[1708624140, '112'],
						[1708624200, '110'],
						[1708624260, '112'],
						[1708624320, '110'],
						[1708624380, '112'],
						[1708624440, '108'],
						[1708624500, '110'],
						[1708624560, '114'],
						[1708624620, '104'],
						[1708624680, '122'],
						[1708624740, '112'],
						[1708624800, '104'],
						[1708624860, '90'],
					],
					queryName: 'A',
					legend: 'A',
				},
			],
			resultType: '',
			newResult: {
				status: 'success',
				data: {
					resultType: '',
					result: [
						{
							queryName: 'A',
							series: [
								{
									labels: {
										A: 'A',
									},
									labelsArray: [{ A: 'A' }],
									values: [
										{
											timestamp: 1708623120000,
											value: '122',
										},
										{
											timestamp: 1708623180000,
											value: '112',
										},
										{
											timestamp: 1708623240000,
											value: '106',
										},
										{
											timestamp: 1708623300000,
											value: '106',
										},
										{
											timestamp: 1708623360000,
											value: '116',
										},
										{
											timestamp: 1708623420000,
											value: '110',
										},
										{
											timestamp: 1708623480000,
											value: '110',
										},
										{
											timestamp: 1708623540000,
											value: '114',
										},
										{
											timestamp: 1708623600000,
											value: '114',
										},
										{
											timestamp: 1708623660000,
											value: '118',
										},
										{
											timestamp: 1708623720000,
											value: '110',
										},
										{
											timestamp: 1708623780000,
											value: '112',
										},
										{
											timestamp: 1708623840000,
											value: '116',
										},
										{
											timestamp: 1708623900000,
											value: '104',
										},
										{
											timestamp: 1708623960000,
											value: '106',
										},
										{
											timestamp: 1708624020000,
											value: '120',
										},
										{
											timestamp: 1708624080000,
											value: '110',
										},
										{
											timestamp: 1708624140000,
											value: '112',
										},
										{
											timestamp: 1708624200000,
											value: '110',
										},
										{
											timestamp: 1708624260000,
											value: '112',
										},
										{
											timestamp: 1708624320000,
											value: '110',
										},
										{
											timestamp: 1708624380000,
											value: '112',
										},
										{
											timestamp: 1708624440000,
											value: '108',
										},
										{
											timestamp: 1708624500000,
											value: '110',
										},
										{
											timestamp: 1708624560000,
											value: '114',
										},
										{
											timestamp: 1708624620000,
											value: '104',
										},
										{
											timestamp: 1708624680000,
											value: '122',
										},
										{
											timestamp: 1708624740000,
											value: '112',
										},
										{
											timestamp: 1708624800000,
											value: '104',
										},
										{
											timestamp: 1708624860000,
											value: '90',
										},
									],
								},
							],
							list: null,
						},
					],
				},
			},
		},
	},
	yAxisUnit: 'none',
	minTimeScale: 1708623105,
	maxTimeScale: 1708624905,
	graphsVisibilityStates: [true, true],
	thresholds: [],
	softMax: null,
	softMin: null,
	panelType: PANEL_TYPES.BAR,
} as GetUPlotChartOptions;

export const seriesDataTimeSeries = [
	{
		label: 'Timestamp',
		stroke: 'purple',
	},
	{
		drawStyle: 'line',
		lineInterpolation: 'spline',
		show: true,
		label: 'A',
		stroke: '#6495ED',
		width: 2,
		spanGaps: true,
		points: {
			size: 5,
			show: false,
			stroke: '#6495ED',
		},
	},
];

export const seriesDataBarChart = [
	{
		label: 'Timestamp',
		stroke: 'purple',
	},
	{
		drawStyle: 'bars',
		lineInterpolation: null,
		show: true,
		label: 'A',
		fill: '#6495ED40',
		stroke: '#6495ED',
		width: 2,
		spanGaps: true,
		points: {
			size: 5,
			show: false,
			stroke: '#6495ED',
		},
	},
];
