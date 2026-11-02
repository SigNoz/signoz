import * as appHooks from 'providers/App/App';
import { fireEvent, render, screen } from 'tests/test-utils';

import RoutingPolicies from '../RoutingPolicies';
import * as routingPoliciesHooks from '../useRoutingPolicies';
import {
	getAppContextMockState,
	getUseRoutingPoliciesMockData,
	MOCK_ROUTING_POLICY_1,
} from './testUtils';

const ROUTING_POLICY_DETAILS_TEST_ID = 'routing-policy-details';
const SEARCH_TEST_ID = 'routing-policies-search';
const CREATE_TEST_ID = 'routing-policies-create';

jest.spyOn(appHooks, 'useAppContext').mockReturnValue(getAppContextMockState());

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
	});

	it('should render components properly', () => {
		render(<RoutingPolicies />);
		expect(screen.getByText('Routing Policies')).toBeInTheDocument();
		expect(screen.getByTestId(SEARCH_TEST_ID)).toBeInTheDocument();
		expect(screen.getByTestId(CREATE_TEST_ID)).toBeInTheDocument();
		expect(screen.getByTestId('routing-policy-list')).toBeInTheDocument();
		expect(
			screen.queryByTestId(ROUTING_POLICY_DETAILS_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('delete-routing-policy')).not.toBeInTheDocument();
	});

	it('should enable the "New routing policy" button for users with ADMIN role', () => {
		render(<RoutingPolicies />);
		expect(screen.getByTestId(CREATE_TEST_ID)).toHaveAttribute(
			'aria-disabled',
			'false',
		);
	});

	it('should disable the "New routing policy" button for users with VIEWER role', () => {
		jest
			.spyOn(appHooks, 'useAppContext')
			.mockReturnValueOnce(getAppContextMockState({ role: 'VIEWER' }));
		render(<RoutingPolicies />);
		expect(screen.getByTestId(CREATE_TEST_ID)).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('filters routing policies by search term', () => {
		render(<RoutingPolicies />);
		const searchInput = screen.getByTestId(SEARCH_TEST_ID);
		fireEvent.change(searchInput, {
			target: { value: MOCK_ROUTING_POLICY_1.name },
		});

		expect(mockHandleSearch).toHaveBeenCalledWith(MOCK_ROUTING_POLICY_1.name);
	});

	it('clicking on the "New routing policy" button opens the policy details modal', () => {
		render(<RoutingPolicies />);
		fireEvent.click(screen.getByTestId(CREATE_TEST_ID));
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

	it('should show the current search term', () => {
		const searchTerm = 'existing search';
		jest.spyOn(routingPoliciesHooks, 'default').mockReturnValue(
			getUseRoutingPoliciesMockData({
				searchTerm,
			}),
		);

		render(<RoutingPolicies />);

		const searchInput = screen.getByTestId(SEARCH_TEST_ID) as HTMLInputElement;
		expect(searchInput.value).toBe(searchTerm);
	});

	it('should show an empty search when there is no search term', () => {
		jest.spyOn(routingPoliciesHooks, 'default').mockReturnValue(
			getUseRoutingPoliciesMockData({
				searchTerm: '',
			}),
		);

		render(<RoutingPolicies />);

		const searchInput = screen.getByTestId(SEARCH_TEST_ID) as HTMLInputElement;
		expect(searchInput.value).toBe('');
	});
});
