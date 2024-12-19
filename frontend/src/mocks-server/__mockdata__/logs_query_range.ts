export const logsQueryRangeSuccessResponse = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				queryName: 'A',
				series: null,
				list: [
					{
						timestamp: '2024-02-15T21:20:22Z',
						data: {
							attributes_bool: {},
							attributes_float64: {},
							attributes_int64: {},
							attributes_string: {
								container_id: 'container_id',
								container_name: 'container_name',
								driver: 'driver',
								eta: '2m0s',
								location: 'frontend',
								log_level: 'INFO',
								message: 'Dispatch successful',
								service: 'frontend',
								span_id: 'span_id',
								trace_id: 'span_id',
							},
							body:
								'2024-02-15T21:20:22.035Z INFO frontend Dispatch successful {"service": "frontend", "trace_id": "span_id", "span_id": "span_id", "driver": "driver", "eta": "2m0s"}',
							id: 'id',
							resources_string: {
								'container.name': 'container_name',
							},
							severity_number: 0,
							severity_text: '',
							span_id: '',
							trace_flags: 0,
							trace_id: '',
						},
					},
				],
			},
		],
	},
};
