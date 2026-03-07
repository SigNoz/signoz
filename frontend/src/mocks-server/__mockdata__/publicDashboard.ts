import { ReduceOperators } from 'types/common/queryBuilder';

export const publishedPublicDashboardMeta = {
	status: 'success',
	data: {
		timeRangeEnabled: true,
		defaultTimeRange: '30m',
		publicPath: '/public/dashboard/019ac98e-383f-7e9f-b716-d15bcb6be4bb',
	},
};

export const unpublishedPublicDashboardMeta = {
	status: 'error',
	error: {
		code: 'public_dashboard_not_found',
		message:
			"dashboard with id 019ac4e8-1a35-718e-aa4b-0c9781d7a31c isn't public",
	},
};

export const publicDashboardResponse = {
	status: 'success',
	data: {
		dashboard: {
			createdAt: '0001-01-01T00:00:00Z',
			updatedAt: '0001-01-01T00:00:00Z',
			createdBy: '',
			updatedBy: '',
			id: '',
			data: {
				description: '',
				image:
					'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0Ljk0OTQgMTMuOTQyQzE2LjIzMTggMTIuNDI1OCAxNy4zMjY4IDkuNzAyMiAxNi4xOTU2IDYuNTc0ODdDMTUuNjQ0MyA1LjA1MjQ1IDE1LjAyMTkgNC4yMDI0OSAxNC4yOTY5IDMuNjYyNTJDMTMuODU1NyAzLjMzMzc5IDEyLjA5MzMgMi41MDYzMyA5Ljc1OTY1IDIuODY3NTZDOC4wNTM0OSAzLjEzMjU1IDUuNzc0ODcgNC4yMDg3NCA0LjI5MzY5IDUuOTU5OUMyLjg1NzUyIDcuNjYxMDYgMS43NDg4MyA5LjAwNDc0IDEuNjk3NTggMTAuMzA5N0MxLjYzMTMzIDExLjk4ODMgMi44OTYyNyAxMy40MzA4IDMuMDUwMDEgMTMuNjY0NUMzLjMyMzc0IDE0LjA3OTUgNS4xOTExNSAxNi40NTE4IDguNjk5NzEgMTYuNTczMUMxMS43OTcgMTYuNjc5MyAxMy44MTQ0IDE1LjI4NDQgMTQuOTQ5NCAxMy45NDJaIiBmaWxsPSIjNDAzRDNFIi8+CjxwYXRoIGQ9Ik00LjU1MzYzIDIuNzM3NDdDMi45Mzc0NiAzLjg5MTE2IDEuMTIxMzEgNi4yNTEwMyAxLjQ0NzU0IDkuNTYwODZDMS42MDYyOCAxMS4xNzIgMi4wMDI1MSAxMi4xNDk1IDIuNTcxMjMgMTIuODUwN0MyLjkxNzQ2IDEzLjI3ODIgNC40MTk4OCAxNC41NDkzIDYuNzczNTEgMTQuNzM2OEM5LjE0NTg4IDE0LjkyNTYgMTAuOTQ5NSAxNC4zOTQ0IDEyLjgzMzIgMTMuMDg0NEMxNi42NjE3IDEwLjQyMDggMTYuMDk4IDYuMzkzNTMgMTUuOTM0MyA1LjkyNDhDMTUuNzcwNSA1LjQ1NjA3IDE0LjU0NDQgMi42OTYyMiAxMS4xNzMzIDEuNzE1MDJDOC4xOTg0NCAwLjg1MDA2OCA1Ljk4MzU1IDEuNzE1MDIgNC41NTM2MyAyLjczNzQ3WiIgZmlsbD0iIzVFNjM2NyIvPgo8cGF0aCBkPSJNNy4zOTM1MyAyLjk2MTA5QzUuNjE3MzcgMi44OTczNCAzLjkxOTk2IDQuMjg4NTIgMy43NTYyMiA2LjAwNTkzQzMuNTkyNDggNy43MjIwOSA0LjY1NDkyIDkuMDI5NTIgNi4zMDk4MyA5LjI5NTc2QzcuOTY0NzUgOS41NjA3NCA5Ljg3ODM5IDguNTU1OCAxMC4yNjM0IDYuNDUwOTFDMTAuNjYwOSA0LjI4MjI3IDkuMDg5NjkgMy4wMjIzNCA3LjM5MzUzIDIuOTYxMDlaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNy45NDIxNyA1LjkwMTE1QzcuOTQyMTcgNS45MDExNSA4LjM2OTY1IDUuODEyNCA4LjQ1NDY1IDUuMTgyNDRDOC41MzgzOSA0LjU2MjQ3IDguMjMwOTEgNC4wMzM3NSA3LjUxMzQ1IDMuODQzNzZDNi43MzM0OSAzLjYzNzUyIDYuMjA0NzcgNC4wNjYyNSA2LjA2NzI3IDQuNTE3NDdDNS44NzYwMyA1LjE0NDk0IDYuMTU4NTIgNS40NDM2NyA2LjE1ODUyIDUuNDQzNjdDNi4xNTg1MiA1LjQ0MzY3IDUuMzkzNTYgNS42Mjc0MSA1LjMzMjMxIDYuNTI5ODdDNS4yNzQ4MSA3LjM4MTA3IDUuODU2MDMgNy44Mzg1NSA2LjQzOTc1IDcuOTc4NTRDNy4xNjA5NiA4LjE1MjI4IDcuOTc4NDIgNy45NTQ3OSA4LjE3ODQxIDcuMDM0ODRDOC4zNDQ2NSA2LjI3NzM4IDcuOTQyMTcgNS45MDExNSA3Ljk0MjE3IDUuOTAxMTVaIiBmaWxsPSIjMzAzMDMwIi8+CjxwYXRoIGQ9Ik02LjczOTgzIDQuNzUzNjJDNi42NzEwOSA1LjAxMjM1IDYuODA4NTggNS4yNjIzNCA3LjA3ODU3IDUuMzMxMDlDNy4zNjk4IDUuNDA0ODMgNy42MzQ3OSA1LjMwODU5IDcuNzA2MDMgNS4wMTExQzcuNzY4NTMgNC43NDczNyA3LjY0MzU0IDQuNTE0ODggNy4zMzYwNSA0LjQzOTg4QzcuMDgzNTcgNC4zNzczOSA2LjgxNDgzIDQuNDcxMTMgNi43Mzk4MyA0Ljc1MzYyWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTYuOTU5NzggNi4wMzk3NEM2LjYzMjMgNS45Mzg0OSA2LjE5OTgyIDYuMDY0NzMgNi4xMzEwNyA2LjUwNDcxQzYuMDYyMzMgNi45NDQ2OSA2LjMyNjA2IDcuMTY5NjggNi42NzEwNCA3LjIzMjE3QzcuMDE2MDMgNy4yOTQ2NyA3LjM0MjI2IDcuMTEzNDMgNy40MDYwMSA2Ljc2MDk1QzcuNDY4NSA2LjQwOTcyIDcuMjg2MDEgNi4xMzk3MyA2Ljk1OTc4IDYuMDM5NzRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
				layout: [
					{
						h: 6,
						i: '86590b60-8232-4b41-9744-32cadf2c95fb',
						moved: false,
						static: false,
						w: 6,
						x: 0,
						y: 0,
					},
				],
				panelMap: {},
				tags: [],
				title: 'Public Dashboard 02',
				uploadedGrafana: false,
				version: 'v5',
				widgets: [
					{
						bucketCount: 30,
						bucketWidth: 0,
						columnUnits: {},
						contextLinks: {
							linksData: [],
						},
						customLegendColors: {},
						decimalPrecision: 2,
						description: '',
						fillSpans: false,
						id: '86590b60-8232-4b41-9744-32cadf2c95fb',
						isLogScale: false,
						legendPosition: 'bottom',
						mergeAllActiveQueries: false,
						nullZeroValues: 'zero',
						opacity: '1',
						panelTypes: 'graph',
						query: {
							builder: {
								queryData: [
									{
										aggregations: [
											{
												metricName: 'container.cpu.time',
												reduceTo: ReduceOperators.AVG,
												spaceAggregation: 'sum',
												temporality: '',
												timeAggregation: 'rate',
											},
										],
										dataSource: 'metrics',
										expression: 'A',
										groupBy: [],
										legend: '',
										queryName: 'A',
									},
								],
								queryFormulas: [],
								queryTraceOperator: [],
							},
							clickhouse_sql: [
								{
									legend: '',
									name: 'A',
								},
							],
							promql: [
								{
									legend: '',
									name: 'A',
								},
							],
							queryType: 'builder',
						},
						selectedLogFields: [
							{
								dataType: '',
								fieldContext: 'log',
								fieldDataType: '',
								isIndexed: false,
								name: 'timestamp',
								signal: 'logs',
								type: 'log',
							},
							{
								dataType: '',
								fieldContext: 'log',
								fieldDataType: '',
								isIndexed: false,
								name: 'body',
								signal: 'logs',
								type: 'log',
							},
						],
						selectedTracesFields: [
							{
								fieldContext: 'resource',
								fieldDataType: 'string',
								name: 'service.name',
								signal: 'traces',
							},
							{
								fieldContext: 'span',
								fieldDataType: 'string',
								name: 'name',
								signal: 'traces',
							},
							{
								fieldContext: 'span',
								fieldDataType: '',
								name: 'duration_nano',
								signal: 'traces',
							},
							{
								fieldContext: 'span',
								fieldDataType: '',
								name: 'http_method',
								signal: 'traces',
							},
							{
								fieldContext: 'span',
								fieldDataType: '',
								name: 'response_status_code',
								signal: 'traces',
							},
						],
						softMax: 0,
						softMin: 0,
						stackedBarChart: false,
						thresholds: [],
						timePreferance: 'GLOBAL_TIME',
						title: '',
						yAxisUnit: 'none',
					},
				],
			},
			locked: false,
			org_id: '00000000-0000-0000-0000-000000000000',
		},
		publicDashboard: {
			timeRangeEnabled: true,
			defaultTimeRange: '30m',
			publicPath: '/public/dashboard/019ad04e-8591-7013-879b-a2af376e4708',
		},
	},
};

