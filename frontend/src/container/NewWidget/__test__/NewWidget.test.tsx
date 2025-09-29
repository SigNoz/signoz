/* eslint-disable sonarjs/no-duplicate-string */
// This test suite covers several important scenarios:
// - Empty layout - widget should be placed at origin (0,0)
// - Empty layout with custom dimensions
// - Placing widget next to an existing widget when there's space in the last row
// - Placing widget at bottom when the last row is full
// - Handling multiple rows correctly
// - Handling widgets with different heights

import { screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { I18nextProvider } from 'react-i18next';
import { useSearchParams } from 'react-router-dom-v5-compat';
import i18n from 'ReactI18';
import {
	fireEvent,
	getByText as getByTextUtil,
	render,
	userEvent,
	within,
} from 'tests/test-utils';

import NewWidget from '..';
import {
	getDefaultWidgetData,
	placeWidgetAtBottom,
	placeWidgetBetweenRows,
} from '../utils';

// Helper function to check stack series state
const checkStackSeriesState = (
	container: HTMLElement,
	expectedChecked: boolean,
): HTMLElement => {
	expect(getByTextUtil(container, 'Stack series')).toBeInTheDocument();

	const stackSeriesSection = container.querySelector(
		'section > .stack-chart',
	) as HTMLElement;
	expect(stackSeriesSection).toBeInTheDocument();

	const switchElement = within(stackSeriesSection).getByRole('switch');
	if (expectedChecked) {
		expect(switchElement).toBeChecked();
	} else {
		expect(switchElement).not.toBeChecked();
	}

	return switchElement;
};

const MOCK_SEARCH_PARAMS =
	'?graphType=bar&widgetId=b473eef0-8eb5-4dd3-8089-c1817734084f&compositeQuery=%7B"id"%3A"f026c678-9abf-42af-a3dc-f73dc8cbb810"%2C"builder"%3A%7B"queryData"%3A%5B%7B"dataSource"%3A"metrics"%2C"queryName"%3A"A"%2C"aggregateOperator"%3A"count"%2C"aggregateAttribute"%3A%7B"id"%3A"----"%2C"dataType"%3A""%2C"key"%3A""%2C"type"%3A""%7D%2C"timeAggregation"%3A"rate"%2C"spaceAggregation"%3A"sum"%2C"filter"%3A%7B"expression"%3A""%7D%2C"aggregations"%3A%5B%7B"metricName"%3A""%2C"temporality"%3A""%2C"timeAggregation"%3A"count"%2C"spaceAggregation"%3A"sum"%2C"reduceTo"%3A"avg"%7D%5D%2C"functions"%3A%5B%5D%2C"filters"%3A%7B"items"%3A%5B%5D%2C"op"%3A"AND"%7D%2C"expression"%3A"A"%2C"disabled"%3Afalse%2C"stepInterval"%3Anull%2C"having"%3A%5B%5D%2C"limit"%3Anull%2C"orderBy"%3A%5B%5D%2C"groupBy"%3A%5B%5D%2C"legend"%3A""%2C"reduceTo"%3A"avg"%2C"source"%3A""%7D%5D%2C"queryFormulas"%3A%5B%5D%2C"queryTraceOperator"%3A%5B%5D%7D%2C"clickhouse_sql"%3A%5B%7B"name"%3A"A"%2C"legend"%3A""%2C"disabled"%3Afalse%2C"query"%3A""%7D%5D%2C"promql"%3A%5B%7B"name"%3A"A"%2C"query"%3A""%2C"legend"%3A""%2C"disabled"%3Afalse%7D%5D%2C"queryType"%3A"builder"%7D&relativeTime=30m';
// Mocks
jest.mock('uplot', () => ({
	paths: { spline: jest.fn(), bars: jest.fn() },
	default: jest.fn(() => ({ paths: { spline: jest.fn(), bars: jest.fn() } })),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string; search: string } => ({
		pathname: '',
		search: MOCK_SEARCH_PARAMS,
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('react-router-dom-v5-compat', () => ({
	...jest.requireActual('react-router-dom-v5-compat'),
	useSearchParams: jest.fn(),
	useNavigationType: jest.fn(() => 'PUSH'),
}));

describe('placeWidgetAtBottom', () => {
	it('should place widget at (0,0) when layout is empty', () => {
		const result = placeWidgetAtBottom('widget1', []);
		expect(result).toEqual({
			i: 'widget1',
			x: 0,
			y: 0,
			w: 6,
			h: 6,
		});
	});

	it('should place widget at (0,0) with custom dimensions when layout is empty', () => {
		const result = placeWidgetAtBottom('widget1', [], 4, 8);
		expect(result).toEqual({
			i: 'widget1',
			x: 0,
			y: 0,
			w: 4,
			h: 8,
		});
	});

	it('should place widget next to existing widget in last row if space available', () => {
		const existingLayout = [{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 }];
		const result = placeWidgetAtBottom('widget2', existingLayout);
		expect(result).toEqual({
			i: 'widget2',
			x: 6,
			y: 0,
			w: 6,
			h: 6,
		});
	});

	it('should place widget at bottom when last row is full', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
		];
		const result = placeWidgetAtBottom('widget3', existingLayout);
		expect(result).toEqual({
			i: 'widget3',
			x: 0,
			y: 6,
			w: 6,
			h: 6,
		});
	});

	it('should handle multiple rows correctly', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
			{ i: 'widget3', x: 0, y: 6, w: 6, h: 6 },
		];
		const result = placeWidgetAtBottom('widget4', existingLayout);
		expect(result).toEqual({
			i: 'widget4',
			x: 6,
			y: 6,
			w: 6,
			h: 6,
		});
	});

	it('should handle widgets with different heights', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 8 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 4 },
		];
		const result = placeWidgetAtBottom('widget3', existingLayout);
		// y = 2 here as later the react-grid-layout will add 2px to the y value while adjusting the layout
		expect(result).toEqual({
			i: 'widget3',
			x: 6,
			y: 2,
			w: 6,
			h: 6,
		});
	});
});

