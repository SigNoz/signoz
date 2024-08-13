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
function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomState(): string {
	const states = ['firing', 'resolved', 'pending'];
	return states[getRandomInt(0, states.length - 1)];
}

function getRandomOperation(): string {
	const operations = [
		'GET /financial-module/account-statement',
		'POST /user/login',
		'DELETE /user/logout',
		'PUT /order/update',
		'PATCH /product/modify',
	];
	return operations[getRandomInt(0, operations.length - 1)];
}

function getRandomServiceName(): string {
	const services = [
		'catalog-manager-001',
		'user-service-002',
		'order-service-003',
		'payment-gateway-004',
		'inventory-service-005',
	];
	return services[getRandomInt(0, services.length - 1)];
}

function getRandomK3(): string {
	const k3Versions = ['v1', 'v2', 'v3', 'v4', 'v5'];
	return k3Versions[getRandomInt(0, k3Versions.length - 1)];
}

function getRandomUnixMilli(): string {
	const start = new Date(2021, 0, 1).getTime();
	const end = new Date(2022, 0, 1).getTime();
	return (getRandomInt(start, end) / 1000).toString();
}

export const timelineData = Array.from({ length: 500 }, () => ({
	unixMilli: getRandomUnixMilli(),
	state: getRandomState(),
	labels: {
		operation: getRandomOperation(),
		service_name: getRandomServiceName(),
		k3: getRandomK3(),
	},
	value: getRandomInt(0, 100),
}));
