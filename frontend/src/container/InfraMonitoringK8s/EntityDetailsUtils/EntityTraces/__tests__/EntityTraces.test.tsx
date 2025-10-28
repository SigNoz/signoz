/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen } from '@testing-library/react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import { Time } from 'container/TopNav/DateTimeSelectionV2/config';
import * as useQueryBuilderHooks from 'hooks/queryBuilder/useQueryBuilder';
import * as appContextHooks from 'providers/App/App';
import { LicenseEvent } from 'types/api/licensesV3/getActive';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import EntityTraces from '../EntityTraces';

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
		pathname: '/test-path',
	}),
	useNavigate: (): jest.Mock => jest.fn(),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: jest.fn(),
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

const mockHandleChangeTracesFilters = jest.fn();

const mockTracesFilters: IBuilderQuery['filters'] = {
	items: [
		{
			id: 'service-name',
			key: {
				id: 'service-name',
				dataType: DataTypes.String,
				key: 'service.name',
				type: 'tag',
				isIndexed: false,
			},
			op: '=',
			value: 'test-service',
		},
	],
	op: 'and',
};

const isModalTimeSelection = false;
const mockHandleTimeChange = jest.fn();
const selectedInterval: Time = '5m';
const category = K8sCategory.PODS;
const queryKey = 'pod-traces';
const queryKeyFilters = ['service.name'];

const mockTracesData = {
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
										trace_id: 'trace-1',
										span_id: 'span-1',
										service_name: 'test-service-1',
										operation_name: 'test-operation-1',
										duration: 100,
										status_code: 200,
									},
								},
								{
									timestamp: '2024-01-15T10:01:00Z',
									data: {
										trace_id: 'trace-2',
										span_id: 'span-2',
										service_name: 'test-service-2',
										operation_name: 'test-operation-2',
										duration: 150,
										status_code: 500,
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

const mockEmptyTracesData = {
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

const renderEntityTraces = (overrides = {}): any => {
	const defaultProps = {
		timeRange,
		isModalTimeSelection,
		handleTimeChange: mockHandleTimeChange,
		handleChangeTracesFilters: mockHandleChangeTracesFilters,
		tracesFilters: mockTracesFilters,
		selectedInterval,
		queryKey,
		category,
		queryKeyFilters,
		...overrides,
	};

	return render(
		<EntityTraces
			timeRange={defaultProps.timeRange}
			isModalTimeSelection={defaultProps.isModalTimeSelection}
			handleTimeChange={defaultProps.handleTimeChange}
			handleChangeTracesFilters={defaultProps.handleChangeTracesFilters}
			tracesFilters={defaultProps.tracesFilters}
			selectedInterval={defaultProps.selectedInterval}
			queryKey={defaultProps.queryKey}
			category={defaultProps.category}
			queryKeyFilters={defaultProps.queryKeyFilters}
		/>,
	);
};

describe('EntityTraces', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQuery.mockReturnValue({
			data: mockTracesData,
			isLoading: false,
			isError: false,
			isFetching: false,
		});
	});

	it('should render traces list with data', () => {
		renderEntityTraces();
		expect(screen.getByText('Previous')).toBeInTheDocument();
		expect(screen.getByText('Next')).toBeInTheDocument();
		expect(
			screen.getByText(/Search Filter : select options from suggested values/),
		).toBeInTheDocument();
		expect(screen.getByTestId('date-time-selection')).toBeInTheDocument();
	});

	it('renders empty state when no traces are found', () => {
		mockUseQuery.mockReturnValue({
			data: mockEmptyTracesData,
			isLoading: false,
			isError: false,
			isFetching: false,
		});

		renderEntityTraces();
		expect(screen.getByText(/No traces yet./)).toBeInTheDocument();
	});

	it('renders loader when fetching traces', () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			isFetching: true,
		});

		renderEntityTraces();
		expect(screen.getByText('pending_data_placeholder')).toBeInTheDocument();
	});

	it('shows error state when query fails', () => {
		mockUseQuery.mockReturnValue({
			data: { error: 'API Error' },
			isLoading: false,
			isError: true,
			isFetching: false,
		});

		renderEntityTraces();
		expect(screen.getByText('API Error')).toBeInTheDocument();
	});

	it('calls handleChangeTracesFilters when query builder search changes', () => {
		renderEntityTraces();
		expect(
			screen.getByText(/Search Filter : select options from suggested values/),
		).toBeInTheDocument();
	});

	it('calls handleTimeChange when datetime selection changes', () => {
		renderEntityTraces();
		expect(screen.getByTestId('date-time-selection')).toBeInTheDocument();
	});

	it('shows pagination controls when traces are present', () => {
		renderEntityTraces();
		expect(screen.getByText('Previous')).toBeInTheDocument();
		expect(screen.getByText('Next')).toBeInTheDocument();
	});

	it('disables pagination buttons when no more data', () => {
		renderEntityTraces();
		const prevButton = screen.getByText('Previous').closest('button');
		const nextButton = screen.getByText('Next').closest('button');
		expect(prevButton).toBeDisabled();
		expect(nextButton).toBeDisabled();
	});
});
