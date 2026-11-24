export interface ExternalService {
	avgDuration: number;
	callRate: number;
	errorRate: number;
	externalHttpUrl: string;
	numCalls: number;
	numErrors: number;
	timestamp: number;
}
