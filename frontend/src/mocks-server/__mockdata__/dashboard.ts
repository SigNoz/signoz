export const dashboard = {
	status: 'success',
	data: {
		id: 479,
		uuid: 'test-uuid',
		created_at: '2024-07-07T23:25:53.106998513Z',
		created_by: 'test@signoz.io',
		updated_at: '2024-07-07T23:25:54.098025652Z',
		updated_by: 'test@signoz.io',
		data: {
			layout: [
				{
					h: 6,
					i: 'test-id',
					w: 6,
					x: 0,
					y: 0,
				},
			],
			title: 'Sample Title',
			uploadedGrafana: false,
			widgets: [
				{
					description: '',
					id: 'test-id',
					isStacked: false,
					nullZeroValues: '',
					opacity: '',
					panelTypes: 'graph',
					query: {
						builder: {
							queryData: [
								{
									aggregateAttribute: {
										dataType: '',
										id: '------false',
										isColumn: false,
										isJSON: false,
										key: '',
										type: '',
									},
									aggregateOperator: 'count',
									dataSource: 'traces',
									disabled: false,
									expression: 'A',
									filters: {
										items: [],
										op: 'AND',
									},
									functions: [],
									groupBy: [],
									having: [],
									legend: '',
									limit: null,
									orderBy: [
										{
											columnName: 'timestamp',
											order: 'desc',
										},
									],
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
						id: 'test-id-1',
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
					selectedLogFields: [],
					selectedTracesFields: [],
					softMax: null,
					softMin: null,
					timePreferance: 'GLOBAL_TIME',
					title: '',
				},
			],
		},
		isLocked: 0,
	},
};
