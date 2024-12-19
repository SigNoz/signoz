/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { EQueryType } from 'types/common/dashboard';

export const queryRangeSuccessResponse: QueryRangePayload = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				status: 'success',
				data: {
					resultType: '',
					result: [
						{
							queryName: 'D',
							series: [
								{
									labels: {
										service_name: 'Test',
									},
									labelsArray: [
										{
											service_name: 'Test',
										},
									],
									values: [
										{
											timestamp: 1696917600000,
											value: '0',
										},
									],
								},
							],
							list: null,
						},
						{
							queryName: 'F1',
							series: null,
							list: null,
						},
						{
							queryName: 'A',
							series: [
								{
									labels: {
										service_name: 'Test',
									},
									labelsArray: [
										{
											service_name: 'Test',
										},
									],
									values: [
										{
											timestamp: 1696917600000,
											value: 'NaN',
										},
									],
								},
							],
							list: null,
						},
					],
				},
			},
		],
	},
	compositeQuery: {
		builderQueries: undefined,
		chQueries: undefined,
		promQueries: undefined,
		queryType: EQueryType.QUERY_BUILDER,
		panelType: PANEL_TYPES.TIME_SERIES,
	},
	end: 0,
	start: 0,
	step: 0,
};

export const queryRangeForTimeSeries = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				series: [
					{
						labels: {},
						labelsArray: null,
						values: [
							{
								timestamp: 1721378340000,
								value: '3074',
							},
							{
								timestamp: 1721378100000,
								value: '2983',
							},
							{
								timestamp: 1721378040000,
								value: '2978',
							},
							{
								timestamp: 1721378160000,
								value: '2940',
							},
							{
								timestamp: 1721377980000,
								value: '2904',
							},
							{
								timestamp: 1721378280000,
								value: '2874',
							},
							{
								timestamp: 1721378220000,
								value: '2667',
							},
						],
					},
				],
			},
		],
	},
};

export const queryRangeForListView = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				list: [
					{
						timestamp: '2024-07-19T08:39:59.949129915Z',
						data: {
							dbName: '',
							durationNano: 790949390,
							httpMethod: '',
							name: 'authenticate_check_db',
							responseStatusCode: '',
							serviceName: 'demo-app',
							spanID: '5704353737b6778e',
							statusCode: 0,
							traceID: 'a364a8e15af3e9a8c866e0528db8b637',
						},
					},
					{
						timestamp: '2024-07-19T08:39:59.506524482Z',
						data: {
							dbName: '',
							durationNano: 1375203118,
							httpMethod: '',
							name: 'check cart in cache',
							responseStatusCode: '',
							serviceName: 'demo-app',
							spanID: '2134bb1165c928aa',
							statusCode: 0,
							traceID: '7b565bc351bac2a12c004d92d3a809b1',
						},
					},
					{
						timestamp: '2024-07-19T08:39:58.735245Z',
						data: {
							dbName: '',
							durationNano: 55306000,
							httpMethod: 'GET',
							name: 'HTTP GET',
							responseStatusCode: '200',
							serviceName: 'frontend',
							spanID: '772c4d29dd9076ac',
							statusCode: 0,
							traceID: '0000000000000000344ded1387b08a7e',
						},
					},
				],
			},
		],
	},
};

export const queryRangeForTableView = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				series: [
					{
						labels: {},
						labelsArray: null,
						values: [
							{
								timestamp: 1721583834000,
								value: '87798',
							},
						],
					},
				],
			},
		],
	},
};

export const queryRangeForTraceView = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				list: [
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 7245231266,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: '5765b60ba7cc4ddafe8bdaa9c1b4b246',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 7218609120,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: '1593c896d96cc6b2478bb95dcc01e3f5',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 7217156051,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: 'dcd145ed13937795c5e2ee8618ec7e32',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 7054152134,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: 'd9ceed0a6b23ed4b3bff664e2b303382',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 7052324178,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: 'f76f1acc10a9149121c2bf715d1f92c5',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 6998186102,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: '1e3acf6649147117836cfdde66e2bde5',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 6898849195,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: '035b210595493adcef4c7f297a427bb0',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 6829435795,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: '4ae4d4d082fc6d7a20d90ae0b1d0fff1',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 6790765891,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: '7975c032b430ac63479e5d578c1f0edd',
						},
					},
					{
						timestamp: '0001-01-01T00:00:00Z',
						data: {
							span_count: 8,
							'subQuery.durationNano': 6786616927,
							'subQuery.name': 'home',
							'subQuery.serviceName': 'demo-app',
							traceID: 'ce9d3e5d66dbdd41d46d519b615cce52',
						},
					},
				],
			},
		],
	},
};
