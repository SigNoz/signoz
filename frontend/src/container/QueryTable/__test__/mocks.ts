/* eslint-disable sonarjs/no-duplicate-string */
export const QueryTableProps: any = {
	props: {
		loading: false,
		size: 'small',
	},
	queryTableData: {
		columns: [
			{
				name: 'resource_host_name',
				queryName: '',
				isValueColumn: false,
			},
			{
				name: 'service_name',
				queryName: '',
				isValueColumn: false,
			},
			{
				name: 'operation',
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
					A: 11.5,
					operation: 'GetDriver',
					resource_host_name: 'test-hs-name',
					service_name: 'redis',
				},
			},
			{
				data: {
					A: 10.13,
					operation: 'HTTP GET',
					resource_host_name: 'test-hs-name',
					service_name: 'frontend',
				},
			},
			{
				data: {
					A: 9.21,
					operation: 'HTTP GET /route',
					resource_host_name: 'test-hs-name',
					service_name: 'route',
				},
			},
			{
				data: {
					A: 9.21,
					operation: 'HTTP GET: /route',
					resource_host_name: 'test-hs-name',
					service_name: 'frontend',
				},
			},
			{
				data: {
					A: 0.92,
					operation: 'HTTP GET: /customer',
					resource_host_name: 'test-hs-name',
					service_name: 'frontend',
				},
			},
			{
				data: {
					A: 0.92,
					operation: 'SQL SELECT',
					resource_host_name: 'test-hs-name',
					service_name: 'mysql',
				},
			},
			{
				data: {
					A: 0.92,
					operation: 'HTTP GET /customer',
					resource_host_name: 'test-hs-name',
					service_name: 'customer',
				},
			},
		],
	},
	query: {
		builder: {
			queryData: [
				{
					aggregateAttribute: {
						dataType: 'float64',
						id: 'signoz_calls_total--float64--Sum--true',
						isColumn: true,
						isJSON: false,
						key: 'signoz_calls_total',
						type: 'Sum',
					},
					aggregateOperator: 'rate',
					dataSource: 'metrics',
					disabled: false,
					expression: 'A',
					filters: {
						items: [],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: 'string',
							id: 'resource_host_name--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'resource_host_name',
							type: 'tag',
						},
						{
							dataType: 'string',
							id: 'service_name--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'service_name',
							type: 'tag',
						},
						{
							dataType: 'string',
							id: 'operation--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'operation',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
				},
			],
			queryFormulas: [],
		},
		clickhouse_sql: [
			{
				disabled: false,
				legend: '',
				name: 'A',
				query: '',
			},
		],
		id: '1e08128f-c6a3-42ff-8033-4e38d291cf0a',
		promql: [
			{
				disabled: false,
				legend: '',
				name: 'A',
				query: '',
			},
		],
		queryType: 'builder',
	},
	columns: [
		{
			dataIndex: 'resource_host_name',
			title: 'resource_host_name',
			width: 145,
		},
		{
			dataIndex: 'service_name',
			title: 'service_name',
			width: 145,
		},
		{
			dataIndex: 'operation',
			title: 'operation',
			width: 145,
		},
		{
			dataIndex: 'A',
			title: 'A',
			width: 145,
		},
	],
	dataSource: [
		{
			A: 11.5,
			operation: 'GetDriver',
			resource_host_name: 'test-hs-name',
			service_name: 'redis',
		},
		{
			A: 10.13,
			operation: 'HTTP GET',
			resource_host_name: 'test-hs-name',
			service_name: 'frontend',
		},
		{
			A: 9.21,
			operation: 'HTTP GET /route',
			resource_host_name: 'test-hs-name',
			service_name: 'route',
		},
		{
			A: 9.21,
			operation: 'HTTP GET: /route',
			resource_host_name: 'test-hs-name',
			service_name: 'frontend',
		},
		{
			A: 0.92,
			operation: 'HTTP GET: /customer',
			resource_host_name: 'test-hs-name',
			service_name: 'frontend',
		},
		{
			A: 0.92,
			operation: 'SQL SELECT',
			resource_host_name: 'test-hs-name',
			service_name: 'mysql',
		},
		{
			A: 0.92,
			operation: 'HTTP GET /customer',
			resource_host_name: 'test-hs-name',
			service_name: 'customer',
		},
	],
	sticky: true,
	searchTerm: '',
};

