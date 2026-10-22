export const quickFiltersListResponse = {
	status: 'success',
	data: {
		signal: 'logs',
		filters: [
			{
				name: 'os.description',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
			{
				name: 'service.name',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
			{
				name: 'duration_nano',
				fieldDataType: 'float64',
				fieldContext: 'attribute',
			},
			{
				name: 'quantity',
				fieldDataType: 'float64',
				fieldContext: 'attribute',
			},
			{
				name: 'body',
				fieldDataType: 'string',
				fieldContext: '',
			},
			{
				name: 'deployment.environment',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
			{
				name: 'service.namespace',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
			{
				name: 'k8s.namespace.name',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
			{
				name: 'service.instance.id',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
			{
				name: 'k8s.pod.name',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
			{
				name: 'process.owner',
				fieldDataType: 'string',
				fieldContext: 'resource',
			},
		],
	},
};

const otherFilterName = (name: string): { [k: string]: unknown[] } => ({
	[name]: [
		{ name, fieldContext: 'resource', fieldDataType: 'string', signal: 'logs' },
	],
});

export const otherFiltersResponse = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			...otherFilterName('service.name'),
			...otherFilterName('k8s.deployment.name'),
			...otherFilterName('deployment.environment'),
			...otherFilterName('service.namespace'),
			...otherFilterName('k8s.namespace.name'),
			...otherFilterName('service.instance.id'),
			...otherFilterName('k8s.pod.name'),
			...otherFilterName('k8s.pod.uid'),
			...otherFilterName('os.description'),
		},
	},
};

export const quickFiltersAttributeValuesResponse = {
	status: 'success',
	data: {
		stringAttributeValues: [
			'mq-kafka',
			'otel-demo',
			'otlp-python',
			'sample-flask',
		],
		numberAttributeValues: null,
		boolAttributeValues: null,
	},
};
