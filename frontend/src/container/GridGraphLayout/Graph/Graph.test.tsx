import { ChartData } from 'chart.js';

import { LegendEntryProps } from './FullView/types';
import { showAllDataSet } from './FullView/utils';
import { getGraphVisibilityStateOnDataChange } from './utils';

const mockTestData: ChartData = {
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

const mocklegendEntryResult: LegendEntryProps[] = [
	{
		label: 'customer',
		show: true,
	},
	{
		label: 'demo-app',
		show: false,
	},
];

describe('getGraphVisibilityStateOnDataChange', () => {
	beforeEach(() => {
		const localStorageMock = {
			getItem: jest.fn(),
		};
		Object.defineProperty(window, 'localStorage', { value: localStorageMock });
	});

	it('should return the correct visibility state and legend entry', () => {
		// Mock the localStorage behavior
		const mockLocalStorageData = [
			{
				name: 'exampleexpanded',
				dataIndex: [
					{ label: 'customer', show: true },
					{ label: 'demo-app', show: false },
				],
			},
		];
		jest
			.spyOn(window.localStorage, 'getItem')
			.mockReturnValue(JSON.stringify(mockLocalStorageData));

		const result1 = getGraphVisibilityStateOnDataChange({
			data: mockTestData,
			isExpandedName: true,
			name: 'example',
		});
		expect(result1.graphVisibilityStates).toEqual([true, false]);
		expect(result1.legendEntry).toEqual(mocklegendEntryResult);

		const result2 = getGraphVisibilityStateOnDataChange({
			data: mockTestData,
			isExpandedName: false,
			name: 'example',
		});
		expect(result2.graphVisibilityStates).toEqual(
			Array(mockTestData.datasets.length).fill(true),
		);
		expect(result2.legendEntry).toEqual(showAllDataSet(mockTestData));
	});

	it('should return default values if localStorage data is not available', () => {
		// Mock the localStorage behavior to return null
		jest.spyOn(window.localStorage, 'getItem').mockReturnValue(null);

		const result = getGraphVisibilityStateOnDataChange({
			data: mockTestData,
			isExpandedName: true,
			name: 'example',
		});
		expect(result.graphVisibilityStates).toEqual(
			Array(mockTestData.datasets.length).fill(true),
		);
		expect(result.legendEntry).toEqual(showAllDataSet(mockTestData));
	});
});
