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
			uuid: '8c4bf492-d54d-4ab2-a8d6-9c1563f46e1f',
			name: 'R-test panel',
			category: '',
			createdAt: '2024-07-01T13:45:57.924686766Z',
			createdBy: 'test-user-test',
			updatedAt: '2024-07-01T13:48:31.032106578Z',
			updatedBy: 'test-user-test',
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
										key: 'httpMethod',
										dataType: 'string',
										type: 'tag',
										isColumn: true,
										isJSON: false,
									},
									value: 'GET',
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
						reduceTo: 'avg',
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
						ShiftBy: 0,
					},
				},
				panelType: 'list',
				queryType: 'builder',
			},
			extraData: '{"color":"#AD7F58"}',
		},
	],
};
