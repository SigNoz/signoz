import { fireEvent, render, screen } from '@testing-library/react';
import * as appHooks from 'providers/App/App';
import { ROLES, USER_ROLES } from 'types/roles';

import RoutingPolicyListItem from '../RoutingPolicyListItem';
import { getAppContextMockState, MOCK_ROUTING_POLICY_1 } from './testUtils';

const mockFormatTimezoneAdjustedTimestamp = jest.fn();
jest.mock('providers/Timezone', () => ({
	useTimezone: (): any => ({
		formatTimezoneAdjustedTimestamp: mockFormatTimezoneAdjustedTimestamp,
	}),
}));

jest.spyOn(appHooks, 'useAppContext').mockReturnValue(getAppContextMockState());

const mockRoutingPolicy = MOCK_ROUTING_POLICY_1;
const mockHandlePolicyDetailsModalOpen = jest.fn();
const mockHandleDeleteModalOpen = jest.fn();

const EDIT_ROUTING_POLICY_TEST_ID = 'edit-routing-policy';
const DELETE_ROUTING_POLICY_TEST_ID = 'delete-routing-policy';

describe('RoutingPolicyListItem', () => {
	it('should render properly in collapsed state', () => {
		render(
			<RoutingPolicyListItem
				routingPolicy={mockRoutingPolicy}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
			/>,
		);
		expect(screen.getByText(mockRoutingPolicy.name)).toBeInTheDocument();
		expect(screen.getByTestId(EDIT_ROUTING_POLICY_TEST_ID)).toBeInTheDocument();
		expect(screen.getByTestId(DELETE_ROUTING_POLICY_TEST_ID)).toBeInTheDocument();
	});

	it('should render properly in expanded state', () => {
		render(
			<RoutingPolicyListItem
				routingPolicy={mockRoutingPolicy}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
			/>,
		);
		expect(screen.getByText(mockRoutingPolicy.name)).toBeInTheDocument();

		fireEvent.click(screen.getByText(mockRoutingPolicy.name));

		expect(screen.getByText(mockRoutingPolicy.expression)).toBeInTheDocument();
		expect(screen.getByText(mockRoutingPolicy.channels[0])).toBeInTheDocument();
		expect(
			screen.getByText(mockRoutingPolicy.createdBy || 'user1@signoz.io'),
		).toBeInTheDocument();
		expect(
			screen.getByText(mockRoutingPolicy.description || 'description 1'),
		).toBeInTheDocument();
	});

	it('should call handlePolicyDetailsModalOpen when edit button is clicked', () => {
		render(
			<RoutingPolicyListItem
				routingPolicy={mockRoutingPolicy}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
			/>,
		);
		fireEvent.click(screen.getByTestId(EDIT_ROUTING_POLICY_TEST_ID));
		expect(mockHandlePolicyDetailsModalOpen).toHaveBeenCalledWith(
			'edit',
			mockRoutingPolicy,
		);
	});

	it('should call handleDeleteModalOpen when delete button is clicked', () => {
		render(
			<RoutingPolicyListItem
				routingPolicy={mockRoutingPolicy}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
			/>,
		);
		fireEvent.click(screen.getByTestId(DELETE_ROUTING_POLICY_TEST_ID));
		expect(mockHandleDeleteModalOpen).toHaveBeenCalledWith(mockRoutingPolicy);
	});

	it('edit and delete buttons should not be rendered for viewer role', () => {
		jest
			.spyOn(appHooks, 'useAppContext')
			.mockReturnValue(
				getAppContextMockState({ role: USER_ROLES.VIEWER as ROLES }),
			);
		render(
			<RoutingPolicyListItem
				routingPolicy={mockRoutingPolicy}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
			/>,
		);
		expect(
			screen.queryByTestId(EDIT_ROUTING_POLICY_TEST_ID),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId(DELETE_ROUTING_POLICY_TEST_ID),
		).not.toBeInTheDocument();
	});

	it('in details panel, show "-" for undefined values', () => {
		render(
			<RoutingPolicyListItem
				routingPolicy={mockRoutingPolicy}
				handlePolicyDetailsModalOpen={mockHandlePolicyDetailsModalOpen}
				handleDeleteModalOpen={mockHandleDeleteModalOpen}
			/>,
		);

		// Expand the details panel
		fireEvent.click(screen.getByText(mockRoutingPolicy.name));

		const updatedByRow = screen.getByText('Updated by').parentElement;
		expect(updatedByRow).toHaveTextContent('-');

		const updatedOnRow = screen.getByText('Updated on').parentElement;
		expect(updatedOnRow).toHaveTextContent('-');
	});
});
