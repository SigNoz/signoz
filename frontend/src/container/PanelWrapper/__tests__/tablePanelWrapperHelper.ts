export const tablePanelWidgetQuery = {
	id: '727533b0-7718-4f99-a1db-a1875649325c',
	title: '',
	description: '',
	isStacked: false,
	nullZeroValues: 'zero',
	opacity: '1',
	panelTypes: 'table',
	query: {
		clickhouse_sql: [
			{
				name: 'A',
				legend: '',
				disabled: false,
				query: '',
			},
		],
		promql: [
			{
				name: 'A',
				query: '',
				legend: '',
				disabled: false,
			},
		],
		builder: {
			queryData: [
				{
					dataSource: 'metrics',
					queryName: 'A',
					aggregateOperator: 'count',
					aggregateAttribute: {
						key: 'signoz_latency',
						dataType: 'float64',
						type: 'ExponentialHistogram',
						isColumn: true,
						isJSON: false,
						id: 'signoz_latency--float64--ExponentialHistogram--true',
					},
					timeAggregation: '',
					spaceAggregation: 'p90',
					functions: [],
					filters: {
						items: [],
						op: 'AND',
					},
					expression: 'A',
					disabled: false,
					stepInterval: 60,
					having: [],
					limit: null,
					orderBy: [],
					groupBy: [
						{
							key: 'service_name',
							dataType: 'string',
							type: 'tag',
							isColumn: false,
							isJSON: false,
							id: 'service_name--string--tag--false',
						},
					],
					legend: 'latency-per-service',
					reduceTo: 'avg',
				},
			],
			queryFormulas: [],
		},
		id: '7feafec2-a450-4b5a-8897-260c1a9fe1e4',
		queryType: 'builder',
	},
	timePreferance: 'GLOBAL_TIME',
	softMax: null,
	softMin: null,
	selectedLogFields: [
		{
			dataType: 'string',
			type: '',
			name: 'body',
		},
		{
			dataType: 'string',
			type: '',
			name: 'timestamp',
		},
	],
	selectedTracesFields: [
		{
			key: 'serviceName',
			dataType: 'string',
			type: 'tag',
			isColumn: true,
			isJSON: false,
			id: 'serviceName--string--tag--true',
		},
		{
			key: 'name',
			dataType: 'string',
			type: 'tag',
			isColumn: true,
			isJSON: false,
			id: 'name--string--tag--true',
		},
		{
			key: 'durationNano',
			dataType: 'float64',
			type: 'tag',
			isColumn: true,
			isJSON: false,
			id: 'durationNano--float64--tag--true',
		},
		{
			key: 'httpMethod',
			dataType: 'string',
			type: 'tag',
			isColumn: true,
			isJSON: false,
			id: 'httpMethod--string--tag--true',
		},
		{
			key: 'responseStatusCode',
			dataType: 'string',
			type: 'tag',
			isColumn: true,
			isJSON: false,
			id: 'responseStatusCode--string--tag--true',
		},
	],
	yAxisUnit: 'none',
	thresholds: [],
	fillSpans: false,
	columnUnits: {
		A: 'ms',
	},
	bucketCount: 30,
	stackedBarChart: false,
	bucketWidth: 0,
	mergeAllActiveQueries: false,
};

export const tablePanelQueryResponse = {
	status: 'success',
	isLoading: false,
	isSuccess: true,
	isError: false,
	isIdle: false,
	data: {
		statusCode: 200,
		error: null,
		message: 'success',
		payload: {
			status: 'success',
			data: {
				resultType: '',
				result: [
					{
						table: {
							columns: [
								{
									name: 'service_name',
									queryName: '',
									isValueColumn: false,
								},
								{
									name: 'A',
									queryName: 'A',
									isValueColumn: true,
								},
							],
							rows: [
								{
									data: {
										A: 4353.81,
										service_name: 'demo-app',
									},
								},
								{
									data: {
										A: 431.25,
										service_name: 'customer',
									},
								},
								{
									data: {
										A: 431.25,
										service_name: 'mysql',
									},
								},
								{
									data: {
										A: 287.11,
										service_name: 'frontend',
									},
								},
								{
									data: {
										A: 230.02,
										service_name: 'driver',
									},
								},
								{
									data: {
										A: 66.37,
										service_name: 'route',
									},
								},
								{
									data: {
										A: 31.3,
										service_name: 'redis',
									},
								},
							],
						},
					},
				],
			},
		},
		params: {
			start: 1721207225000,
			end: 1721207525000,
			step: 60,
			variables: {},
			formatForWeb: true,
			compositeQuery: {
				queryType: 'builder',
				panelType: 'table',
				fillGaps: false,
				builderQueries: {
					A: {
						dataSource: 'metrics',
						queryName: 'A',
						aggregateOperator: 'count',
						aggregateAttribute: {
							key: 'signoz_latency',
							dataType: 'float64',
							type: 'ExponentialHistogram',
							isColumn: true,
							isJSON: false,
							id: 'signoz_latency--float64--ExponentialHistogram--true',
						},
						timeAggregation: '',
						spaceAggregation: 'p90',
						functions: [],
						filters: {
							items: [],
							op: 'AND',
						},
						expression: 'A',
						disabled: false,
						stepInterval: 60,
						having: [],
						limit: null,
						orderBy: [],
						groupBy: [
							{
								key: 'service_name',
								dataType: 'string',
								type: 'tag',
								isColumn: false,
								isJSON: false,
								id: 'service_name--string--tag--false',
							},
						],
						legend: '',
						reduceTo: 'avg',
					},
				},
			},
		},
	},
	dataUpdatedAt: 1721207526018,
	error: null,
	errorUpdatedAt: 0,
	failureCount: 0,
	errorUpdateCount: 0,
	isFetched: true,
	isFetchedAfterMount: true,
	isFetching: false,
	isRefetching: false,
	isLoadingError: false,
	isPlaceholderData: false,
	isPreviousData: false,
	isRefetchError: false,
	isStale: true,
};
