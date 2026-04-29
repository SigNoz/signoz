import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import * as getHostListsApi from 'api/infraMonitoring/getHostLists';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as useQueryBuilderHooks from 'hooks/queryBuilder/useQueryBuilder';
import * as useQueryBuilderOperations from 'hooks/queryBuilder/useQueryBuilderOperations';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import * as appContextHooks from 'providers/App/App';
import * as timezoneHooks from 'providers/Timezone';
import store from 'store';
import { LicenseEvent } from 'types/api/licensesV3/getActive';

import Hosts from '../Hosts';

jest.mock('lib/getMinMax', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		minTime: 1713734400000,
		maxTime: 1713738000000,
		isValidShortHandDateTimeFormat: jest.fn().mockReturnValue(true),
	})),
	getMinMaxForSelectedTime: jest.fn().mockReturnValue({
		minTime: 1713734400000000000,
		maxTime: 1713738000000000000,
	}),
}));
jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="date-time-selection">Date Time</div>
	),
}));
jest.mock('components/CustomTimePicker/CustomTimePicker', () => ({
	__esModule: true,
	default: ({ onSelect, selectedTime, selectedValue }: any): JSX.Element => (
		<div data-testid="custom-time-picker">
			<button onClick={(): void => onSelect('custom')}>
				{selectedTime} - {selectedValue}
			</button>
		</div>
	),
}));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

jest.mock('react-router-dom', () => {
	const ROUTES = jest.requireActual('constants/routes').default;
	return {
		...jest.requireActual('react-router-dom'),
		useLocation: jest.fn().mockReturnValue({
			pathname: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		}),
	};
});
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.spyOn(timezoneHooks, 'useTimezone').mockReturnValue({
	timezone: {
		offset: 0,
	},
	browserTimezone: {
		offset: 0,
	},
} as any);

jest.spyOn(getHostListsApi, 'getHostLists').mockResolvedValue({
	statusCode: 200,
	error: null,
	message: 'Success',
	payload: {
		status: 'success',
		data: {
			type: 'list',
			records: [
				{
					hostName: 'test-host',
					active: true,
					os: 'linux',
					cpu: 0.75,
					cpuTimeSeries: { labels: {}, labelsArray: [], values: [] },
					memory: 0.65,
					memoryTimeSeries: { labels: {}, labelsArray: [], values: [] },
					wait: 0.03,
					waitTimeSeries: { labels: {}, labelsArray: [], values: [] },
					load15: 0.5,
					load15TimeSeries: { labels: {}, labelsArray: [], values: [] },
				},
			],
			groups: null,
			total: 1,
			sentAnyHostMetricsData: true,
			isSendingK8SAgentMetrics: false,
			endTimeBeforeRetention: false,
		},
	},
	params: {} as any,
});

jest.spyOn(appContextHooks, 'useAppContext').mockReturnValue({
	user: {
		role: 'admin',
	},
	featureFlags: [],
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

jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue({
	currentQuery: initialQueriesMap.metrics,
	setSupersetQuery: jest.fn(),
	setLastUsedQuery: jest.fn(),
	handleSetConfig: jest.fn(),
	resetQuery: jest.fn(),
	updateAllQueriesOperators: jest.fn(),
} as any);

jest.spyOn(useQueryBuilderOperations, 'useQueryOperations').mockReturnValue({
	handleChangeQueryData: jest.fn(),
} as any);

const Wrapper = withNuqsTestingAdapter({ searchParams: {} });

describe('Hosts', () => {
	beforeEach(() => {
		queryClient.clear();
	});

	it('renders hosts list table', async () => {
		const { container } = render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<MemoryRouter>
						<Provider store={store}>
							<Hosts />
						</Provider>
					</MemoryRouter>
				</QueryClientProvider>
			</Wrapper>,
		);
		await waitFor(() => {
			expect(container.querySelector('.ant-table')).toBeInTheDocument();
		});
	});

	it('renders filters', async () => {
		const { container } = render(
			<Wrapper>
				<QueryClientProvider client={queryClient}>
					<MemoryRouter>
						<Provider store={store}>
							<Hosts />
						</Provider>
					</MemoryRouter>
				</QueryClientProvider>
			</Wrapper>,
		);
		await waitFor(() => {
			expect(container.querySelector('.filters')).toBeInTheDocument();
		});
	});
});
