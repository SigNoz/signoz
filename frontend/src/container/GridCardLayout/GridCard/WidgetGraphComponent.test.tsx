import { fireEvent, render, screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { AppProvider } from 'providers/App/App';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { Provider } from 'react-redux';
import store from 'store';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import {
	MENUITEM_KEYS_VS_LABELS,
	MenuItemKeys,
} from '../WidgetHeader/contants';
import { WidgetGraphComponentProps } from './types';
import WidgetGraphComponent from './WidgetGraphComponent';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.DASHBOARD}/624652db-6097-42f5-bbca-e9012901db00`,
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

// Mock data
const mockProps: WidgetGraphComponentProps = {
	widget: {
		bucketCount: 30,
		bucketWidth: 0,
		columnUnits: {},
		description: '',
		fillSpans: false,
		id: '17f905f6-d355-46bd-a78e-cbc87e6f58cc',
		isStacked: false,
		mergeAllActiveQueries: false,
		nullZeroValues: 'zero',
		opacity: '1',
		panelTypes: PANEL_TYPES.VALUE,
		query: {
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.String,
							id: 'span_id--string----true',
							isColumn: true,
							isJSON: false,
							key: 'span_id',
							type: '',
						},
						aggregateOperator: 'count_distinct',
						dataSource: DataSource.TRACES,
						disabled: false,
						expression: 'A',
						filters: {
							items: [],
							op: 'AND',
						},
						functions: [],
						groupBy: [],
						having: [],
						legend: '',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'last',
						spaceAggregation: 'sum',
						stepInterval: 60,
						timeAggregation: 'count_distinct',
					},
				],
				queryFormulas: [],
			},
			clickhouse_sql: [
				{
					disabled: false,
					legend: '',
					name: 'A',
					query: '',
				},
			],
			id: '47449208-2c76-4465-9c62-a37fb4f5f11f',
			promql: [
				{
					disabled: false,
					legend: '',
					name: 'A',
					query: '',
				},
			],
			queryType: EQueryType.QUERY_BUILDER,
		},
		selectedLogFields: [
			{
				dataType: 'string',
				name: 'body',
				type: '',
			},
			{
				dataType: 'string',
				name: 'timestamp',
				type: '',
			},
		],
		selectedTracesFields: [],
		softMax: 0,
		softMin: 0,
		stackedBarChart: false,
		thresholds: [],
		timePreferance: 'GLOBAL_TIME',
		title: 'Test Dashboard',
		yAxisUnit: 'none',
	},
	queryResponse: {
		status: 'loading',
		isLoading: true,
		isSuccess: false,
		isError: false,
		isIdle: false,
		dataUpdatedAt: 0,
		error: null,
		errorUpdatedAt: 0,
		failureCount: 0,
		errorUpdateCount: 0,
		isFetched: false,
		isFetchedAfterMount: false,
		isFetching: true,
		isRefetching: false,
		isLoadingError: false,
		isPlaceholderData: false,
		isPreviousData: false,
		isRefetchError: false,
		isStale: true,
		data: undefined,
		refetch: jest.fn(),
		remove: jest.fn(),
	},
	errorMessage: '',
	version: 'v4',
	headerMenuList: [
		MenuItemKeys.View,
		MenuItemKeys.Clone,
		MenuItemKeys.Delete,
		MenuItemKeys.Edit,
		MenuItemKeys.CreateAlerts,
	],
	isWarning: false,
	isFetchingResponse: false,
	setRequestData: jest.fn(),
	onClickHandler: jest.fn(),
	onDragSelect: jest.fn(),
	openTracesButton: false,
	onOpenTraceBtnClick: jest.fn(),
};

// Mock useDashabord hook
jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): any => ({
		selectedDashboard: {
			data: {
				variables: [],
			},
		},
	}),
}));

describe('WidgetGraphComponent', () => {
	it('should show correct menu items when hovering over more options while loading', async () => {
		const { getByTestId, findByRole, getByText, container } = render(
			<MockQueryClientProvider>
				<Provider store={store}>
					<AppProvider>
						<WidgetGraphComponent
							widget={mockProps.widget}
							queryResponse={mockProps.queryResponse}
							errorMessage={mockProps.errorMessage}
							version={mockProps.version}
							headerMenuList={mockProps.headerMenuList}
							isWarning={mockProps.isWarning}
							isFetchingResponse={mockProps.isFetchingResponse}
							setRequestData={mockProps.setRequestData}
							onClickHandler={mockProps.onClickHandler}
							onDragSelect={mockProps.onDragSelect}
							openTracesButton={mockProps.openTracesButton}
							onOpenTraceBtnClick={mockProps.onOpenTraceBtnClick}
						/>
					</AppProvider>
				</Provider>
			</MockQueryClientProvider>,
		);

		expect(getByText('Test Dashboard')).toBeInTheDocument();

		// check if skeleton is rendered
		const skeleton = container.querySelector('.ant-skeleton');
		expect(skeleton).toBeInTheDocument();

		const moreOptionsButton = getByTestId('widget-header-options');
		fireEvent.mouseEnter(moreOptionsButton);

		const menu = await findByRole('menu');
		expect(menu).toBeInTheDocument();

		// Check if all menu items are present
		const expectedMenuItems = [
			MENUITEM_KEYS_VS_LABELS[MenuItemKeys.View],
			MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Clone],
			MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Delete],
			MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Edit],
			MENUITEM_KEYS_VS_LABELS[MenuItemKeys.CreateAlerts],
		];

		// check that menu is visible
		expectedMenuItems.forEach((item) => {
			expect(screen.getByText(item)).toBeInTheDocument();
		});
	});
});
