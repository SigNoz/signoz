export function convertToTitleCase(text: string): string {
	return text
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

export type RowData = {
	key: string;
	[key: string]: string | number;
};

export enum ConsumerLagDetailType {
	ConsumerDetails = 'consumer-details',
	ProducerDetails = 'producer-details',
	NetworkLatency = 'network-latency',
	PartitionHostMetrics = 'partition-host-metric',
}

export const ConsumerLagDetailTitle: Record<ConsumerLagDetailType, string> = {
	'consumer-details': 'Consumer Groups Details',
	'producer-details': 'Producer Details',
	'network-latency': 'Network Latency',
	'partition-host-metric': 'Partition Host Metrics',
};
