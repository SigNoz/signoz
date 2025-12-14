import { fireEvent, screen } from '@testing-library/react';
import { PayloadProps } from 'api/plannedDowntime/getAllDowntimeSchedules';
import { AxiosError, AxiosResponse } from 'axios';
import {
	mockLocation,
	mockQueryParams,
} from 'container/RoutingPolicies/__tests__/testUtils';
import { UseQueryResult } from 'react-query';
import { render } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import { PlannedDowntime } from '../PlannedDowntime';
import { buildSchedule, createMockDowntime } from './testUtils';

const SEARCH_PLACEHOLDER = 'Search for a planned downtime...';

const MOCK_DOWNTIME_1_NAME = 'Mock Downtime 1';
const MOCK_DOWNTIME_2_NAME = 'Mock Downtime 2';
const MOCK_DOWNTIME_3_NAME = 'Mock Downtime 3';
const MOCK_DATE_1 = '2024-01-01';
const MOCK_DATE_2 = '2024-01-02';
const MOCK_DATE_3 = '2024-01-03';

const MOCK_DOWNTIME_1 = createMockDowntime({
	id: 1,
	name: MOCK_DOWNTIME_1_NAME,
	createdAt: MOCK_DATE_1,
	updatedAt: MOCK_DATE_1,
	schedule: buildSchedule({ startTime: MOCK_DATE_1, timezone: 'UTC' }),
	alertIds: [],
});

const MOCK_DOWNTIME_2 = createMockDowntime({
	id: 2,
	name: MOCK_DOWNTIME_2_NAME,
	createdAt: MOCK_DATE_2,
	updatedAt: MOCK_DATE_2,
	schedule: buildSchedule({ startTime: MOCK_DATE_2, timezone: 'UTC' }),
	alertIds: [],
});

const MOCK_DOWNTIME_3 = createMockDowntime({
	id: 3,
	name: MOCK_DOWNTIME_3_NAME,
	createdAt: MOCK_DATE_3,
	updatedAt: MOCK_DATE_3,
	schedule: buildSchedule({ startTime: MOCK_DATE_3, timezone: 'UTC' }),
	alertIds: [],
});

const MOCK_DOWNTIME_RESPONSE: Partial<AxiosResponse<PayloadProps>> = {
	data: {
		data: [MOCK_DOWNTIME_1, MOCK_DOWNTIME_2, MOCK_DOWNTIME_3],
	},
};

type DowntimeQueryResult = UseQueryResult<
	AxiosResponse<PayloadProps>,
	AxiosError
>;

const mockDowntimeQueryResult: Partial<DowntimeQueryResult> = {
	data: MOCK_DOWNTIME_RESPONSE as AxiosResponse<PayloadProps>,
	isLoading: false,
	isFetching: false,
	isError: false,
	refetch: jest.fn(),
};

const mockUseLocation = jest.fn().mockReturnValue({
	pathname: '/alerts',
});
let mockUrlQuery: URLSearchParams;

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): void => mockUseLocation(),
}));

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): URLSearchParams => mockUrlQuery,
}));

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.MockedFunction<() => void> } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('api/plannedDowntime/getAllDowntimeSchedules', () => ({
	useGetAllDowntimeSchedules: (): DowntimeQueryResult =>
		mockDowntimeQueryResult as DowntimeQueryResult,
}));
jest.mock('api/alerts/getAll', () => ({
	__esModule: true,
	default: (): Promise<{ payload: [] }> => Promise.resolve({ payload: [] }),
}));

describe('PlannedDowntime Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUrlQuery = mockQueryParams({});
		mockLocation('/alerts');
	});

	it('renders the PlannedDowntime component properly', () => {
		render(<PlannedDowntime />, {}, { role: 'ADMIN' });

		// Check if title is rendered
		expect(screen.getByText('Planned Downtime')).toBeInTheDocument();

		// Check if subtitle is rendered
		expect(
			screen.getByText('Create and manage planned downtimes.'),
		).toBeInTheDocument();

		// Check if search input is rendered
		expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();

		// Check if "New downtime" button is enabled for ADMIN
		const newDowntimeButton = screen.getByRole('button', {
			name: /new downtime/i,
		});
		expect(newDowntimeButton).toBeInTheDocument();
		expect(newDowntimeButton).not.toBeDisabled();
	});

	it('disables the "New downtime" button for users with VIEWER role', () => {
		render(<PlannedDowntime />, {}, { role: USER_ROLES.VIEWER });

		// Check if "New downtime" button is disabled for VIEWER
		const newDowntimeButton = screen.getByRole('button', {
			name: /new downtime/i,
		});
		expect(newDowntimeButton).toBeInTheDocument();
		expect(newDowntimeButton).toBeDisabled();

		expect(newDowntimeButton).toHaveAttribute('disabled');
	});

	it('should load with search term from URL query params', () => {
		const searchTerm = 'existing search';
		mockUrlQuery = mockQueryParams({ search: searchTerm });

		render(<PlannedDowntime />, {}, { role: USER_ROLES.ADMIN });

		const searchInput = screen.getByPlaceholderText(
			SEARCH_PLACEHOLDER,
		) as HTMLInputElement;
		expect(searchInput.value).toBe(searchTerm);
	});

	it('should initialize with empty search when no search param is in URL', () => {
		mockUrlQuery = mockQueryParams({});

		render(<PlannedDowntime />, {}, { role: USER_ROLES.ADMIN });

		const searchInput = screen.getByPlaceholderText(
			SEARCH_PLACEHOLDER,
		) as HTMLInputElement;
		expect(searchInput.value).toBe('');
	});

	it('should display all downtime schedules when no search term is entered', async () => {
		render(<PlannedDowntime />, {}, { role: USER_ROLES.ADMIN });

		expect(screen.getByText(MOCK_DOWNTIME_1_NAME)).toBeInTheDocument();
		expect(screen.getByText(MOCK_DOWNTIME_2_NAME)).toBeInTheDocument();
		expect(screen.getByText(MOCK_DOWNTIME_3_NAME)).toBeInTheDocument();
	});

	it('should filter downtime schedules by name when searching', async () => {
		render(<PlannedDowntime />, {}, { role: USER_ROLES.ADMIN });

		expect(screen.getByText(MOCK_DOWNTIME_1_NAME)).toBeInTheDocument();

		const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);

		fireEvent.change(searchInput, { target: { value: MOCK_DOWNTIME_1_NAME } });

		expect(screen.getByText(MOCK_DOWNTIME_1_NAME)).toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_2_NAME)).not.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_3_NAME)).not.toBeInTheDocument();
	});

	it('should filter downtime schedules with partial name match', async () => {
		render(<PlannedDowntime />, {}, { role: USER_ROLES.ADMIN });

		expect(screen.getByText(MOCK_DOWNTIME_1_NAME)).toBeInTheDocument();

		const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);

		fireEvent.change(searchInput, { target: { value: '2' } });

		expect(screen.getByText(MOCK_DOWNTIME_2_NAME)).toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_1_NAME)).not.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_3_NAME)).not.toBeInTheDocument();
	});

	it('should show no results when search term matches nothing', async () => {
		render(<PlannedDowntime />, {}, { role: USER_ROLES.ADMIN });

		const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);

		fireEvent.change(searchInput, { target: { value: 'NonExistentDowntime' } });

		expect(screen.queryByText(MOCK_DOWNTIME_1_NAME)).not.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_2_NAME)).not.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_3_NAME)).not.toBeInTheDocument();
	});
});