describe('placeWidgetBetweenRows', () => {
	it('should return single widget layout when layout is empty', () => {
		const result = placeWidgetBetweenRows('widget1', [], 'currentRow');
		expect(result).toEqual([
			{
				i: 'widget1',
				x: 0,
				y: 0,
				w: 6,
				h: 6,
			},
		]);
	});

	it('should place widget at the end of the layout when no nextRowId is provided', () => {
		const existingLayout = [
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
		];

		const result = placeWidgetBetweenRows('widget3', existingLayout, 'widget2');

		expect(result).toEqual([
			{ i: 'widget1', x: 0, y: 0, w: 6, h: 6 },
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
			{ i: 'widget3', x: 0, y: 6, w: 6, h: 6 },
		]);
	});

	it('should place widget between current and next row', () => {
		const existingLayout = [
			{
				h: 1,
				i: "'widget1'",
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 0,
			},
			{ i: 'widget2', x: 6, y: 0, w: 6, h: 6 },
			{
				h: 1,
				i: 'widget3',
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 7,
			},
		];

		const result = placeWidgetBetweenRows(
			'widget4',
			existingLayout,
			'widget1',
			'widget3',
		);

		expect(result).toEqual([
			{
				h: 1,
				i: "'widget1'",
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 0,
			},
			{
				h: 6,
				i: 'widget2',
				w: 6,
				x: 6,
				y: 0,
			},
			{
				h: 6,
				i: 'widget4',
				w: 6,
				x: 0,
				y: 6,
			},
			{
				h: 1,
				i: 'widget3',
				maxH: 1,
				minH: 1,
				minW: 12,
				moved: false,
				static: false,
				w: 12,
				x: 0,
				y: 7,
			},
		]);
	});

	it('should respect custom widget dimensions', () => {
		const existingLayout = [{ i: 'widget1', x: 0, y: 0, w: 12, h: 4 }];

		const result = placeWidgetBetweenRows(
			'widget2',
			existingLayout,
			'widget1',
			null,
			8,
			3,
		);

		expect(result).toEqual([
			{ i: 'widget1', x: 0, y: 0, w: 12, h: 4 },
			{ i: 'widget2', x: 0, y: 4, w: 8, h: 3 },
		]);
	});
});

