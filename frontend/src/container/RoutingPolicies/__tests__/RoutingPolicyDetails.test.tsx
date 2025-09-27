import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import RoutingPolicyDetails from '../RoutingPolicyDetails';
import {
	MOCK_CHANNEL_1,
	MOCK_CHANNEL_2,
	MOCK_ROUTING_POLICY_1,
} from './testUtils';

const mockHandlePolicyDetailsModalAction = jest.fn();
const mockCloseModal = jest.fn();
const mockChannels = [MOCK_CHANNEL_1, MOCK_CHANNEL_2];
const mockRoutingPolicy = MOCK_ROUTING_POLICY_1;

const NEW_NAME = 'New Name';
const NEW_EXPRESSION = 'New Expression';
const SAVE_BUTTON_TEXT = 'Save Routing Policy';

describe('RoutingPolicyDetails', () => {
	it('renders base create layout with header, 3 inputs and footer', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Create routing policy')).toBeInTheDocument();
		expect(screen.getByText('Routing Policy Name')).toBeInTheDocument();
		expect(screen.getByText('Expression')).toBeInTheDocument();
		expect(screen.getByText('Notification Channels')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: SAVE_BUTTON_TEXT }),
		).toBeInTheDocument();
	});

	it('renders base edit layout with header, 3 inputs and footer', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="edit"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Edit routing policy')).toBeInTheDocument();
		expect(screen.getByText('Routing Policy Name')).toBeInTheDocument();
		expect(screen.getByText('Expression')).toBeInTheDocument();
		expect(screen.getByText('Notification Channels')).toBeInTheDocument();

		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: SAVE_BUTTON_TEXT }),
		).toBeInTheDocument();
	});

	it('prefills inputs with existing policy values in edit mode', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="edit"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
			/>,
		);

		const nameInput = screen.getByDisplayValue(mockRoutingPolicy.name);
		expect(nameInput).toBeInTheDocument();

		const expressionTextarea = screen.getByDisplayValue(
			mockRoutingPolicy.expression,
		);
		expect(expressionTextarea).toBeInTheDocument();

		expect(screen.getByText(MOCK_CHANNEL_1.name)).toBeInTheDocument();
	});

	it('creating and saving the routing policy works correctly', async () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
			/>,
		);

		const nameInput = screen.getByPlaceholderText('e.g. Base routing policy...');
		expect(nameInput).toBeInTheDocument();

		const expressionTextarea = screen.getByPlaceholderText(
			'e.g. service.name = "payment" && threshold.name = "critical"',
		);
		expect(expressionTextarea).toBeInTheDocument();

		fireEvent.change(nameInput, { target: { value: NEW_NAME } });
		fireEvent.change(expressionTextarea, { target: { value: NEW_EXPRESSION } });

		const channelSelect = screen.getByRole('combobox');
		fireEvent.mouseDown(channelSelect);
		const channelOption = await screen.findByText('Channel 1');
		fireEvent.click(channelOption);

		// Wait for the form to be valid before submitting
		await waitFor(() => {
			expect(screen.getByDisplayValue(NEW_NAME)).toBeInTheDocument();
		});

		const saveButton = screen.getByRole('button', {
			name: 'Save Routing Policy',
		});
		fireEvent.click(saveButton);

		// Wait for the form submission to complete
		await waitFor(() => {
			expect(mockHandlePolicyDetailsModalAction).toHaveBeenCalled();
		});

		expect(mockHandlePolicyDetailsModalAction).toHaveBeenCalledWith('create', {
			name: NEW_NAME,
			expression: NEW_EXPRESSION,
			channels: ['1'],
		});
	});

	it('editing and saving the routing policy works correctly', async () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="edit"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
			/>,
		);

		const nameInput = screen.getByDisplayValue(mockRoutingPolicy.name);
		expect(nameInput).toBeInTheDocument();

		const expressionTextarea = screen.getByDisplayValue(
			mockRoutingPolicy.expression,
		);
		expect(expressionTextarea).toBeInTheDocument();

		fireEvent.change(nameInput, { target: { value: NEW_NAME } });
		fireEvent.change(expressionTextarea, { target: { value: NEW_EXPRESSION } });

		// Wait for the form to be valid before submitting
		await waitFor(() => {
			expect(screen.getByDisplayValue(NEW_NAME)).toBeInTheDocument();
		});

		const saveButton = screen.getByRole('button', {
			name: SAVE_BUTTON_TEXT,
		});
		fireEvent.click(saveButton);

		// Wait for the form submission to complete
		await waitFor(() => {
			expect(mockHandlePolicyDetailsModalAction).toHaveBeenCalled();
		});

		expect(mockHandlePolicyDetailsModalAction).toHaveBeenCalledWith('edit', {
			name: NEW_NAME,
			expression: NEW_EXPRESSION,
			channels: ['1'],
		});
	});

	it('should close modal when cancel button is clicked', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="edit"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
			/>,
		);

		const cancelButton = screen.getByRole('button', { name: 'Cancel' });
		fireEvent.click(cancelButton);
		expect(mockCloseModal).toHaveBeenCalled();
	});

	it('buttons should be disabled when loading', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="edit"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading
			/>,
		);

		const cancelButton = screen.getByRole('button', { name: 'Cancel' });
		expect(cancelButton).toBeDisabled();

		const saveButton = screen.getByRole('button', {
			name: new RegExp(SAVE_BUTTON_TEXT, 'i'),
		});
		expect(saveButton).toBeDisabled();
	});

	it('submit should not be called when inputs are invalid', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={mockChannels}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
			/>,
		);

		const saveButton = screen.getByRole('button', {
			name: SAVE_BUTTON_TEXT,
		});
		fireEvent.click(saveButton);

		expect(mockHandlePolicyDetailsModalAction).not.toHaveBeenCalled();
	});
});
