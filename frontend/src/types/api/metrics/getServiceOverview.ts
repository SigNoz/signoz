import { Props as GetDBOverViewProps } from './getDBOverview';

export type Props = GetDBOverViewProps;

export interface ServiceOverview {
	callRate: number;
	errorRate: number;
	numCalls: number;
	numErrors: number;
	p50: number;
	p95: number;
	p99: number;
	timestamp: number;
}

export type PayloadProps = ServiceOverview[];
