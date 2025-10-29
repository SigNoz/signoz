import { screen } from '@testing-library/react';
import {
	mockLocation,
	mockQueryParams,
} from 'container/RoutingPolicies/__tests__/testUtils';
import { render } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import { PlannedDowntime } from '../PlannedDowntime';

const SEARCH_PLACEHOLDER = 'Search for a planned downtime...';

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

		render(<PlannedDowntime />, {}, { role: 'ADMIN' });

		const searchInput = screen.getByPlaceholderText(
			SEARCH_PLACEHOLDER,
		) as HTMLInputElement;
		expect(searchInput.value).toBe(searchTerm);
	});

	it('should initialize with empty search when no search param is in URL', () => {
		mockUrlQuery = mockQueryParams({});

		render(<PlannedDowntime />, {}, { role: 'ADMIN' });

		const searchInput = screen.getByPlaceholderText(
			SEARCH_PLACEHOLDER,
		) as HTMLInputElement;
		expect(searchInput.value).toBe('');
	});
});
