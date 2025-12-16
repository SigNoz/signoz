import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as appHooks from 'providers/App/App';

import RoutingPolicyDetails from '../RoutingPolicyDetails';
import {
	getAppContextMockState,
	MOCK_CHANNEL_1,
	MOCK_CHANNEL_2,
	MOCK_ROUTING_POLICY_1,
} from './testUtils';

jest.spyOn(appHooks, 'useAppContext').mockReturnValue(getAppContextMockState());

const mockHandlePolicyDetailsModalAction = jest.fn();
const mockCloseModal = jest.fn();
const mockChannels = [MOCK_CHANNEL_1, MOCK_CHANNEL_2];
const mockRoutingPolicy = MOCK_ROUTING_POLICY_1;
const mockRefreshChannels = jest.fn();

const NEW_NAME = 'New Name';
const NEW_EXPRESSION = 'New Expression';
const NEW_DESCRIPTION = 'New Description';
const SAVE_BUTTON_TEXT = 'Save Routing Policy';
const NO_CHANNELS_FOUND_TEXT = 'No channels yet.';

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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const nameInput = screen.getByPlaceholderText('e.g. Base routing policy...');
		expect(nameInput).toBeInTheDocument();

		const expressionTextarea = screen.getByPlaceholderText(
			'e.g. service.name == "payment" && threshold.name == "critical"',
		);
		expect(expressionTextarea).toBeInTheDocument();

		const descriptionTextarea = screen.getByPlaceholderText(
			'e.g. This is a routing policy that...',
		);
		expect(descriptionTextarea).toBeInTheDocument();

		fireEvent.change(nameInput, { target: { value: NEW_NAME } });
		fireEvent.change(expressionTextarea, { target: { value: NEW_EXPRESSION } });
		fireEvent.change(descriptionTextarea, { target: { value: NEW_DESCRIPTION } });

		const channelSelect = screen.getByRole('combobox');
		fireEvent.mouseDown(channelSelect);
		const channelOptions = await screen.findAllByText('Channel 1');
		fireEvent.click(channelOptions[1]);

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
			description: NEW_DESCRIPTION,
			channels: ['Channel 1'],
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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const nameInput = screen.getByDisplayValue(mockRoutingPolicy.name);
		expect(nameInput).toBeInTheDocument();

		const expressionTextarea = screen.getByDisplayValue(
			mockRoutingPolicy.expression,
		);
		expect(expressionTextarea).toBeInTheDocument();

		const descriptionTextarea = screen.getByDisplayValue(
			mockRoutingPolicy.description || 'description 1',
		);
		expect(descriptionTextarea).toBeInTheDocument();

		fireEvent.change(nameInput, { target: { value: NEW_NAME } });
		fireEvent.change(expressionTextarea, { target: { value: NEW_EXPRESSION } });
		fireEvent.change(descriptionTextarea, { target: { value: NEW_DESCRIPTION } });

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
			description: NEW_DESCRIPTION,
			channels: ['Channel 1'],
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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const cancelButton = screen.getByRole('button', { name: 'Cancel' });
		expect(cancelButton).toBeDisabled();

		const saveButton = screen.getByRole('button', {
			name: new RegExp(SAVE_BUTTON_TEXT, 'i'),
		});
		expect(saveButton).toBeDisabled();
		expect(saveButton.querySelector('svg')).toBeInTheDocument();
		expect(saveButton.querySelector('svg')).toHaveAttribute(
			'data-icon',
			'loading',
		);
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
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const saveButton = screen.getByRole('button', {
			name: SAVE_BUTTON_TEXT,
		});
		fireEvent.click(saveButton);

		expect(mockHandlePolicyDetailsModalAction).not.toHaveBeenCalled();
	});

	it('notification channels select should be disabled when channels are loading', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={[]}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
				isErrorChannels={false}
				isLoadingChannels
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const channelSelect = screen.getByRole('combobox');
		expect(channelSelect).toBeDisabled();
	});

	it('should show error state when channels fail to load', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={[]}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
				isErrorChannels
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const channelSelect = screen.getByRole('combobox');
		const selectContainer = channelSelect.closest('.ant-select');
		expect(selectContainer).toHaveClass('ant-select-status-error');
	});

	it('should show empty state when no channels are available', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={[]}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const channelSelect = screen.getByRole('combobox');
		fireEvent.mouseDown(channelSelect);

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
	});

	it('should show create channel button for admin users in empty state', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={[]}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const channelSelect = screen.getByRole('combobox');
		fireEvent.mouseDown(channelSelect);

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
		expect(screen.getByText('Create one')).toBeInTheDocument();
	});

	it('should show admin message for non-admin users in empty state', () => {
		jest
			.spyOn(appHooks, 'useAppContext')
			.mockReturnValue(getAppContextMockState({ role: 'VIEWER' }));

		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={[]}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const channelSelect = screen.getByRole('combobox');
		fireEvent.mouseDown(channelSelect);

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText('Please ask your admin to create one.'),
		).toBeInTheDocument();
		expect(screen.queryByText('Create one')).not.toBeInTheDocument();
	});

	it('should call refreshChannels when refresh button is clicked in empty state', () => {
		render(
			<RoutingPolicyDetails
				routingPolicy={mockRoutingPolicy}
				closeModal={mockCloseModal}
				mode="create"
				channels={[]}
				handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
				isPolicyDetailsModalActionLoading={false}
				isErrorChannels={false}
				isLoadingChannels={false}
				refreshChannels={mockRefreshChannels}
			/>,
		);

		const channelSelect = screen.getByRole('combobox');
		fireEvent.mouseDown(channelSelect);

		const refreshButton = screen.getByText('Refresh');
		expect(refreshButton).toBeInTheDocument();

		fireEvent.click(refreshButton);
		expect(mockRefreshChannels).toHaveBeenCalledTimes(1);
	});
});
