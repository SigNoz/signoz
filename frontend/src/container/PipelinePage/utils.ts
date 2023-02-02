export const pipelineData = [
	{
		id: 1,
		key: 1,
		pname: 'Nginx',
		filter: 'nginx:true',
		Tags: ['server', 'app'],
		last_edited: 'Dec 23, 2022',
		EditedBy: '',
		description: [
			'Grok Parser: Parsing Nginx logs',
			'Remapper: Map `client` to `network.client.ip`',
			'User-Agent Parser',
			'Status Remapper: Define `http.status_category`, `level` as the official status of the log',
		],
	},
	{
		id: 2,
		key: 2,
		pname: 'flog',
		filter: 'flog:true',
		Tags: ['server', 'app'],
		last_edited: 'Dec 23, 2022',
		EditedBy: '',
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
