import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { server } from 'mocks-server/server';
import {
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	RoutePolicyAttachPermission,
	RoutePolicyCreatePermission,
	RoutePolicyListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';

import RoutingPolicies from '../RoutingPolicies';
import * as routingPoliciesHooks from '../useRoutingPolicies';
import {
	getUseRoutingPoliciesMockData,
	MOCK_ROUTING_POLICY_1,
} from './testUtils';

const ROUTING_POLICY_DETAILS_TEST_ID = 'routing-policy-details';
const SEARCH_TEST_ID = 'routing-policies-search';
const CREATE_TEST_ID = 'routing-policies-create';

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
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	async function waitForCreateEnabled(): Promise<void> {
		await waitFor(() =>
			expect(screen.getByTestId(CREATE_TEST_ID)).toHaveAttribute(
				'aria-disabled',
				'false',
			),
		);
	}

	it('should render components properly', async () => {
		render(<RoutingPolicies />);
		await expect(
			screen.findByTestId('routing-policy-list'),
		).resolves.toBeInTheDocument();
		expect(screen.getByText('All routing policies')).toBeInTheDocument();
		expect(screen.getByTestId(SEARCH_TEST_ID)).toBeInTheDocument();
		expect(screen.getByTestId(CREATE_TEST_ID)).toBeInTheDocument();
		expect(
			screen.queryByTestId(ROUTING_POLICY_DETAILS_TEST_ID),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('delete-routing-policy')).not.toBeInTheDocument();
	});

	it('enables "New Routing Policy" with create and attach', async () => {
		render(<RoutingPolicies />);
		await waitForCreateEnabled();
		expect(screen.getByTestId(CREATE_TEST_ID)).not.toHaveAttribute(
			'data-denied-permissions',
		);
	});

	it('disables "New Routing Policy" without attach and names it', async () => {
		server.use(
			setupAuthzAllow(RoutePolicyListPermission, RoutePolicyCreatePermission),
		);
		render(<RoutingPolicies />);

		await waitFor(() =>
			expect(screen.getByTestId(CREATE_TEST_ID)).toHaveAttribute(
				'data-denied-permissions',
				RoutePolicyAttachPermission,
			),
		);
		expect(screen.getByTestId(CREATE_TEST_ID)).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('shows a permission callout instead of the list without list', async () => {
		server.use(setupAuthzDenyAll());
		render(<RoutingPolicies />);

		await expect(
			screen.findByText('list:route-policy:*'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('routing-policy-list')).not.toBeInTheDocument();
		expect(screen.getByTestId(SEARCH_TEST_ID)).toBeDisabled();
	});

	it('filters routing policies by search term', async () => {
		render(<RoutingPolicies />);
		const searchInput = screen.getByTestId(SEARCH_TEST_ID);
		await waitFor(() => expect(searchInput).toBeEnabled());
		fireEvent.change(searchInput, {
			target: { value: MOCK_ROUTING_POLICY_1.name },
		});

		expect(mockHandleSearch).toHaveBeenCalledWith(MOCK_ROUTING_POLICY_1.name);
	});

	it('clicking on the "New routing policy" button opens the policy details modal', async () => {
		render(<RoutingPolicies />);
		await waitForCreateEnabled();
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