export const publicDashboardWidgetData = {
	status: 'success',
	data: {
		type: 'time_series',
		meta: {
			rowsScanned: 367490,
			bytesScanned: 2977076,
			durationMs: 330,
		},
		data: {
			results: [
				{
					queryName: 'A',
					aggregations: [
						{
							index: 0,
							alias: '__result_0',
							meta: {},
							series: [
								{
									values: [
										{
											timestamp: 1764429600000,
											partial: true,
											value: 1.554,
										},
										{
											timestamp: 1764429660000,
											value: 1.367,
										},
										{
											timestamp: 1764429720000,
											value: 1.641,
										},
										{
											timestamp: 1764429780000,
											value: 1.455,
										},
										{
											timestamp: 1764429840000,
											value: 1.739,
										},
										{
											timestamp: 1764429900000,
											value: 1.318,
										},
										{
											timestamp: 1764429960000,
											value: 1.813,
										},
										{
											timestamp: 1764430020000,
											value: 1.332,
										},
										{
											timestamp: 1764430080000,
											value: 1.521,
										},
										{
											timestamp: 1764430140000,
											value: 1.461,
										},
										{
											timestamp: 1764430200000,
											value: 1.61,
										},
										{
											timestamp: 1764430260000,
											value: 1.747,
										},
										{
											timestamp: 1764430320000,
											value: 1.51,
										},
										{
											timestamp: 1764430380000,
											value: 1.501,
										},
										{
											timestamp: 1764430440000,
											value: 1.524,
										},
										{
											timestamp: 1764430500000,
											value: 1.648,
										},
										{
											timestamp: 1764430560000,
											value: 1.545,
										},
										{
											timestamp: 1764430620000,
											value: 1.47,
										},
										{
											timestamp: 1764430680000,
											value: 1.582,
										},
										{
											timestamp: 1764430740000,
											value: 1.257,
										},
										{
											timestamp: 1764430800000,
											value: 1.726,
										},
										{
											timestamp: 1764430860000,
											value: 1.482,
										},
										{
											timestamp: 1764430920000,
											value: 1.291,
										},
										{
											timestamp: 1764430980000,
											value: 1.741,
										},
										{
											timestamp: 1764431040000,
											value: 1.591,
										},
										{
											timestamp: 1764431100000,
											value: 1.609,
										},
										{
											timestamp: 1764431160000,
											value: 1.177,
										},
										{
											timestamp: 1764431220000,
											value: 1.699,
										},
										{
											timestamp: 1764431280000,
											value: 1.617,
										},
										{
											timestamp: 1764431340000,
											value: 1.515,
										},
									],
								},
							],
						},
					],
				},
			],
		},
	},
};