export const WidgetHeaderProps: any = {
	title: 'Table - Panel',
	widget: {
		bucketCount: 30,
		bucketWidth: 0,
		columnUnits: {},
		description: '',
		fillSpans: false,
		id: 'add65f0d-7662-4024-af51-da567759235d',
		isStacked: false,
		mergeAllActiveQueries: false,
		nullZeroValues: 'zero',
		opacity: '1',
		panelTypes: 'table',
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: 'float64',
							id: 'signoz_calls_total--float64--Sum--true',
							isColumn: true,
							isJSON: false,
							key: 'signoz_calls_total',
							type: 'Sum',
						},
						aggregateOperator: 'rate',
						dataSource: 'metrics',
						disabled: false,
						expression: 'A',
						filters: {
							items: [],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: 'string',
								id: 'resource_host_name--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'resource_host_name',
								type: 'tag',
							},
							{
								dataType: 'string',
								id: 'service_name--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'service_name',
								type: 'tag',
							},
							{
								dataType: 'string',
								id: 'operation--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'operation',
								type: 'tag',
							},
						],
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'avg',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'rate',
					},
				],
				queryFormulas: [],
			},
			clickhouse_sql: [
				{
					disabled: false,
					legend: '',
					name: 'A',
					query: '',
				},
			],
			id: '1e08128f-c6a3-42ff-8033-4e38d291cf0a',
			promql: [
				{
					disabled: false,
					legend: '',
					name: 'A',
					query: '',
				},
			],
			queryType: 'builder',
		},
		selectedLogFields: [
			{
				dataType: 'string',
				name: 'body',
				type: '',
			},
			{
				dataType: 'string',
				name: 'timestamp',
				type: '',
			},
		],
		selectedTracesFields: [
			{
				dataType: 'string',
				id: 'serviceName--string--tag--true',
				isColumn: true,
				isJSON: false,
				key: 'serviceName',
				type: 'tag',
			},
			{
				dataType: 'string',
				id: 'name--string--tag--true',
				isColumn: true,
				isJSON: false,
				key: 'name',
				type: 'tag',
			},
			{
				dataType: 'float64',
				id: 'durationNano--float64--tag--true',
				isColumn: true,
				isJSON: false,
				key: 'durationNano',
				type: 'tag',
			},
			{
				dataType: 'string',
				id: 'httpMethod--string--tag--true',
				isColumn: true,
				isJSON: false,
				key: 'httpMethod',
				type: 'tag',
			},
			{
				dataType: 'string',
				id: 'responseStatusCode--string--tag--true',
				isColumn: true,
				isJSON: false,
				key: 'responseStatusCode',
				type: 'tag',
			},
		],
		softMax: 0,
		softMin: 0,
		stackedBarChart: false,
		thresholds: [],
		timePreferance: 'GLOBAL_TIME',
		title: 'Table - Panel',
		yAxisUnit: 'none',
	},
	parentHover: false,
	queryResponse: {
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
										name: 'resource_host_name',
										queryName: '',
										isValueColumn: false,
									},
									{
										name: 'service_name',
										queryName: '',
										isValueColumn: false,
									},
									{
										name: 'operation',
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
											A: 11.67,
											operation: 'GetDriver',
											resource_host_name: '4f6ec470feea',
											service_name: 'redis',
										},
									},
									{
										data: {
											A: 10.26,
											operation: 'HTTP GET',
											resource_host_name: '4f6ec470feea',
											service_name: 'frontend',
										},
									},
									{
										data: {
											A: 9.33,
											operation: 'HTTP GET: /route',
											resource_host_name: '4f6ec470feea',
											service_name: 'frontend',
										},
									},
									{
										data: {
											A: 9.33,
											operation: 'HTTP GET /route',
											resource_host_name: '4f6ec470feea',
											service_name: 'route',
										},
									},
									{
										data: {
											A: 0.93,
											operation: 'FindDriverIDs',
											resource_host_name: '4f6ec470feea',
											service_name: 'redis',
										},
									},
									{
										data: {
											A: 0.93,
											operation: 'HTTP GET: /customer',
											resource_host_name: '4f6ec470feea',
											service_name: 'frontend',
										},
									},
									{
										data: {
											A: 0.93,
											operation: '/driver.DriverService/FindNearest',
											resource_host_name: '4f6ec470feea',
											service_name: 'driver',
										},
									},
									{
										data: {
											A: 0.93,
											operation: '/driver.DriverService/FindNearest',
											resource_host_name: '4f6ec470feea',
											service_name: 'frontend',
										},
									},
									{
										data: {
											A: 0.93,
											operation: 'SQL SELECT',
											resource_host_name: '4f6ec470feea',
											service_name: 'mysql',
										},
									},
									{
										data: {
											A: 0.93,
											operation: 'HTTP GET /customer',
											resource_host_name: '4f6ec470feea',
											service_name: 'customer',
										},
									},
									{
										data: {
											A: 0.93,
											operation: 'HTTP GET /dispatch',
											resource_host_name: '4f6ec470feea',
											service_name: 'frontend',
										},
									},
									{
										data: {
											A: 0.21,
											operation: 'check_request limit',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
									{
										data: {
											A: 0.21,
											operation: 'authenticate_check_cache',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
									{
										data: {
											A: 0.21,
											operation: 'authenticate_check_db',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
									{
										data: {
											A: 0.21,
											operation: 'authenticate',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
									{
										data: {
											A: 0.21,
											operation: 'check cart in cache',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
									{
										data: {
											A: 0.2,
											operation: 'get_cart',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
									{
										data: {
											A: 0.2,
											operation: 'check cart in db',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
									{
										data: {
											A: 0.2,
											operation: 'home',
											resource_host_name: '',
											service_name: 'demo-app',
										},
									},
								],
							},
						},
					],
				},
			},
			params: {
				start: 1726669030000,
				end: 1726670830000,
				step: 60,
				variables: {},
				formatForWeb: true,
				compositeQuery: {
					queryType: 'builder',
					panelType: 'table',
					fillGaps: false,
					builderQueries: {
						A: {
							aggregateAttribute: {
								dataType: 'float64',
								id: 'signoz_calls_total--float64--Sum--true',
								isColumn: true,
								isJSON: false,
								key: 'signoz_calls_total',
								type: 'Sum',
							},
							aggregateOperator: 'rate',
							dataSource: 'metrics',
							disabled: false,
							expression: 'A',
							filters: {
								items: [],
								op: 'AND',
							},
							functions: [],
							groupBy: [
								{
									dataType: 'string',
									id: 'resource_host_name--string--tag--false',
									isColumn: false,
									isJSON: false,
									key: 'resource_host_name',
									type: 'tag',
								},
								{
									dataType: 'string',
									id: 'service_name--string--tag--false',
									isColumn: false,
									isJSON: false,
									key: 'service_name',
									type: 'tag',
								},
								{
									dataType: 'string',
									id: 'operation--string--tag--false',
									isColumn: false,
									isJSON: false,
									key: 'operation',
									type: 'tag',
								},
							],
							having: [],
							legend: '',
							limit: null,
							orderBy: [],
							queryName: 'A',
							reduceTo: 'avg',
							spaceAggregation: 'sum',
							stepInterval: 60,
							timeAggregation: 'rate',
						},
					},
				},
			},
		},
		dataUpdatedAt: 1726670830710,
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
	},
	headerMenuList: ['view', 'clone', 'delete', 'edit'],
	isWarning: false,
	isFetchingResponse: false,
	tableProcessedDataRef: {
		current: [
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'redis',
				operation: 'GetDriver',
				A: 11.67,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'frontend',
				operation: 'HTTP GET',
				A: 10.26,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'frontend',
				operation: 'HTTP GET: /route',
				A: 9.33,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'route',
				operation: 'HTTP GET /route',
				A: 9.33,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'redis',
				operation: 'FindDriverIDs',
				A: 0.93,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'frontend',
				operation: 'HTTP GET: /customer',
				A: 0.93,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'driver',
				operation: '/driver.DriverService/FindNearest',
				A: 0.93,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'frontend',
				operation: '/driver.DriverService/FindNearest',
				A: 0.93,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'mysql',
				operation: 'SQL SELECT',
				A: 0.93,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'customer',
				operation: 'HTTP GET /customer',
				A: 0.93,
			},
			{
				resource_host_name: '4f6ec470feea',
				service_name: 'frontend',
				operation: 'HTTP GET /dispatch',
				A: 0.93,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'check_request limit',
				A: 0.21,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'authenticate_check_cache',
				A: 0.21,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'authenticate_check_db',
				A: 0.21,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'authenticate',
				A: 0.21,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'check cart in cache',
				A: 0.21,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'get_cart',
				A: 0.2,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'check cart in db',
				A: 0.2,
			},
			{
				resource_host_name: '',
				service_name: 'demo-app',
				operation: 'home',
				A: 0.2,
			},
		],
	},
};
