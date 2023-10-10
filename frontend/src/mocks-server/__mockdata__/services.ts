import { ServicesList } from 'types/api/metrics/getService';

export const serviceSuccessResponse: ServicesList[] = [
	{
		serviceName: 'TestService',
		p99: 8106824,
		avgDuration: 3772433.3333333335,
		numCalls: 3,
		callRate: 0.000004960563520015874,
		numErrors: 0,
		errorRate: 0,
	},
];
