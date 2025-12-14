/* eslint-disable react/button-has-type */
import { render } from '@testing-library/react';
import ROUTES from 'constants/routes';
import * as useGetHostListHooks from 'hooks/infraMonitoring/useGetHostList';
import * as appContextHooks from 'providers/App/App';
import * as timezoneHooks from 'providers/Timezone';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { LicenseEvent } from 'types/api/licensesV3/getActive';

import HostsList from '../HostsList';

jest.mock('lib/getMinMax', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		minTime: 1713734400000,
		maxTime: 1713738000000,
		isValidTimeFormat: jest.fn().mockReturnValue(true),
	})),
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

const queryClient = new QueryClient();

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		globalTime: {
			selectedTime: {
				startTime: 1713734400000,
				endTime: 1713738000000,
			},
			maxTime: 1713738000000,
			minTime: 1713734400000,
		},
	}),
}));
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: jest.fn().mockReturnValue({
		pathname: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
	}),
}));
jest.mock('react-router-dom-v5-compat', () => {
	const actual = jest.requireActual('react-router-dom-v5-compat');
	return {
		...actual,
		useSearchParams: jest
			.fn()
			.mockReturnValue([
				{ get: jest.fn(), entries: jest.fn().mockReturnValue([]) },
				jest.fn(),
			]),
		useNavigationType: (): any => 'PUSH',
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
jest.spyOn(useGetHostListHooks, 'useGetHostList').mockReturnValue({
	data: {
		payload: {
			data: {
				records: [
					{
						hostName: 'test-host',
						active: true,
						cpu: 0.75,
						memory: 0.65,
						wait: 0.03,
					},
				],
				isSendingK8SAgentMetrics: false,
				sentAnyHostMetricsData: true,
			},
		},
	},
	isLoading: false,
	isError: false,
} as any);
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

describe('HostsList', () => {
	it('renders hosts list table', () => {
		const { container } = render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<Provider store={store}>
						<HostsList />
					</Provider>
				</MemoryRouter>
			</QueryClientProvider>,
		);
		expect(container.querySelector('.hosts-list-table')).toBeInTheDocument();
	});

	it('renders filters', () => {
		const { container } = render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<Provider store={store}>
						<HostsList />
					</Provider>
				</MemoryRouter>
			</QueryClientProvider>,
		);
		expect(container.querySelector('.filters')).toBeInTheDocument();
	});
});
