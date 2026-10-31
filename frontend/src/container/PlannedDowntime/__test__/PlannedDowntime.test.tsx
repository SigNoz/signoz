import { UseQueryResult } from 'react-query';
import { VirtuosoMockContext } from 'react-virtuoso';
import { fireEvent, screen } from '@testing-library/react';
import type {
	ListDowntimeSchedules200,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	AlertmanagertypesRepeatOnDTO,
	AlertmanagertypesRepeatTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { ErrorType } from 'api/generatedAPIInstance';
import { mockAppLocation, mockNavigate } from 'tests/router-mocks';
import { render, userEvent } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import { PlannedDowntime } from '../PlannedDowntime';
import { buildSchedule, createMockDowntime } from './testUtils';

const SEARCH_TEST_ID = 'planned-downtime-search';
const CREATE_TEST_ID = 'planned-downtime-create';

function renderPage(role: string = USER_ROLES.ADMIN): void {
	render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 800, itemHeight: 46 }}>
			<PlannedDowntime />
		</VirtuosoMockContext.Provider>,
		{},
		{ role },
	);
}

const MOCK_DOWNTIME_1_NAME = 'Mock Downtime 1';
const MOCK_DOWNTIME_2_NAME = 'Mock Downtime 2';
const MOCK_DOWNTIME_3_NAME = 'Mock Downtime 3';
const MOCK_DATE_1 = '2024-01-01';
const MOCK_DATE_2 = '2024-01-02';
const MOCK_DATE_3 = '2024-01-03';

const MOCK_DOWNTIME_1 = createMockDowntime({
	id: '1',
	name: MOCK_DOWNTIME_1_NAME,
	description: 'Database maintenance',
	createdAt: MOCK_DATE_1,
	createdBy: 'creator@signoz.io',
	updatedAt: MOCK_DATE_1,
	updatedBy: 'editor@signoz.io',
	schedule: buildSchedule({
		startTime: MOCK_DATE_1,
		timezone: 'Asia/Kolkata',
		recurrence: {
			duration: '2h',
			repeatType: AlertmanagertypesRepeatTypeDTO.weekly,
			repeatOn: [AlertmanagertypesRepeatOnDTO.monday],
		},
	}),
	alertIds: [],
});

const MOCK_DOWNTIME_2 = createMockDowntime({
	id: '2',
	name: MOCK_DOWNTIME_2_NAME,
	createdAt: MOCK_DATE_2,
	updatedAt: MOCK_DATE_2,
	schedule: buildSchedule({
		startTime: MOCK_DATE_2,
		timezone: 'UTC',
	}),
	alertIds: [],
});

const MOCK_DOWNTIME_3 = createMockDowntime({
	id: '3',
	name: MOCK_DOWNTIME_3_NAME,
	createdAt: MOCK_DATE_3,
	updatedAt: MOCK_DATE_3,
	schedule: buildSchedule({
		startTime: MOCK_DATE_3,
		timezone: 'UTC',
	}),
	alertIds: [],
});

const MOCK_DOWNTIME_RESPONSE: ListDowntimeSchedules200 = {
	data: [MOCK_DOWNTIME_1, MOCK_DOWNTIME_2, MOCK_DOWNTIME_3],
	status: 'success',
};

type DowntimeQueryResult = UseQueryResult<
	ListDowntimeSchedules200,
	ErrorType<RenderErrorResponseDTO>
>;

const mockDowntimeQueryResult: Partial<DowntimeQueryResult> = {
	data: MOCK_DOWNTIME_RESPONSE,
	isLoading: false,
	isFetching: false,
	isError: false,
	refetch: jest.fn(),
};

let mockUrlQuery: URLSearchParams;

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

jest.mock('api/generated/services/downtimeschedules', () => ({
	useListDowntimeSchedules: (): DowntimeQueryResult =>
		mockDowntimeQueryResult as DowntimeQueryResult,
	useDeleteDowntimeScheduleByID: (): {
		mutateAsync: jest.Mock;
		isLoading: false;
	} => ({
		mutateAsync: jest.fn(),
		isLoading: false,
	}),
}));

let mockRulesState: {
	data?: { data: Array<{ id: number | string; alert: string }> };
	isError: boolean;
	isLoading: boolean;
	isFetching: boolean;
} = {
	data: { data: [] },
	isError: false,
	isLoading: false,
	isFetching: false,
};

jest.mock('api/generated/services/rules', () => ({
	useListRules: (): typeof mockRulesState => mockRulesState,
}));

