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

export const statsTimeSeries = [
	{
		timestamp: 1723178880000,
		value: '720',
	},
	{
		timestamp: 1723187520000,
		value: '588',
	},
	{
		timestamp: 1723196160000,
		value: '540',
	},
	{
		timestamp: 1723204800000,
		value: '450',
	},
	{
		timestamp: 1723213440000,
		value: '300',
	},
	{
		timestamp: 1723222080000,
		value: '330',
	},
	{
		timestamp: 1723230720000,
		value: '390',
	},
	{
		timestamp: 1723239360000,
		value: '320',
	},
	{
		timestamp: 1723248000000,
		value: '300',
	},
	{
		timestamp: 1723256640000,
		value: '300',
	},
	{
		timestamp: 1723265280000,
		value: '300',
	},
	{
		timestamp: 1723273920000,
		value: '320',
	},
	{
		timestamp: 1723282560000,
		value: '315',
	},
	{
		timestamp: 1723291200000,
		value: '300',
	},
	{
		timestamp: 1723299840000,
		value: '380',
	},
	{
		timestamp: 1723308480000,
		value: '315',
	},
	{
		timestamp: 1723317120000,
		value: '340',
	},
	{
		timestamp: 1723334400000,
		value: '360',
	},
	{
		timestamp: 1723343040000,
		value: '360',
	},
	{
		timestamp: 1723351680000,
		value: '400',
	},
	{
		timestamp: 1723360320000,
		value: '300',
	},
	{
		timestamp: 1723368960000,
		value: '420',
	},
	{
		timestamp: 1723377600000,
		value: '345',
	},
	{
		timestamp: 1723386240000,
		value: '300',
	},
	{
		timestamp: 1723394880000,
		value: '320',
	},
	{
		timestamp: 1723403520000,
		value: '300',
	},
	{
		timestamp: 1723412160000,
		value: '360',
	},
	{
		timestamp: 1723420800000,
		value: '340',
	},
	{
		timestamp: 1723429440000,
		value: '300',
	},
	{
		timestamp: 1723438080000,
		value: '300',
	},
	{
		timestamp: 1723446720000,
		value: '330',
	},
	{
		timestamp: 1723455360000,
		value: '720',
	},
	{
		timestamp: 1723464000000,
		value: '320',
	},
	{
		timestamp: 1723472640000,
		value: '468',
	},
	{
		timestamp: 1723481280000,
		value: '300',
	},
	{
		timestamp: 1723489920000,
		value: '420',
	},
	{
		timestamp: 1723498560000,
		value: '360',
	},
	{
		timestamp: 1723507200000,
		value: '300',
	},
	{
		timestamp: 1723515840000,
		value: '360',
	},
	{
		timestamp: 1723524480000,
		value: '300',
	},
	{
		timestamp: 1723533120000,
		value: '660',
	},
	{
		timestamp: 1723541760000,
		value: '480',
	},
	{
		timestamp: 1723550400000,
		value: '300',
	},
	{
		timestamp: 1723559040000,
		value: '300',
	},
	{
		timestamp: 1723567680000,
		value: '300',
	},
	{
		timestamp: 1723576320000,
		value: '360',
	},
	{
		timestamp: 1723584960000,
		value: '300',
	},
	{
		timestamp: 1723593600000,
		value: '360',
	},
	{
		timestamp: 1723602240000,
		value: '480',
	},
	{
		timestamp: 1723610880000,
		value: '437.14285714285717',
	},
	{
		timestamp: 1723619520000,
		value: '312',
	},
	{
		timestamp: 1723628160000,
		value: '450',
	},
	{
		timestamp: 1723636800000,
		value: '612',
	},
	{
		timestamp: 1723645440000,
		value: '557.1428571428571',
	},
	{
		timestamp: 1723654080000,
		value: '300',
	},
	{
		timestamp: 1723662720000,
		value: '405',
	},
	{
		timestamp: 1723671360000,
		value: '320',
	},
	{
		timestamp: 1723680000000,
		value: '300',
	},
	{
		timestamp: 1723688640000,
		value: '300',
	},
	{
		timestamp: 1723697280000,
		value: '312',
	},
	{
		timestamp: 1723705920000,
		value: '390',
	},
	{
		timestamp: 1723723200000,
		value: '330',
	},
	{
		timestamp: 1723731840000,
		value: '450',
	},
	{
		timestamp: 1723740480000,
		value: '320',
	},
	{
		timestamp: 1723749120000,
		value: '320',
	},
	{
		timestamp: 1723757760000,
		value: '315',
	},
	{
		timestamp: 1723766400000,
		value: '300',
	},
	{
		timestamp: 1723775040000,
		value: '300',
	},
	{
		timestamp: 1723783680000,
		value: '450',
	},
	{
		timestamp: 1723792320000,
		value: '432',
	},
	{
		timestamp: 1723800960000,
		value: '653.3333333333334',
	},
	{
		timestamp: 1723809600000,
		value: '618',
	},
	{
		timestamp: 1723818240000,
		value: '460',
	},
	{
		timestamp: 1723826880000,
		value: '360',
	},
	{
		timestamp: 1723835520000,
		value: '320',
	},
	{
		timestamp: 1723844160000,
		value: '330',
	},
	{
		timestamp: 1723852800000,
		value: '300',
	},
	{
		timestamp: 1723861440000,
		value: '380',
	},
	{
		timestamp: 1723870080000,
		value: '300',
	},
	{
		timestamp: 1723878720000,
		value: '300',
	},
	{
		timestamp: 1723887360000,
		value: '330',
	},
	{
		timestamp: 1723896000000,
		value: '300',
	},
	{
		timestamp: 1723904640000,
		value: '450',
	},
	{
		timestamp: 1723913280000,
		value: '330',
	},
	{
		timestamp: 1723921920000,
		value: '300',
	},
	{
		timestamp: 1723930560000,
		value: '300',
	},
	{
		timestamp: 1723939200000,
		value: '300',
	},
	{
		timestamp: 1723947840000,
		value: '300',
	},
	{
		timestamp: 1723956480000,
		value: '300',
	},
	{
		timestamp: 1723965120000,
		value: '300',
	},
	{
		timestamp: 1723973760000,
		value: '300',
	},
	{
		timestamp: 1723982400000,
		value: '360',
	},
	{
		timestamp: 1723991040000,
		value: '300',
	},
	{
		timestamp: 1723999680000,
		value: '310',
	},
	{
		timestamp: 1724008320000,
		value: '390',
	},
	{
		timestamp: 1724016960000,
		value: '300',
	},
	{
		timestamp: 1724025600000,
		value: '340',
	},
	{
		timestamp: 1724034240000,
		value: '300',
	},
	{
		timestamp: 1724042880000,
		value: '330',
	},
	{
		timestamp: 1724051520000,
		value: '380',
	},
	{
		timestamp: 1724060160000,
		value: '450',
	},
	{
		timestamp: 1724068800000,
		value: '300',
	},
	{
		timestamp: 1724077440000,
		value: '315',
	},
	{
		timestamp: 1724086080000,
		value: '330',
	},
	{
		timestamp: 1724094720000,
		value: '300',
	},
	{
		timestamp: 1724103360000,
		value: '330',
	},
	{
		timestamp: 1724112000000,
		value: '2130',
	},
	{
		timestamp: 1724120640000,
		value: '300',
	},
	{
		timestamp: 1724129280000,
		value: '300',
	},
	{
		timestamp: 1724137920000,
		value: '600',
	},
	{
		timestamp: 1724146560000,
		value: '520',
	},
	{
		timestamp: 1724155200000,
		value: '702.8571428571429',
	},
];
