import { fireEvent, render, screen } from '@testing-library/react';
import * as appHooks from 'providers/App/App';

import RoutingPolicies from '../RoutingPolicies';
import * as routingPoliciesHooks from '../useRoutingPolicies';
import {
	getAppContextMockState,
	getUseRoutingPoliciesMockData,
	MOCK_ROUTING_POLICY_1,
	mockLocation,
	mockQueryParams,
} from './testUtils';

const ROUTING_POLICY_DETAILS_TEST_ID = 'routing-policy-details';
const SEARCH_PLACEHOLDER = 'Search for a routing policy...';

jest.spyOn(appHooks, 'useAppContext').mockReturnValue(getAppContextMockState());

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): URLSearchParams => mockQueryParams({}),
}));

const mockHistoryReplace = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useHistory: (): any => ({
		replace: mockHistoryReplace,
	}),
	useLocation: (): any => ({
		pathname: '/alerts',
		search: '',
		hash: '',
		state: null,
	}),
}));

jest.mock('../RoutingPolicyList', () => ({
	__esModule: true,
	default: jest.fn(() => (
		<div data-testid="routing-policy-list">RoutingPolicyList</div>
	)),
}));
jest.mock('../RoutingPolicyDetails', () => ({
	__esModule: true,
	default: jest.fn(() => (
		<div data-testid="routing-policy-details">RoutingPolicyDetails</div>
	)),
}));
jest.mock('../DeleteRoutingPolicy', () => ({
	__esModule: true,
	default: jest.fn(() => (
		<div data-testid="delete-routing-policy">DeleteRoutingPolicy</div>
	)),
}));

const mockHandleSearch = jest.fn();
const mockHandlePolicyDetailsModalOpen = jest.fn();
jest.spyOn(routingPoliciesHooks, 'default').mockReturnValue(
	getUseRoutingPoliciesMockData({
		setSearchTerm: mockHandleSearch,
		handlePolicyDetailsModalOpen: mockHandlePolicyDetailsModalOpen,
	}),
);

describe('RoutingPolicies', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockQueryParams({});
		mockLocation('/alerts');
	});

	it('should render components properly', () => {
		render(<RoutingPolicies />);
		expect(screen.getByText('Routing Policies')).toBeInTheDocument();
		expect(
			screen.getByText('Create and manage routing policies.'),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /New routing policy/ }),
		).toBeInTheDocument();
		expect(screen.getByTestId('routing-policy-list')).toBeInTheDocument();
		expect(
			screen.queryByTestId(ROUTING_POLICY_DETAILS_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('delete-routing-policy')).not.toBeInTheDocument();
	});

	it('should enable the "New routing policy" button for users with ADMIN role', () => {
		render(<RoutingPolicies />);
		expect(
			screen.getByRole('button', { name: /New routing policy/ }),
		).toBeEnabled();
	});

	it('should disable the "New routing policy" button for users with VIEWER role', () => {
		jest
			.spyOn(appHooks, 'useAppContext')
			.mockReturnValueOnce(getAppContextMockState({ role: 'VIEWER' }));
		render(<RoutingPolicies />);
		expect(
			screen.getByRole('button', { name: /New routing policy/ }),
		).toBeDisabled();
	});

	it('filters routing policies by search term', () => {
		render(<RoutingPolicies />);
		const searchInput = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);
		fireEvent.change(searchInput, {
			target: { value: MOCK_ROUTING_POLICY_1.name },
		});

		expect(mockHandleSearch).toHaveBeenCalledWith(MOCK_ROUTING_POLICY_1.name);
	});

	it('clicking on the "New routing policy" button opens the policy details modal', () => {
		render(<RoutingPolicies />);
		const newRoutingPolicyButton = screen.getByRole('button', {
			name: /New routing policy/,
		});
		fireEvent.click(newRoutingPolicyButton);
		expect(mockHandlePolicyDetailsModalOpen).toHaveBeenCalledWith('create', null);
	});

	it('policy details modal is open based on modal state', () => {
		jest.spyOn(routingPoliciesHooks, 'default').mockReturnValue(
			getUseRoutingPoliciesMockData({
				policyDetailsModalState: {
					mode: 'create',
					isOpen: true,
				},
			}),
		);
		render(<RoutingPolicies />);
		expect(
			screen.getByTestId(ROUTING_POLICY_DETAILS_TEST_ID),
		).toBeInTheDocument();
	});

	it('delete modal is open based on modal state', () => {
		jest.spyOn(routingPoliciesHooks, 'default').mockReturnValue(
			getUseRoutingPoliciesMockData({
				isDeleteModalOpen: true,
			}),
		);
		render(<RoutingPolicies />);
		expect(screen.getByTestId('delete-routing-policy')).toBeInTheDocument();
	});

	it('should load with search term from URL query params', () => {
		const searchTerm = 'existing search';
		mockQueryParams({ search: searchTerm });
		jest.spyOn(routingPoliciesHooks, 'default').mockReturnValue(
			getUseRoutingPoliciesMockData({
				searchTerm,
			}),
		);

		render(<RoutingPolicies />);

		const searchInput = screen.getByPlaceholderText(
			SEARCH_PLACEHOLDER,
		) as HTMLInputElement;
		expect(searchInput.value).toBe(searchTerm);
	});

	it('should initialize with empty search when no search param is in URL', () => {
		mockQueryParams({});
		jest.spyOn(routingPoliciesHooks, 'default').mockReturnValue(
			getUseRoutingPoliciesMockData({
				searchTerm: '',
			}),
		);

		render(<RoutingPolicies />);

		const searchInput = screen.getByPlaceholderText(
			SEARCH_PLACEHOLDER,
		) as HTMLInputElement;
		expect(searchInput.value).toBe('');
	});
});
