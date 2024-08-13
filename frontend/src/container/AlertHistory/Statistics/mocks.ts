/* eslint-disable sonarjs/no-duplicate-string */
export const statsData = {
	totalCurrentTriggers: 14,
	totalPastTriggers: 15,
	currentTriggersSeries: {
		values: [
			{
				timestamp: '1625097600000', // Sample epoch value
				value: 100,
			},
		],
	},
	pastTriggersSeries: {
		values: [
			{
				timestamp: '1625097600000', // Sample epoch value
				value: 100,
			},
		],
	},
	currentAvgResolutionTime: 1.3,
	pastAvgResolutionTime: 3.2,
	currentAvgResolutionTimeSeries: {
		values: [
			{
				timestamp: '1625097600000', // Sample epoch value
				value: 100,
			},
		],
	},
	pastAvgResolutionTimeSeries: {
		values: [
			{
				timestamp: '1625097600000', // Sample epoch value
				value: 100,
			},
		],
	},
};

export const topContributorsData = {
	contributors: [
		{
			labels: {
				operation: 'POST /transaction-module/record-payment',
				service_name: 'order-service-prod',
				k3: 'v3',
			},
			count: 6,
		},
		{
			labels: {
				operation: 'GET /financial-module/account-statement',
				service_name: 'catalog-manager-001',
				k3: 'v3',
			},
			count: 4,
		},
		{
			labels: {
				operation: 'GET /financial-module/account-statement',
				service_name: 'catalog-manager-001',
				k3: 'v3',
			},
			count: 2,
		},
		{
			labels: {
				operation: 'GET /financial-module/account-statement',
				service_name: 'catalog-manager-001',
				k3: 'v3',
			},
			count: 2,
		},
	],
};
