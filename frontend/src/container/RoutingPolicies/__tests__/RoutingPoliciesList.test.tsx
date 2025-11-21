import { fireEvent, render, screen } from '@testing-library/react';

import RoutingPoliciesList from '../RoutingPolicyList';
import { RoutingPolicyListItemProps } from '../types';
import { getUseRoutingPoliciesMockData } from './testUtils';

const useRoutingPolicesMockData = getUseRoutingPoliciesMockData();
const mockHandlePolicyDetailsModalOpen = jest.fn();
const mockHandleDeleteModalOpen = jest.fn();
const mockRefetchRoutingPolicies = jest.fn();

jest.mock('../RoutingPolicyListItem', () => ({
	__esModule: true,
	default: jest.fn(({ routingPolicy }: RoutingPolicyListItemProps) => (
		<div data-testid="routing-policy-list-item">{routingPolicy.name}</div>
	)),
}));

const ROUTING_POLICY_LIST_ITEM_TEST_ID = 'routing-policy-list-item';

describe('RoutingPoliciesList', () => {
	it('renders base layout with routing policies', () => {
		render(
			<RoutingPoliciesList
				routingPolicies={useRoutingPolicesMockData.routingPoliciesData}
				isRoutingPoliciesLoading={
					useRoutingPolicesMockData.isLoadingRoutingPolicies
				}
				isRoutingPoliciesError={useRoutingPolicesMockData.isErrorRoutingPolicies}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
				hasSearchTerm={false}
				refetchRoutingPolicies={mockRefetchRoutingPolicies}
				isRoutingPoliciesFetching={false}
			/>,
		);

		const routingPolicyItems = screen.getAllByTestId(
			ROUTING_POLICY_LIST_ITEM_TEST_ID,
		);
		expect(routingPolicyItems).toHaveLength(2);
		expect(routingPolicyItems[0]).toHaveTextContent(
			useRoutingPolicesMockData.routingPoliciesData[0].name,
		);
		expect(routingPolicyItems[1]).toHaveTextContent(
			useRoutingPolicesMockData.routingPoliciesData[1].name,
		);
	});

	it('renders loading state', () => {
		render(
			<RoutingPoliciesList
				routingPolicies={useRoutingPolicesMockData.routingPoliciesData}
				isRoutingPoliciesLoading
				isRoutingPoliciesError={false}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
				hasSearchTerm={false}
				refetchRoutingPolicies={mockRefetchRoutingPolicies}
				isRoutingPoliciesFetching={false}
			/>,
		);
		// Check for loading spinner by class name
		expect(document.querySelector('.ant-spin-spinning')).toBeInTheDocument();
		// Check that the table is in loading state (blurred)
		expect(document.querySelector('.ant-spin-blur')).toBeInTheDocument();
	});

	it('renders loading state when data is being fetched', () => {
		render(
			<RoutingPoliciesList
				routingPolicies={useRoutingPolicesMockData.routingPoliciesData}
				isRoutingPoliciesLoading={false}
				isRoutingPoliciesError={false}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
				hasSearchTerm={false}
				refetchRoutingPolicies={mockRefetchRoutingPolicies}
				isRoutingPoliciesFetching
			/>,
		);
		// Check for loading spinner by class name
		expect(document.querySelector('.ant-spin-spinning')).toBeInTheDocument();
		// Check that the table is in loading state (blurred)
		expect(document.querySelector('.ant-spin-blur')).toBeInTheDocument();
	});

	it('renders error state', () => {
		render(
			<RoutingPoliciesList
				routingPolicies={[]}
				isRoutingPoliciesLoading={false}
				isRoutingPoliciesError
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
				hasSearchTerm={false}
				refetchRoutingPolicies={mockRefetchRoutingPolicies}
				isRoutingPoliciesFetching={false}
			/>,
		);
		expect(
			screen.getByText('Something went wrong while fetching routing policies.'),
		).toBeInTheDocument();

		const retryButton = screen.getByRole('button', { name: 'Retry' });
		expect(retryButton).toBeInTheDocument();
		fireEvent.click(retryButton);
		expect(mockRefetchRoutingPolicies).toHaveBeenCalled();
	});

	it('renders empty state', () => {
		render(
			<RoutingPoliciesList
				routingPolicies={[]}
				isRoutingPoliciesLoading={false}
				isRoutingPoliciesError={false}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
				hasSearchTerm={false}
				refetchRoutingPolicies={mockRefetchRoutingPolicies}
				isRoutingPoliciesFetching={false}
			/>,
		);
		expect(screen.getByText('No routing policies yet,')).toBeInTheDocument();
	});
});
