export const entity = [
	{
		title: 'Calls',
		key: 'calls',
		dataindex: 'calls',
	},
	{
		title: 'Duration',
		key: 'duration',
		dataindex: 'duration',
	},
	{
		title: 'Error',
		key: 'error',
		dataindex: 'error',
	},
	{
		title: 'Status Code',
		key: 'status_code',
		dataindex: 'status_code',
	},
];

export const aggregation_options = [
	{
		linked_entity: 'calls',
		default_selected: { title: 'count', dataindex: 'count' },
		options_available: [
			{ title: 'Count', dataindex: 'count' },
			{ title: 'Rate (per sec)', dataindex: 'rate_per_sec' },
		],
	},
	{
		linked_entity: 'duration',
		default_selected: { title: 'p99', dataindex: 'p99' },
		//   options_available: [ {title:'Avg', dataindex:'avg'}, {title:'Max', dataindex:'max'},{title:'Min', dataindex:'min'}, {title:'p50', dataindex:'p50'},{title:'p95', dataindex:'p95'}, {title:'p95', dataindex:'p95'}]
		options_available: [
			{ title: 'p50', dataindex: 'p50' },
			{ title: 'p95', dataindex: 'p95' },
			{ title: 'p99', dataindex: 'p99' },
		],
	},
	{
		linked_entity: 'error',
		default_selected: { title: 'count', dataindex: 'count' },
		options_available: [
			{ title: 'count', dataindex: 'count' },
			{ title: 'Rate (per sec)', dataindex: 'rate_per_sec' },
		],
	},
	{
		linked_entity: 'status_code',
		default_selected: { title: 'count', dataindex: 'count' },
		options_available: [{ title: 'count', dataindex: 'count' }],
	},
];