describe('PlannedDowntime Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUrlQuery = new URLSearchParams();
		mockAppLocation({
			pathname: '/alerts',
			search: '',
		});
		mockDowntimeQueryResult.data = MOCK_DOWNTIME_RESPONSE;
		mockRulesState = {
			data: { data: [] },
			isError: false,
			isLoading: false,
			isFetching: false,
		};
	});

	it('renders the header, search and create action', () => {
		renderPage();

		expect(screen.getByText('All planned downtimes')).toBeInTheDocument();
		expect(screen.getByTestId(SEARCH_TEST_ID)).toBeInTheDocument();
		expect(screen.getByTestId(CREATE_TEST_ID)).toHaveAttribute(
			'aria-disabled',
			'false',
		);
	});

	it('disables the "New downtime" button for users with VIEWER role', () => {
		renderPage(USER_ROLES.VIEWER);

		expect(screen.getByTestId(CREATE_TEST_ID)).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('should load with search term from URL query params', () => {
		const searchTerm = 'existing search';
		mockUrlQuery = new URLSearchParams({ search: searchTerm });

		renderPage();

		const searchInput = screen.getByTestId(SEARCH_TEST_ID) as HTMLInputElement;
		expect(searchInput.value).toBe(searchTerm);
	});

	it('should initialize with empty search when no search param is in URL', () => {
		renderPage();

		const searchInput = screen.getByTestId(SEARCH_TEST_ID) as HTMLInputElement;
		expect(searchInput.value).toBe('');
	});

	it('should display all downtime schedules when no search term is entered', async () => {
		renderPage();

		await expect(
			screen.findByText(MOCK_DOWNTIME_1_NAME),
		).resolves.toBeInTheDocument();
		expect(screen.getByText(MOCK_DOWNTIME_2_NAME)).toBeInTheDocument();
		expect(screen.getByText(MOCK_DOWNTIME_3_NAME)).toBeInTheDocument();
	});

	it('shows the key schedule details, timezone and duration, and hides secondary columns by default', async () => {
		renderPage();

		await screen.findByText(MOCK_DOWNTIME_1_NAME);
		expect(screen.getByText(/\(Asia\/Kolkata\)$/)).toBeInTheDocument();
		expect(screen.getByText('Weekly on Mon · 2h')).toBeInTheDocument();
		expect(screen.getAllByText('Asia/Kolkata').length).toBeGreaterThan(0);
		expect(screen.getAllByText('2h').length).toBeGreaterThan(0);
		expect(screen.queryByText('Database maintenance')).not.toBeInTheDocument();
		expect(screen.queryByText('creator@signoz.io')).not.toBeInTheDocument();
		expect(screen.queryByText('editor@signoz.io')).not.toBeInTheDocument();
		expect(screen.getAllByText('All alert rules')).toHaveLength(3);
		expect(screen.getAllByText('Active')).toHaveLength(3);
	});

	it('lets every data column but the last, which fills, be resized', async () => {
		renderPage();

		await screen.findByText(MOCK_DOWNTIME_1_NAME);
		const resizable = Array.from(document.querySelectorAll('th'))
			.filter((th) => th.querySelector('[title="Drag to resize column"]'))
			.map((th) => th.textContent?.trim());
		expect(resizable).toStrictEqual([
			'Downtime',
			'Status',
			'Schedule',
			'Timezone',
			'Repeats',
			'Duration',
		]);
	});

	it('should filter downtime schedules by name when searching', async () => {
		renderPage();

		await expect(
			screen.findByText(MOCK_DOWNTIME_1_NAME),
		).resolves.toBeInTheDocument();

		fireEvent.change(screen.getByTestId(SEARCH_TEST_ID), {
			target: { value: MOCK_DOWNTIME_1_NAME },
		});

		await expect(
			screen.findByText(MOCK_DOWNTIME_1_NAME),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_2_NAME)).not.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_3_NAME)).not.toBeInTheDocument();
	});

	it('should filter downtime schedules with partial name match', async () => {
		renderPage();

		await expect(
			screen.findByText(MOCK_DOWNTIME_1_NAME),
		).resolves.toBeInTheDocument();

		fireEvent.change(screen.getByTestId(SEARCH_TEST_ID), {
			target: { value: '2' },
		});

		await expect(
			screen.findByText(MOCK_DOWNTIME_2_NAME),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_1_NAME)).not.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_3_NAME)).not.toBeInTheDocument();
	});

	it('should show no results when search term matches nothing', async () => {
		renderPage();

		fireEvent.change(screen.getByTestId(SEARCH_TEST_ID), {
			target: { value: 'NonExistentDowntime' },
		});

		await expect(
			screen.findByTestId('no-results-empty-state'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText(MOCK_DOWNTIME_1_NAME)).not.toBeInTheDocument();
	});

	it('opens the delete confirmation from the row actions', async () => {
		renderPage();

		await userEvent.click(await screen.findByTestId('downtime-actions-1'));
		await userEvent.click(await screen.findByText('Delete'));

		await expect(
			screen.findByRole('button', { name: 'Delete Schedule' }),
		).resolves.toBeInTheDocument();
	});

	it('hides row actions for viewers', async () => {
		renderPage(USER_ROLES.VIEWER);

		await screen.findByText(MOCK_DOWNTIME_1_NAME);
		expect(screen.queryByTestId('downtime-actions-1')).not.toBeInTheDocument();
	});

	it('preserves existing query parameters such as sort and pagination when typing in search (Bug 54)', async () => {
		jest.useFakeTimers();
		mockAppLocation({
			pathname: '/alerts',
			search:
				'?tab=Configuration&subTab=planned-downtime&orderBy=name&order=asc&page=2&limit=20',
		});
		const navigateSpy = mockNavigate();

		renderPage();

		fireEvent.change(screen.getByTestId(SEARCH_TEST_ID), {
			target: { value: 'query' },
		});

		jest.advanceTimersByTime(350);

		expect(navigateSpy).toHaveBeenCalled();
		const callArg = navigateSpy.mock.calls[0][0];
		expect(callArg).toContain('tab=Configuration');
		expect(callArg).toContain('subTab=planned-downtime');
		expect(callArg).toContain('orderBy=name');
		expect(callArg).toContain('order=asc');
		expect(callArg).toContain('page=2');
		expect(callArg).toContain('limit=20');
		expect(callArg).toContain('search=query');

		jest.useRealTimers();
	});

	it('shows skeleton while alert rules are loading for scoped downtime (Bug 56)', async () => {
		mockRulesState = {
			data: undefined,
			isError: false,
			isLoading: true,
			isFetching: true,
		};
		const scopedDowntime = createMockDowntime({
			id: 'scoped-1',
			name: 'Scoped Downtime Loading',
			schedule: buildSchedule({ startTime: MOCK_DATE_1 }),
			alertIds: ['rule-1'],
		});
		mockDowntimeQueryResult.data = {
			data: [scopedDowntime],
			status: 'success',
		};

		renderPage();

		await screen.findByText('Scoped Downtime Loading');
		expect(screen.getByTestId('alerts-silenced-skeleton')).toBeInTheDocument();
		expect(screen.queryByText('All alert rules')).not.toBeInTheDocument();
	});

	it('shows "Unknown rule" when scoped rule IDs cannot be resolved (Bug 56)', async () => {
		mockRulesState = {
			data: { data: [] },
			isError: false,
			isLoading: false,
			isFetching: false,
		};
		const scopedDowntime = createMockDowntime({
			id: 'scoped-2',
			name: 'Scoped Downtime Deleted Rule',
			schedule: buildSchedule({ startTime: MOCK_DATE_1 }),
			alertIds: ['deleted-rule-id'],
		});
		mockDowntimeQueryResult.data = {
			data: [scopedDowntime],
			status: 'success',
		};

		renderPage();

		await screen.findByText('Scoped Downtime Deleted Rule');
		expect(screen.getByText('Unknown rule')).toBeInTheDocument();
		expect(screen.queryByText('All alert rules')).not.toBeInTheDocument();
	});

	it('shows resolved alert rule name when scoped rule ID exists', async () => {
		mockRulesState = {
			data: {
				data: [
					{
						id: 'rule-42',
						alert: 'Disk Space High',
					} as any,
				],
			},
			isError: false,
			isLoading: false,
			isFetching: false,
		};
		const scopedDowntime = createMockDowntime({
			id: 'scoped-3',
			name: 'Scoped Downtime Resolved',
			schedule: buildSchedule({ startTime: MOCK_DATE_1 }),
			alertIds: ['rule-42'],
		});
		mockDowntimeQueryResult.data = {
			data: [scopedDowntime],
			status: 'success',
		};

		renderPage();

		await screen.findByText('Scoped Downtime Resolved');
		expect(screen.getByText('Disk Space High')).toBeInTheDocument();
		expect(screen.queryByText('All alert rules')).not.toBeInTheDocument();
	});
});
