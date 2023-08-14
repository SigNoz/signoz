import { ChartData } from 'chart.js';

export const mockTestData: ChartData = {
	labels: ['test1', 'test2'],
	datasets: [
		{
			label: 'customer',
			data: [481.60377358490564, 730.0000000000002],
		},
		{
			label: 'demo-app',
			data: [4471.4285714285725],
		},
	],
};
