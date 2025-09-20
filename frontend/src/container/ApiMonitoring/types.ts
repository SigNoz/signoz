import { domainNameKey } from './constants';

export interface APIMonitoringResponseRow {
	data: {
		endpoints: number | string;
		error_rate: number | string;
		lastseen: number | string;
		[domainNameKey]: string;
		p99: number | string;
		rps: number | string;
	};
}

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

export interface EndPointsResponseRow {
	data: {
		[key: string]: string | number | undefined;
	};
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
