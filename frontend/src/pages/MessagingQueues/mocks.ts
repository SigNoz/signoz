/* eslint-disable sonarjs/no-duplicate-string */
export const consumerGrpResponse = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				table: {
					columns: [
						{
							name: 'service_name',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'p99',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'error_rate',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'throughput',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'avg_msg_size',
							queryName: '',
							isValueColumn: false,
						},
					],
					rows: [
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name:
									'consumer-svc-consumer-svc-consumer-svc-consumer-svc-consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '1',
								error_rate: '2',
								p99: '0.294',
								service_name: 'frontend',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name: 'consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name: 'consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name: 'consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name: 'consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '1',
								error_rate: '2',
								p99: '0.294',
								service_name: 'frontend',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name: 'consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name: 'consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
						{
							data: {
								avg_msg_size: '0',
								error_rate: '0',
								p99: '0.2942205100000016',
								service_name: 'consumer-svc',
								throughput: '0.00016534391534391533',
							},
						},
					],
				},
			},
		],
	},
};

export const productDetailResponse = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				table: {
					columns: [
						{
							name: 'service_name',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'p99_query.p99',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'error_rate',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'rps',
							queryName: '',
							isValueColumn: false,
						},
					],
					rows: [
						{
							data: {
								error_rate: '0',
								'p99_query.p99': '150.08830908000002',
								rps: '0.00016534391534391533',
								service_name: 'producer-svc',
							},
						},
					],
				},
			},
		],
	},
};

export const networLatencyResponse = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				table: {
					columns: [
						{
							name: 'service_name',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'service_instance_id',
							queryName: '',
							isValueColumn: false,
						},
						{
							name: 'latency_0',
							queryName: 'latency_0',
							isValueColumn: true,
						},
						{
							name: 'latency_1',
							queryName: 'latency_1',
							isValueColumn: true,
						},
						{
							name: 'latency_2',
							queryName: 'latency_2',
							isValueColumn: true,
						},
						{
							name: 'latency_3',
							queryName: 'latency_3',
							isValueColumn: true,
						},
					],
					rows: [
						{
							data: {
								latency_0: 3230.1,
								latency_1: 'n/a',
								latency_2: 'n/a',
								latency_3: 'n/a',
								service_instance_id: 'a96ff029-6f14-435a-a3d4-ab4742b4347f',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 503,
								latency_1: 'n/a',
								latency_2: 'n/a',
								latency_3: 'n/a',
								service_instance_id: 'e33ffd7c-827a-427a-828e-547e00cb80d8',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 502.62,
								latency_1: 'n/a',
								latency_2: 'n/a',
								latency_3: 'n/a',
								service_instance_id: '9e87227f-a564-4b55-bf7c-fb00365d9400',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 'n/a',
								latency_1: 3230.1,
								latency_2: 'n/a',
								latency_3: 'n/a',
								service_instance_id: 'a96ff029-6f14-435a-a3d4-ab4742b4347f',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 'n/a',
								latency_1: 503,
								latency_2: 'n/a',
								latency_3: 'n/a',
								service_instance_id: 'e33ffd7c-827a-427a-828e-547e00cb80d8',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 'n/a',
								latency_1: 502.62,
								latency_2: 'n/a',
								latency_3: 'n/a',
								service_instance_id: '9e87227f-a564-4b55-bf7c-fb00365d9400',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 'n/a',
								latency_1: 'n/a',
								latency_2: 502.81,
								latency_3: 'n/a',
								service_instance_id: 'ac4833a8-fbe1-4592-a0ff-241f46a0851d',
								service_name: 'consumer-svc-2',
							},
						},
						{
							data: {
								latency_0: 'n/a',
								latency_1: 'n/a',
								latency_2: 'n/a',
								latency_3: 3230.1,
								service_instance_id: 'a96ff029-6f14-435a-a3d4-ab4742b4347f',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 'n/a',
								latency_1: 'n/a',
								latency_2: 'n/a',
								latency_3: 503,
								service_instance_id: 'e33ffd7c-827a-427a-828e-547e00cb80d8',
								service_name: 'consumer-svc',
							},
						},
						{
							data: {
								latency_0: 'n/a',
								latency_1: 'n/a',
								latency_2: 'n/a',
								latency_3: 502.62,
								service_instance_id: '9e87227f-a564-4b55-bf7c-fb00365d9400',
								service_name: 'consumer-svc',
							},
						},
					],
				},
			},
		],
	},
};

export const consumerGrpOptionsPayload = {
	status: 'success',
	data: {
		stringAttributeValues: ['cg4', 'cg1', 'cg2', 'cg3'],
		numberAttributeValues: null,
		boolAttributeValues: null,
	},
};

export const topicsOptionsPayload = {
	status: 'success',
	data: {
		stringAttributeValues: ['topic2', 'topic1', 'topic3', 'topic4'],
		numberAttributeValues: null,
		boolAttributeValues: null,
	},
};

export const partitionsOptionsPayload = {
	status: 'success',
	data: {
		stringAttributeValues: ['1', '2'],
		numberAttributeValues: null,
		boolAttributeValues: null,
	},
};
