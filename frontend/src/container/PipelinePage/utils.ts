import { PipelineColumnType } from './ListOfPipelines';

export const pipelineData: Array<PipelineColumnType> = [
	{
		id: '1',
		key: 1,
		pipelineName: 'Nginx',
		filter: 'nginx:true',
		tags: ['server', 'app'],
		lastEdited: 'Dec 23, 2022',
		editedBy: '',
		description: [
			'Grok Parser: Parsing Nginx logs',
			'Remapper: Map `client` to `network.client.ip`',
			'User-Agent Parser',
			'Status Remapper: Define `http.status_category`, `level` as the official status of the log',
		],
	},
	{
		id: '2',
		key: 2,
		pipelineName: 'flog',
		filter: 'flog:true',
		tags: ['server', 'app'],
		lastEdited: 'Dec 23, 2022',
		editedBy: '',
		description: [
			'Data Parser: Parsing Nginx logs',
			'Remap: Map `client` to `network.client.ip`',
			'User-Map Parser',
			'Status Remap: Define `http.status_category`, `level` as the official status of the log',
		],
	},
];

export const subData = [
	{
		id: 1,
		text: [
			'Grok Parser: Parsing Nginx logs',
			'Remapper: Map `client` to `network.client.ip`',
			'User-Agent Parser',
			'Status Remapper: Define `http.status_category`, `level` as the official status of the log',
		],
	},
];
