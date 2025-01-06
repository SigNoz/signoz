import { MessagingQueuesPayloadProps } from 'api/messagingQueues/getConsumerLagDetails';
import { RowData } from 'pages/MessagingQueues/MessagingQueuesUtils';

export function getTableDataForProducerLatencyOverview(
	data: MessagingQueuesPayloadProps['payload'],
): RowData[] {
	if (data?.result?.length === 0) {
		return [];
	}

	const firstTableData = data.result[0].table.rows || [];
	const secondTableData = data.result[1]?.table.rows || [];

	// Create a map for quick lookup of byte_rate using service_name and topic
	const byteRateMap = new Map(
		secondTableData.map((row) => [
			`${row.data.service_name}--${row.data.topic}`,
			row.data.byte_rate,
		]),
	);

	// Merge the data from both tables
	const mergedTableData: RowData[] =
		firstTableData.map(
			(row, index): RowData => ({
				...row.data,
				byte_rate:
					byteRateMap.get(`${row.data.service_name}--${row.data.topic}`) || 0,
				key: index,
			}),
		) || [];

	return mergedTableData;
}
