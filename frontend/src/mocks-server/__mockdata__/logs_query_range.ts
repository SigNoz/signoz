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
								container_id: 'debian',
								container_name: 'hotrod',
								driver: 'T703638C',
								eta: '2m0s',
								location: 'frontend/best_eta.go:106',
								log_level: 'INFO',
								message: 'Dispatch successful',
								service: 'frontend',
								span_id: '0e727d00a1560dc7',
								trace_id: '0e727d00a1560dc7',
							},
							body:
								'2024-02-15T21:20:22.035Z\tINFO\tfrontend/best_eta.go:106\tDispatch successful\t{"service": "frontend", "trace_id": "0e727d00a1560dc7", "span_id": "0e727d00a1560dc7", "driver": "T703638C", "eta": "2m0s"}',
							id: '2cPxDoqZrfjL6mrOmCRyVCRCtYd',
							resources_string: {
								'container.name': 'hotrod',
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