describe('getDefaultWidgetData', () => {
	it('should set stackedBarChart to true by default for new panel creation', () => {
		const widgetId = 'test-widget-123';
		const panelType = PANEL_TYPES.BAR;

		const result = getDefaultWidgetData(widgetId, panelType);

		expect(result.stackedBarChart).toBe(true);
		expect(result.id).toBe(widgetId);
		expect(result.panelTypes).toBe(panelType);
	});
});

describe('Stacking bar in new panel', () => {
	it('New panel should have stack bar - true by default', () => {
		// Mock useSearchParams to return the expected values
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams(MOCK_SEARCH_PARAMS),
			jest.fn(),
		]);

		const { container, getByText } = render(
			<I18nextProvider i18n={i18n}>
				<DashboardProvider>
					<PreferenceContextProvider>
						<NewWidget
							selectedGraph={PANEL_TYPES.BAR}
							fillSpans={undefined}
							yAxisUnit={undefined}
						/>
					</PreferenceContextProvider>
				</DashboardProvider>
			</I18nextProvider>,
		);

		// Verify label is present
		expect(getByText('Stack series')).toBeInTheDocument();

		// Verify section exists
		const section = container.querySelector('section > .stack-chart');
		expect(section).toBeInTheDocument();

		// Verify switch is present and enabled (ant-switch-checked)
		const switchBtn = section?.querySelector('.ant-switch');
		expect(switchBtn).toBeInTheDocument();
		expect(switchBtn).toHaveClass('ant-switch-checked');

		// Check that stack series is present and checked
		checkStackSeriesState(container, true);
	});
});

const STACKING_STATE_ATTR = 'data-stacking-state';

describe('when switching to BAR panel type', () => {
	jest.setTimeout(10000);

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock useSearchParams to return the expected values
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams(MOCK_SEARCH_PARAMS),
			jest.fn(),
		]);
	});

	it('should preserve saved stacking value of true', async () => {
		const { getByTestId, getByText, container } = render(
			<DashboardProvider>
				<NewWidget
					selectedGraph={PANEL_TYPES.BAR}
					fillSpans={undefined}
					yAxisUnit={undefined}
				/>
			</DashboardProvider>,
		);

		expect(getByTestId('panel-change-select')).toHaveAttribute(
			STACKING_STATE_ATTR,
			'true',
		);

		await userEvent.click(getByText('Bar')); // Panel Type Selected

		// find dropdown with - .ant-select-dropdown
		const panelDropdown = document.querySelector(
			'.ant-select-dropdown',
		) as HTMLElement;
		expect(panelDropdown).toBeInTheDocument();

		// Select TimeSeries from dropdown
		const option = within(panelDropdown).getByText('Time Series');
		fireEvent.click(option);

		expect(getByTestId('panel-change-select')).toHaveAttribute(
			STACKING_STATE_ATTR,
			'false',
		);

		// Since we are on timeseries panel, stack series should be false
		expect(screen.queryByText('Stack series')).not.toBeInTheDocument();

		// switch back to Bar panel
		const panelTypeDropdown2 = getByTestId('panel-change-select') as HTMLElement;
		expect(panelTypeDropdown2).toBeInTheDocument();

		expect(getByTextUtil(panelTypeDropdown2, 'Time Series')).toBeInTheDocument();
		fireEvent.click(getByTextUtil(panelTypeDropdown2, 'Time Series'));

		// find dropdown with - .ant-select-dropdown
		const panelDropdown2 = document.querySelector(
			'.ant-select-dropdown',
		) as HTMLElement;
		// // Select BAR from dropdown
		const BarOption = within(panelDropdown2).getByText('Bar');
		fireEvent.click(BarOption);

		// Stack series should be true
		checkStackSeriesState(container, true);

		expect(getByTestId('panel-change-select')).toHaveAttribute(
			STACKING_STATE_ATTR,
			'true',
		);
	});
});
