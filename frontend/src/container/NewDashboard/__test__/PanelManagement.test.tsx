/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
	Dashboard,
	IDashboardVariable,
	Widgets,
} from 'types/api/dashboard/getAll';

import { useAddDynamicVariableToPanels } from '../../../hooks/dashboard/useAddDynamicVariableToPanels';
import { WidgetSelector } from '../DashboardSettings/Variables/VariableItem/WidgetSelector';

// Mock scrollIntoView since it's not available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Constants to avoid duplication
const CPU_USAGE_TEXT = 'CPU Usage';
const MEMORY_USAGE_TEXT = 'Memory Usage';
const ROW_WIDGET_TEXT = 'Row Widget';

// Helper function to create variable config
const createVariableConfig = (
	name: string,
	attribute: string,
	widgetIds: string[],
): IDashboardVariable => ({
	id: `var_${name}`,
	name,
	type: 'DYNAMIC',
	description: '',
	sort: 'DISABLED',
	multiSelect: false,
	showALLOption: false,
	dynamicVariablesAttribute: attribute,
	dynamicVariablesWidgetIds: widgetIds,
});

const mockDashboard = {
	data: {
		widgets: [
			{
				id: 'widget1',
				title: CPU_USAGE_TEXT,
				panelTypes: 'GRAPH',
			},
			{
				id: 'widget2',
				title: MEMORY_USAGE_TEXT,
				panelTypes: 'TABLE',
			},
			{
				id: 'widget3',
				title: ROW_WIDGET_TEXT,
				panelTypes: 'ROW', // Should be filtered out
			},
		],
		layout: [{ i: 'widget1' }, { i: 'widget2' }, { i: 'widget3' }],
	},
};
// Mock dependencies
jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): any => ({
		selectedDashboard: mockDashboard,
	}),
}));

jest.mock('constants/queryBuilder', () => ({
	PANEL_GROUP_TYPES: {
		ROW: 'ROW',
	},
	PANEL_TYPES: {
		TIME_SERIES: 'graph',
		VALUE: 'value',
		TABLE: 'table',
		LIST: 'list',
		TRACE: 'trace',
		BAR: 'bar',
		PIE: 'pie',
		HISTOGRAM: 'histogram',
		EMPTY_WIDGET: 'EMPTY_WIDGET',
	},
	initialQueriesMap: {
		metrics: {
			builder: {
				queryData: [{}],
			},
		},
		logs: {
			builder: {
				queryData: [{}],
			},
		},
		traces: {
			builder: {
				queryData: [{}],
			},
		},
	},
}));

jest.mock('container/GridPanelSwitch/utils', () => ({
	generateGridTitle: (title: string): string => title || 'Untitled Panel',
}));

