import { ServicesList } from 'types/api/metrics/getService';

export const serviceSuccessResponse: ServicesList[] = [
	{
		serviceName: 'TestService',
		p99: 8106824,
		avgDuration: 2772433.33333335,
		numCalls: 1,
		callRate: 0.000004960563520015874,
		numErrors: 0,
		errorRate: 0,
	},
	{
		serviceName: 'TestCustomerService',
		p99: 9106824,
		avgDuration: 4772433.333333335,
		numCalls: 2,
		callRate: 0.000004960563520015874,
		numErrors: 0,
		errorRate: 0,
	},
];
