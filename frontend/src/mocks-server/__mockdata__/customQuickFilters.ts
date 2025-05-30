export const quickFiltersListResponse = {
	status: 'success',
	data: {
		signal: 'logs',
		filters: [
			{
				key: 'os.description',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'service.name',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'duration_nano',
				dataType: 'float64',
				type: 'tag',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'quantity',
				dataType: 'float64',
				type: 'tag',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'body',
				dataType: 'string',
				type: '',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'deployment.environment',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'service.namespace',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'k8s.namespace.name',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'service.instance.id',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'k8s.pod.name',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'process.owner',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
		],
	},
};

export const otherFiltersResponse = {
	status: 'success',
	data: {
		attributes: [
			{
				key: 'service.name',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'k8s.deployment.name',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'deployment.environment',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'service.namespace',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'k8s.namespace.name',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'service.instance.id',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'k8s.pod.name',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'k8s.pod.uid',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
			{
				key: 'os.description',
				dataType: 'string',
				type: 'resource',
				isColumn: false,
				isJSON: false,
			},
		],
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