describe('Panel Management Tests', () => {
	describe('WidgetSelector Component', () => {
		const mockSetSelectedWidgets = jest.fn();

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should display panel titles using generateGridTitle', () => {
			render(
				<WidgetSelector
					selectedWidgets={[]}
					setSelectedWidgets={mockSetSelectedWidgets}
				/>,
			);

			// Open the dropdown to see options
			const selectElement = screen.getByRole('combobox');
			fireEvent.mouseDown(selectElement);

			// Should show panel titles (excluding ROW widgets) in dropdown
			expect(screen.getByText(CPU_USAGE_TEXT)).toBeInTheDocument();
			expect(screen.getByText(MEMORY_USAGE_TEXT)).toBeInTheDocument();
			expect(screen.queryByText(ROW_WIDGET_TEXT)).not.toBeInTheDocument();
		});

		it('should filter out row widgets and widgets without layout', () => {
			const modifiedDashboard = {
				...mockDashboard,
				data: {
					...mockDashboard.data,
					widgets: [
						...mockDashboard.data.widgets,
						{
							id: 'widget4',
							title: 'Orphaned Widget',
							panelTypes: 'GRAPH',
						}, // No layout entry
					],
				},
			};

			// Temporarily mock the dashboard
			jest.doMock('providers/Dashboard/Dashboard', () => ({
				useDashboard: (): any => ({
					selectedDashboard: modifiedDashboard,
				}),
			}));

			render(
				<WidgetSelector
					selectedWidgets={[]}
					setSelectedWidgets={mockSetSelectedWidgets}
				/>,
			);

			// Should not show orphaned widget
			expect(screen.queryByText('Orphaned Widget')).not.toBeInTheDocument();
		});

		it('should show selected widgets correctly', () => {
			render(
				<WidgetSelector
					selectedWidgets={['widget1', 'widget2']}
					setSelectedWidgets={mockSetSelectedWidgets}
				/>,
			);

			// Component should show ALL text when all widgets are selected
			expect(screen.getByText('ALL')).toBeInTheDocument();

			// Check if the dropdown shows selected state correctly
			const selectElement = screen.getByRole('combobox');
			fireEvent.mouseDown(selectElement);

			// Should show the selected panels in the dropdown
			expect(screen.getByText('CPU Usage')).toBeInTheDocument();
			expect(screen.getByText('Memory Usage')).toBeInTheDocument();

			// Check if the specific options (CPU Usage, Memory Usage) are properly selected/checked
			const cpuOption = screen.getByText('CPU Usage');
			const memoryOption = screen.getByText('Memory Usage');

			// Find the specific checkboxes for CPU Usage and Memory Usage
			// Navigate from the text to find the associated checkbox
			const cpuContainer = cpuOption.closest(
				'.ant-select-item-option, .option-item',
			);
			const memoryContainer = memoryOption.closest(
				'.ant-select-item-option, .option-item',
			);

			const cpuCheckbox = cpuContainer?.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			const memoryCheckbox = memoryContainer?.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;

			// Verify that the specific checkboxes for our selected widgets are checked
			expect(cpuCheckbox).toBeInTheDocument();
			expect(memoryCheckbox).toBeInTheDocument();
			expect(cpuCheckbox.checked).toBe(true);
			expect(memoryCheckbox.checked).toBe(true);

			// Also verify the checkbox wrappers have the checked class
			const cpuCheckboxWrapper = cpuCheckbox?.closest('.ant-checkbox');
			const memoryCheckboxWrapper = memoryCheckbox?.closest('.ant-checkbox');

			expect(cpuCheckboxWrapper).toHaveClass('ant-checkbox-checked');
			expect(memoryCheckboxWrapper).toHaveClass('ant-checkbox-checked');

			// Additional verification: ensure these are the correct options by checking their labels
			expect(cpuOption).toBeInTheDocument();
			expect(memoryOption).toBeInTheDocument();
		});
	});

	describe('useAddDynamicVariableToPanels Hook', () => {
		it('should add tag filters to specific selected panels', () => {
			const { result } = renderHook(() => useAddDynamicVariableToPanels());
			const addDynamicVariableToPanels = result.current;

			const dashboard: Dashboard = {
				data: {
					widgets: [
						{
							id: 'widget1',
							query: {
								builder: {
									queryData: [
										{
											filter: { expression: '' },
											filters: { items: [] },
										},
									],
								},
							},
						},
					],
				},
			} as any;

			const variableConfig = createVariableConfig('service', 'service.name', [
				'widget1',
			]);

			const updatedDashboard = addDynamicVariableToPanels(
				dashboard,
				variableConfig,
				false,
			);

			// Verify tag filter was added to the specific widget using new filter expression format
			const widget = updatedDashboard?.data?.widgets?.[0] as any;
			const queryData = widget?.query?.builder?.queryData?.[0];

			// Check that filter expression contains the variable reference
			expect(queryData.filter.expression).toContain('service.name in $service');

			// Check that filters array also contains the filter item
			const filters = queryData.filters.items;
			expect(filters).toContainEqual({
				id: expect.any(String),
				key: {
					id: expect.any(String),
					key: 'service.name',
					dataType: 'string',
					isColumn: false,
					isJSON: false,
					type: '',
				},
				op: 'IN',
				value: '$service',
			});
		});

		it('should apply to all panels when applyToAll is true', () => {
			const { result } = renderHook(() => useAddDynamicVariableToPanels());
			const addDynamicVariableToPanels = result.current;

			const dashboard: Dashboard = {
				data: {
					widgets: [
						{
							id: 'widget1',
							query: {
								builder: {
									queryData: [
										{
											filter: { expression: '' },
											filters: { items: [] },
										},
									],
								},
							},
						},
						{
							id: 'widget2',
							query: {
								builder: {
									queryData: [
										{
											filter: { expression: '' },
											filters: { items: [] },
										},
									],
								},
							},
						},
					],
				},
			} as any;

			const variableConfig = createVariableConfig('service', 'service.name', [
				'widget1',
			]); // Only specified widget1

			const updatedDashboard = addDynamicVariableToPanels(
				dashboard,
				variableConfig,
				true, // Apply to all
			);

			// Both widgets should have the filter expression
			const widget1QueryData = (updatedDashboard?.data?.widgets?.[0] as Widgets)
				?.query?.builder?.queryData?.[0];
			const widget2QueryData = (updatedDashboard?.data?.widgets?.[1] as Widgets)
				?.query?.builder?.queryData?.[0];

			// Check filter expressions
			expect(widget1QueryData?.filter?.expression).toContain(
				'service.name in $service',
			);
			expect(widget2QueryData?.filter?.expression).toContain(
				'service.name in $service',
			);

			// Check filters arrays
			const widget1Filters = widget1QueryData?.filters?.items;
			const widget2Filters = widget2QueryData?.filters?.items;

			expect(widget1Filters).toContainEqual({
				id: expect.any(String),
				key: {
					id: expect.any(String),
					key: 'service.name',
					dataType: 'string',
					isColumn: false,
					isJSON: false,
					type: '',
				},
				op: 'IN',
				value: '$service',
			});
			expect(widget2Filters).toContainEqual({
				id: expect.any(String),
				key: {
					id: expect.any(String),
					key: 'service.name',
					dataType: 'string',
					isColumn: false,
					isJSON: false,
					type: '',
				},
				op: 'IN',
				value: '$service',
			});
		});

		it('should validate tag filter format with variable name', () => {
			const { result } = renderHook(() => useAddDynamicVariableToPanels());
			const addDynamicVariableToPanels = result.current;

			const dashboard: Dashboard = {
				data: {
					widgets: [
						{
							id: 'widget1',
							query: {
								builder: {
									queryData: [
										{
											filters: { items: [] },
											filter: { expression: '' },
										},
									],
								},
							},
						},
					],
				},
			} as any;

			const variableConfig = {
				name: 'custom_service_var',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesWidgetIds: ['widget1'],
			};

			const updatedDashboard = addDynamicVariableToPanels(
				dashboard,
				variableConfig as any,
				false,
			);

			const filters = (updatedDashboard?.data?.widgets?.[0] as Widgets)?.query
				?.builder?.queryData?.[0]?.filters?.items;

			const filterExpression = (updatedDashboard?.data?.widgets?.[0] as Widgets)
				?.query?.builder?.queryData?.[0]?.filter?.expression;

			expect(filterExpression).toContain('service.name in $custom_service_var');
			expect(filters).toContainEqual(
				expect.objectContaining({
					value: '$custom_service_var', // Should use exact variable name
				}),
			);
		});

		it('should handle empty widget selection gracefully', () => {
			const { result } = renderHook(() => useAddDynamicVariableToPanels());
			const addDynamicVariableToPanels = result.current;

			const dashboard: Dashboard = {
				data: { widgets: [] },
			} as any;

			const variableConfig = {
				name: 'service',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesWidgetIds: [], // Empty selection
			};

			const updatedDashboard = addDynamicVariableToPanels(
				dashboard,
				variableConfig as any,
				false,
			);

			// Should return dashboard unchanged
			expect(updatedDashboard).toEqual(dashboard);
		});

		it('should handle undefined dashboard gracefully', () => {
			const { result } = renderHook(() => useAddDynamicVariableToPanels());
			const addDynamicVariableToPanels = result.current;

			const variableConfig = {
				name: 'service',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesWidgetIds: ['widget1'],
			};

			const updatedDashboard = addDynamicVariableToPanels(
				undefined,
				variableConfig as any,
				false,
			);

			// Should return undefined
			expect(updatedDashboard).toBeUndefined();
		});

		it('should preserve existing filters when adding new variable filter', () => {
			const { result } = renderHook(() => useAddDynamicVariableToPanels());
			const addDynamicVariableToPanels = result.current;

			const dashboard: Dashboard = {
				data: {
					widgets: [
						{
							id: 'widget1',
							query: {
								builder: {
									queryData: [
										{
											filter: {
												expression: "service.name IN ['adservice']",
											},
										},
									],
								},
							},
						},
					],
				},
			} as any;

			const variableConfig = {
				name: 'host.name',
				dynamicVariablesAttribute: 'host.name',
				dynamicVariablesWidgetIds: ['widget1'],
				description: '',
				type: 'DYNAMIC',
				queryValue: '',
				customValue: '',
				textboxValue: '',
				multiSelect: false,
				showALLOption: false,
				sort: 'DISABLED',
				defaultValue: '3',
				modificationUUID: 'bd3a85ab-1393-4783-971e-c252adfd4920',
				id: '6b6f526a-6404-46fc-8d87-dc53e7ba8e1f',
				order: 0,
				dynamicVariablesSource: 'Traces',
			};

			const updatedDashboard = addDynamicVariableToPanels(
				dashboard,
				variableConfig as any,
				false,
			);

			const filterExpression = (updatedDashboard?.data?.widgets?.[0] as Widgets)
				?.query?.builder?.queryData?.[0]?.filter?.expression;

			expect(filterExpression).toContain(
				"service.name IN ['adservice'] host.name in $host.name",
			);
		});
	});
});
