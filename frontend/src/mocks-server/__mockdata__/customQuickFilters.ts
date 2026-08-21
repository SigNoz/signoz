export const quickFiltersListResponse = {
	status: 'success',
	data: {
		signal: 'logs',
		filters: [
			{
				key: 'os.description',
				dataType: 'string',
				type: 'resource',
			},
			{
				key: 'service.name',
				dataType: 'string',
				type: 'resource',
			},
			{
				key: 'duration_nano',
				dataType: 'float64',
				type: 'tag',
			},
			{
				key: 'quantity',
				dataType: 'float64',
				type: 'tag',
			},
			{
				key: 'body',
				dataType: 'string',
				type: '',
			},
			{
				key: 'deployment.environment',
				dataType: 'string',
				type: 'resource',
			},
			{
				key: 'service.namespace',
				dataType: 'string',
				type: 'resource',
			},
			{
				key: 'k8s.namespace.name',
				dataType: 'string',
				type: 'resource',
			},
			{
				key: 'service.instance.id',
				dataType: 'string',
				type: 'resource',
			},
			{
				key: 'k8s.pod.name',
				dataType: 'string',
				type: 'resource',
			},
			{
				key: 'process.owner',
				dataType: 'string',
				type: 'resource',
			},
		],
	},
};

export const meterFieldKeysResponse = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			'service.name': [
				{
					name: 'service.name',
					signal: 'metrics',
					fieldContext: 'attribute',
					fieldDataType: 'string',
				},
			],
			'http.status_code': [
				{
					name: 'http.status_code',
					signal: 'metrics',
					fieldContext: 'attribute',
					fieldDataType: 'number',
				},
			],
		},
	},
};

export const otherFiltersFieldKeysResponse = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			'service.name': [
				{
					name: 'service.name',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
			'k8s.deployment.name': [
				{
					name: 'k8s.deployment.name',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
			'deployment.environment': [
				{
					name: 'deployment.environment',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
			'http.status_code': [
				{
					name: 'http.status_code',
					signal: 'logs',
					fieldContext: 'attribute',
					fieldDataType: 'number',
				},
			],
			'os.description': [
				{
					name: 'os.description',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
			],
			'host.name': [
				{
					name: 'host.name',
					signal: 'logs',
					fieldContext: 'resource',
					fieldDataType: 'string',
				},
				{
					name: 'host.name',
					signal: 'logs',
					fieldContext: 'attribute',
					fieldDataType: 'string',
				},
			],
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
