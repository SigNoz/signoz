import { PipelineColumn } from '../PipelineListsView/types';

export const configurationVerison = '1.0';

export const pipelineMockData: Array<PipelineColumn> = [
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
				id: '1',
				type: 'grok',
				name: 'grok use common',
				output: 'grokcommon',
				pattern: '%{COMMONAPACHELOG}',
				parse_from: 'body',
				parse_to: 'attributes',
			},
			{
				id: '2',
				type: 'move',
				name: 'rename auth',
				output: 'renameauth',
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
		tags: ['server', 'app', 'host', 'realse'],
		operators: [
			{
				id: '1',
				type: 'trace_parser',
				name: 'Parse trace details',
				output: 'removeoldxtrace_id',
				trace_id: {
					parse_from: 'attributes.xtrace_id',
				},
				span_id: {
					parse_from: 'attributes.xspan_id',
				},
				trace_flags: {
					parse_from: 'attributes.xtrace_flag',
				},
			},
			{
				id: '2',
				type: 'remove',
				name: 'remove old xtrace_id',
				output: 'removeoldxspan_id',
				field: 'attributes.xtrace_id',
			},
			{
				id: '3',
				type: 'remove',
				name: 'remove old xspan_id',
				output: 'removeoldxtrace_flag',
				field: 'attributes.xspan_id',
			},
			{
				id: '4',
				type: 'remove',
				name: 'remove old xtrace_flag',
				output: 'removeoldxtrace_flag',
				field: 'attributes.xtrace_flag',
			},
		],
	},
];
