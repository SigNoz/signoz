export interface APIMonitoringResponseColumn {
	name: string;
	signal: string;
	fieldContext: string;
	fieldDataType: string;
	queryName: string;
	aggregationIndex: number;
	meta: Record<string, any>;
	columnType: string;
}

export interface APIDomainsRowData {
	key: string;
	domainName: string;
	endpointCount: number | string;
	rate: number | string;
	errorRate: number | string;
	latency: number | string;
	lastUsed: string;
}
