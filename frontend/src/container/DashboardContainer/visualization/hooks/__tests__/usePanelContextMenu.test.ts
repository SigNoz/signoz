import { renderHook } from '@testing-library/react';
import { UseQueryResult } from 'react-query';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';

import { usePanelContextMenu } from '../usePanelContextMenu';

// The hook composes `useCoordinates` (popover state) and `useGraphContextMenu`
// (menu items). We mock both so the test focuses on the `enableDrillDown` gate
// rather than the implementation of the menu wiring itself.
const onClickMock = jest.fn();
jest.mock('periscope/components/ContextMenu', () => ({
	useCoordinates: (): unknown => ({
		coordinates: null,
		popoverPosition: null,
		clickedData: null,
		onClose: jest.fn(),
		subMenu: null,
		onClick: onClickMock,
		setSubMenu: jest.fn(),
	}),
}));

jest.mock('container/QueryTable/Drilldown/useGraphContextMenu', () => ({
	__esModule: true,
	default: (): { menuItemsConfig: { header: string; items: string } } => ({
		menuItemsConfig: { header: 'menu-header', items: 'menu-items' },
	}),
}));

jest.mock('container/QueryTable/Drilldown/drilldownUtils', () => ({
	getUplotClickData: jest.fn(() => ({
		coord: { x: 1, y: 2 },
		record: { queryName: 'A', filters: [] },
		label: 'lbl',
		seriesColor: '#abc',
	})),
}));

jest.mock('container/PanelWrapper/utils', () => ({
	isApmMetric: jest.fn(() => false),
	getTimeRangeFromStepInterval: jest.fn(() => ({ start: 0, end: 0 })),
}));

const mockWidget = { id: 'w-1', query: {} } as unknown as Widgets;
const mockQueryResponse = {
	data: undefined,
	isLoading: false,
} as unknown as UseQueryResult<MetricQueryRangeSuccessResponse, Error>;

describe('usePanelContextMenu', () => {
	beforeEach(() => {
		onClickMock.mockClear();
	});

	it('returns empty menuItemsConfig when enableDrillDown is false', () => {
		const { result } = renderHook(() =>
			usePanelContextMenu({
				widget: mockWidget,
				queryResponse: mockQueryResponse,
				enableDrillDown: false,
			}),
		);

		expect(result.current.menuItemsConfig).toStrictEqual({});
	});

	it('returns wired menuItemsConfig when enableDrillDown is true', () => {
		const { result } = renderHook(() =>
			usePanelContextMenu({
				widget: mockWidget,
				queryResponse: mockQueryResponse,
				enableDrillDown: true,
			}),
		);

		expect(result.current.menuItemsConfig).toStrictEqual({
			header: 'menu-header',
			items: 'menu-items',
		});
	});

	it('clickHandlerWithContextMenu is a no-op when enableDrillDown is false', () => {
		const { result } = renderHook(() =>
			usePanelContextMenu({
				widget: mockWidget,
				queryResponse: mockQueryResponse,
				enableDrillDown: false,
			}),
		);

		result.current.clickHandlerWithContextMenu(
			100, // xValue
			200, // yValue
			0, // mouseX
			0, // mouseY
			{ serviceName: 'svc' }, // metric
			{ queryName: 'A', inFocusOrNot: true }, // queryData
			10, // absoluteMouseX
			20, // absoluteMouseY
			{}, // axesData
			{ seriesIndex: 0, seriesName: 'A', value: 1, color: '#abc' }, // focusedSeries
		);

		expect(onClickMock).not.toHaveBeenCalled();
	});

	it('clickHandlerWithContextMenu opens popover when enableDrillDown is true', () => {
		const { result } = renderHook(() =>
			usePanelContextMenu({
				widget: mockWidget,
				queryResponse: mockQueryResponse,
				enableDrillDown: true,
			}),
		);

		result.current.clickHandlerWithContextMenu(
			100,
			200,
			0,
			0,
			{ serviceName: 'svc' },
			{ queryName: 'A', inFocusOrNot: true },
			10,
			20,
			{},
			{ seriesIndex: 0, seriesName: 'A', value: 1, color: '#abc' },
		);

		expect(onClickMock).toHaveBeenCalledTimes(1);
	});

	it('defaults to disabled when enableDrillDown is not provided', () => {
		const { result } = renderHook(() =>
			usePanelContextMenu({
				widget: mockWidget,
				queryResponse: mockQueryResponse,
			}),
		);

		expect(result.current.menuItemsConfig).toStrictEqual({});
	});
});
