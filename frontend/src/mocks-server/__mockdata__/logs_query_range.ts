// Define a standard page size
export const PAGE_SIZE = 100;

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
export const logsQueryRangeEmptyResponse = {
	resultType: '',
	result: [
		{
			queryName: 'A',
		},
	],
};

export const logsPaginationQueryRangeSuccessResponse = ({
	offset = 0,
	pageSize = PAGE_SIZE,
}: {
	offset?: number;
	pageSize?: number;
}): any => {
	// Calculate the starting index for this page's items
	const startIndex = offset;
	// Determine how many items to generate for *this specific page*
	// In a real scenario, this might be less than PAGE_SIZE if it's the last page
	const itemsForThisPage = pageSize;

	return {
		status: 'success',
		data: {
			resultType: '',
			result: [
				{
					queryName: 'A',
					series: null,
					// Generate only the items for the current page
					list: Array.from({ length: itemsForThisPage }, (_, index) => {
						// Calculate a unique index based on the overall position
						const cumulativeIndex = startIndex + index;
						const baseTimestamp = new Date('2024-02-15T21:20:22Z').getTime();
						// Ensure timestamps decrease for descending order
						const currentTimestamp = new Date(baseTimestamp - cumulativeIndex * 1000);
						const timestampString = currentTimestamp.toISOString();
						// Generate unique IDs based on the cumulative index
						const id = `id-${cumulativeIndex}`; // Make ID unique across all pages
						const spanId = `span_id_${cumulativeIndex}`;
						const traceId = `trace_id_${cumulativeIndex}`;
						const logLevel = ['INFO', 'WARN', 'ERROR'][cumulativeIndex % 3];
						const service = ['frontend', 'backend', 'database'][cumulativeIndex % 3];
						const containerName = `container_name_${cumulativeIndex % 10}`;

						return {
							timestamp: timestampString,
							data: {
								attributes_bool: {},
								attributes_float64: {},
								attributes_int64: {},
								attributes_string: {
									container_id: `container_id_${cumulativeIndex % 10}`,
									container_name: containerName,
									driver: 'driver',
									eta: `${cumulativeIndex % 5}m${cumulativeIndex % 60}s`,
									location: service,
									log_level: logLevel,
									message: `Log message for item ${cumulativeIndex}`,
									service,
									span_id: spanId,
									trace_id: traceId,
								},
								body: `${timestampString} ${logLevel} ${service} Log message for item ${cumulativeIndex} {"service": "${service}", "trace_id": "${traceId}", "span_id": "${spanId}", "driver": "driver", "eta": "${
									cumulativeIndex % 5
								}m${cumulativeIndex % 60}s"}`,
								id,
								resources_string: {
									'container.name': containerName,
								},
								severity_number: [9, 13, 17][cumulativeIndex % 3],
								severity_text: logLevel,
								span_id: spanId,
								trace_flags: 0,
								trace_id: traceId,
							},
						};
					}),
				},
			],
		},
	};
};
