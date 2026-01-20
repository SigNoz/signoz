/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
import { fireEvent, render, screen } from '@testing-library/react';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import { Time } from 'container/TopNav/DateTimeSelectionV2/config';
import * as useQueryBuilderHooks from 'hooks/queryBuilder/useQueryBuilder';
import * as appContextHooks from 'providers/App/App';
import { LicenseEvent } from 'types/api/licensesV3/getActive';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import EntityEvents from '../EntityEvents';

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="date-time-selection">Date Time</div>
	),
}));

const mockUseQuery = jest.fn();
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQuery: (queryKey: any, queryFn: any, options: any): any =>
		mockUseQuery(queryKey, queryFn, options),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES}/`,
	}),
}));

jest.spyOn(appContextHooks, 'useAppContext').mockReturnValue({
	user: {
		role: 'admin',
	},
	activeLicenseV3: {
		event_queue: {
			created_at: '0',
			event: LicenseEvent.NO_EVENT,
			scheduled_at: '0',
			status: '',
			updated_at: '0',
		},
		license: {
			license_key: 'test-license-key',
			license_type: 'trial',
			org_id: 'test-org-id',
			plan_id: 'test-plan-id',
			plan_name: 'test-plan-name',
			plan_type: 'trial',
			plan_version: 'test-plan-version',
		},
	},
} as any);

const mockUseQueryBuilderData = {
	handleRunQuery: jest.fn(),
	stagedQuery: initialQueriesMap[DataSource.METRICS],
	updateAllQueriesOperators: jest.fn(),
	currentQuery: initialQueriesMap[DataSource.METRICS],
	resetQuery: jest.fn(),
	redirectWithQueryBuilderData: jest.fn(),
	isStagedQueryUpdated: jest.fn(),
	handleSetQueryData: jest.fn(),
	handleSetFormulaData: jest.fn(),
	handleSetQueryItemData: jest.fn(),
	handleSetConfig: jest.fn(),
	removeQueryBuilderEntityByIndex: jest.fn(),
	removeQueryTypeItemByIndex: jest.fn(),
	isDefaultQuery: jest.fn(),
};

jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue({
	...mockUseQueryBuilderData,
} as any);

const timeRange = {
	startTime: 1718236800,
	endTime: 1718236800,
};

const mockHandleChangeEventFilters = jest.fn();

const mockFilters: IBuilderQuery['filters'] = {
	items: [
		{
			id: 'pod-name',
			key: {
				id: 'pod-name',
				dataType: DataTypes.String,
				key: 'pod-name',
				type: 'tag',
				isIndexed: false,
			},
			op: '=',
			value: 'pod-1',
		},
	],
	op: 'and',
};

const isModalTimeSelection = false;
const mockHandleTimeChange = jest.fn();
const selectedInterval: Time = '1m';
const category = K8sCategory.PODS;
const queryKey = 'pod-events';

const mockEventsData = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							list: [
								{
									timestamp: '2024-01-15T10:00:00Z',
									data: {
										id: 'event-1',
										severity_text: 'INFO',
										body: 'Test event 1',
										resources_string: { 'pod.name': 'test-pod-1' },
										attributes_string: { service: 'test-service' },
									},
								},
								{
									timestamp: '2024-01-15T10:01:00Z',
									data: {
										id: 'event-2',
										severity_text: 'WARN',
										body: 'Test event 2',
										resources_string: { 'pod.name': 'test-pod-2' },
										attributes_string: { service: 'test-service' },
									},
								},
							],
						},
					],
				},
			},
		},
	},
};

const mockEmptyEventsData = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							list: [],
						},
					],
				},
			},
		},
	},
};

const createMockEvent = (
	id: string,
	severity: string,
	body: string,
	podName: string,
): any => ({
	timestamp: `2024-01-15T10:${id.padStart(2, '0')}:00Z`,
	data: {
		id: `event-${id}`,
		severity_text: severity,
		body,
		resources_string: { 'pod.name': podName },
		attributes_string: { service: 'test-service' },
	},
});

const createMockMoreEventsData = (): any => ({
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							list: Array.from({ length: 11 }, (_, i) =>
								createMockEvent(
									String(i + 1),
									['INFO', 'WARN', 'ERROR', 'DEBUG'][i % 4],
									`Test event ${i + 1}`,
									`test-pod-${i + 1}`,
								),
							),
						},
					],
				},
			},
		},
	},
});

const renderEntityEvents = (overrides = {}): any => {
	const defaultProps = {
		timeRange,
		handleChangeEventFilters: mockHandleChangeEventFilters,
		filters: mockFilters,
		isModalTimeSelection,
		handleTimeChange: mockHandleTimeChange,
		selectedInterval,
		category,
		queryKey,
		...overrides,
	};

	return render(
		<EntityEvents
			timeRange={defaultProps.timeRange}
			handleChangeEventFilters={defaultProps.handleChangeEventFilters}
			filters={defaultProps.filters}
			isModalTimeSelection={defaultProps.isModalTimeSelection}
			handleTimeChange={defaultProps.handleTimeChange}
			selectedInterval={defaultProps.selectedInterval}
			category={defaultProps.category}
			queryKey={defaultProps.queryKey}
		/>,
	);
};

describe('EntityEvents', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQuery.mockReturnValue({
			data: mockEventsData,
			isLoading: false,
			isError: false,
			isFetching: false,
		});
	});

	it('should render events list with data', () => {
		renderEntityEvents();
		expect(screen.getByText('Prev')).toBeInTheDocument();
		expect(screen.getByText('Next')).toBeInTheDocument();
		expect(screen.getByText('Test event 1')).toBeInTheDocument();
		expect(screen.getByText('Test event 2')).toBeInTheDocument();
		expect(screen.getByText('INFO')).toBeInTheDocument();
		expect(screen.getByText('WARN')).toBeInTheDocument();
	});

	it('renders empty state when no events are found', () => {
		mockUseQuery.mockReturnValue({
			data: mockEmptyEventsData,
			isLoading: false,
			isError: false,
			isFetching: false,
		});

		renderEntityEvents();
		expect(screen.getByText(/No events found for this pods/)).toBeInTheDocument();
	});

	it('renders loader when fetching events', () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			isFetching: true,
		});

		renderEntityEvents();
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	it('shows pagination controls when events are present', () => {
		renderEntityEvents();
		expect(screen.getByText('Prev')).toBeInTheDocument();
		expect(screen.getByText('Next')).toBeInTheDocument();
	});

	it('disables Prev button on first page', () => {
		renderEntityEvents();
		const prevButton = screen.getByText('Prev').closest('button');
		expect(prevButton).toBeDisabled();
	});

	it('enables Next button when more events are available', () => {
		mockUseQuery.mockReturnValue({
			data: createMockMoreEventsData(),
			isLoading: false,
			isError: false,
			isFetching: false,
		});

		renderEntityEvents();
		const nextButton = screen.getByText('Next').closest('button');
		expect(nextButton).not.toBeDisabled();
	});

	it('navigates to next page when Next button is clicked', () => {
		mockUseQuery.mockReturnValue({
			data: createMockMoreEventsData(),
			isLoading: false,
			isError: false,
			isFetching: false,
		});

		renderEntityEvents();

		const nextButton = screen.getByText('Next').closest('button');
		expect(nextButton).not.toBeNull();
		fireEvent.click(nextButton as Element);

		const { calls } = mockUseQuery.mock;
		const hasPage2Call = calls.some((call) => {
			const { queryKey: callQueryKey } = call[0] || {};
			return Array.isArray(callQueryKey) && callQueryKey.includes(2);
		});
		expect(hasPage2Call).toBe(true);
	});

	it('navigates to previous page when Prev button is clicked', () => {
		mockUseQuery.mockReturnValue({
			data: createMockMoreEventsData(),
			isLoading: false,
			isError: false,
			isFetching: false,
		});

		renderEntityEvents();

		const nextButton = screen.getByText('Next').closest('button');
		expect(nextButton).not.toBeNull();
		fireEvent.click(nextButton as Element);

		const prevButton = screen.getByText('Prev').closest('button');
		expect(prevButton).not.toBeNull();
		fireEvent.click(prevButton as Element);

		const { calls } = mockUseQuery.mock;
		const hasPage1Call = calls.some((call) => {
			const { queryKey: callQueryKey } = call[0] || {};
			return Array.isArray(callQueryKey) && callQueryKey.includes(1);
		});
		expect(hasPage1Call).toBe(true);
	});
});
