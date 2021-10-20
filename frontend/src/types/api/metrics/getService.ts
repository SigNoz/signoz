export interface Props {
	start: number;
	end: number;
}

export interface ServicesList {
	serviceName: string;
	p99: number;
	avgDuration: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
}

export type PayloadProps = ServicesList[];
