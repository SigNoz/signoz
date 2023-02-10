import { PipelineColumnType } from './ListOfPipelines';

export const pipelineData: Array<PipelineColumnType> = [
	{
		orderid: 1,
		uuid: '22a588b8-cccc-4a49-94f1-2caa28271315',
		createdAt: '1674205513092137500',
		createdBy: {
			username: 'nitya',
			email: 'nityananda@signoz.io',
		},
		updatedAt: 'Mon Feb 06 2023',
		updatedBy: {
			username: 'nitya',
			email: '',
		},
		version: 'myversion1',
		name: 'Apache common parser',
		alias: 'apachecommonparser',
		enabled: true,
		filter: 'attributes.source == nginx',
		tags: ['server', 'app'],
		operators: [
			{
				type: 'grok',
				name: 'grok use common',
				id: 'grokusecommon',
				output: 'renameauth',
				pattern: '%{COMMONAPACHELOG}',
				parse_from: 'body',
				parse_to: 'attributes',
			},
			{
				type: 'move',
				name: 'rename auth',
				id: 'renameauth',
				parse_from: 'attributes.auth',
				parse_to: 'attributes.username',
			},
		],
	},
	{
		orderid: 2,
		uuid: 'f58ce70c-5f41-48bc-949d-a822e2409257',
		version: 'myversion1',
		createdAt: '1674205513092137500',
		createdBy: {
			username: 'nitya',
			email: 'nityananda@signoz.io',
		},
		updatedAt: 'Sun Feb 05 2023',
		updatedBy: {
			username: 'nityananda',
			email: '',
		},
		name: 'myservice trace parser',
		alias: 'myservicetraceparser',
		enabled: true,
		filter: 'attributes.source == myservice',
		tags: ['server', 'app'],
		operators: [
			{
				type: 'trace_parser',
				name: 'Parse trace details',
				id: 'parsetracedetails',
				output: 'removeoldxtrace_id',
				trace_id: {
					// Remove the keys if the user left them empty
					parse_from: 'attributes.xtrace_id',
				},
				span_id: {
					// Remove the keys if the user left them empty
					parse_from: 'attributes.xspan_id',
				},
				trace_flags: {
					// Remove the keys if the user left them empty
					parse_from: 'attributes.xtrace_flag',
				},
			},
			{
				type: 'remove',
				name: 'remove old xtrace_id',
				id: 'removeoldxtrace_id',
				field: 'attributes.xtrace_id',
				output: 'removeoldxspan_id',
			},
			{
				type: 'remove',
				name: 'remove old xspan_id',
				id: 'removeoldxspan_id',
				field: 'attributes.xspan_id',
				output: 'removeoldxtrace_flag',
			},
			{
				type: 'remove',
				name: 'remove old xtrace_flag',
				id: 'removeoldxtrace_flag',
				field: 'attributes.xtrace_flag',
			},
		],
	},
];
