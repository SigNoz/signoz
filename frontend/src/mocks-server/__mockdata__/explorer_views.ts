export const explorerView = {
	status: 'success',
	data: [
		{
			uuid: 'test-uuid-1',
			name: 'Table View',
			category: '',
			createdAt: '2023-08-29T18:04:10.906310033Z',
			createdBy: 'test-user-1',
			updatedAt: '2024-01-29T10:42:47.346331133Z',
			updatedBy: 'test-user-1',
			sourcePage: 'traces',
			tags: [''],
			compositeQuery: {
				builderQueries: {
					A: {
						queryName: 'A',
						stepInterval: 60,
						dataSource: 'traces',
						aggregateOperator: 'count',
						aggregateAttribute: {
							key: 'component',
							dataType: 'string',
							type: 'tag',
							isColumn: true,
							isJSON: false,
						},
						filters: {
							op: 'AND',
							items: [
								{
									key: {
										key: 'component',
										dataType: 'string',
										type: 'tag',
										isColumn: true,
										isJSON: false,
									},
									value: 'test-component',
									op: '!=',
								},
							],
						},
						groupBy: [
							{
								key: 'component',
								dataType: 'string',
								type: 'tag',
								isColumn: true,
								isJSON: false,
							},
							{
								key: 'client-uuid',
								dataType: 'string',
								type: 'resource',
								isColumn: false,
								isJSON: false,
							},
						],
						expression: 'A',
						disabled: false,
						limit: 0,
						offset: 0,
						pageSize: 0,
						orderBy: [
							{
								columnName: 'timestamp',
								order: 'desc',
							},
						],
						reduceTo: 'sum',
						ShiftBy: 0,
					},
				},
				panelType: 'table',
				queryType: 'builder',
			},
			extraData: '{"color":"#00ffd0"}',
		},
		{
			uuid: '58b010b6-8be9-40d1-8d25-f73b5f7314ad',
			name: 'success traces list view',
			category: '',
			createdAt: '2023-08-30T13:00:40.958011925Z',
			createdBy: 'test-email',
			updatedAt: '2024-04-29T13:09:06.175537361Z',
			updatedBy: 'test-email',
			sourcePage: 'traces',
			tags: [''],
			compositeQuery: {
				builderQueries: {
					A: {
						queryName: 'A',
						stepInterval: 60,
						dataSource: 'traces',
						aggregateOperator: 'noop',
						aggregateAttribute: {
							key: '',
							dataType: '',
							type: '',
							isColumn: false,
							isJSON: false,
						},
						filters: {
							op: 'AND',
							items: [
								{
									key: {
										key: 'responseStatusCode',
										dataType: 'string',
										type: 'tag',
										isColumn: true,
										isJSON: false,
									},
									value: '200',
									op: '=',
								},
							],
						},
						expression: 'A',
						disabled: false,
						limit: 0,
						offset: 0,
						pageSize: 0,
						orderBy: [
							{
								columnName: 'timestamp',
								order: 'desc',
							},
						],
						reduceTo: 'sum',
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
						ShiftBy: 0,
					},
				},
				panelType: 'list',
				queryType: 'builder',
			},
			extraData: '{"color":"#bdff9d"}',
		},
	],
};
