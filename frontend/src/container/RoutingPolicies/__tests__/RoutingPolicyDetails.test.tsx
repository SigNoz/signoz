import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
	NotificationChannelCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRoutePolicyAttachPermission,
	buildRoutePolicyReadPermission,
	buildRoutePolicyUpdatePermission,
	RoutePolicyAttachPermission,
	RoutePolicyCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';

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
const mockRefreshChannels = jest.fn();

const NEW_NAME = 'New Name';
const NEW_EXPRESSION = 'New Expression';
const NEW_DESCRIPTION = 'New Description';
const SAVE_BUTTON_TEXT = 'Save Routing Policy';
const NO_CHANNELS_FOUND_TEXT = 'No channels yet.';
const SAVE_TEST_ID = 'routing-policy-save';

async function waitForSaveEnabled(): Promise<void> {
	await waitFor(() => expect(screen.getByTestId(SAVE_TEST_ID)).toBeEnabled());
}

function renderDetails(mode: 'create' | 'edit', channels = mockChannels): void {
	render(
		<RoutingPolicyDetails
			routingPolicy={mockRoutingPolicy}
			closeModal={mockCloseModal}
			mode={mode}
			channels={channels}
			handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
			isPolicyDetailsModalActionLoading={false}
			isErrorChannels={false}
			isLoadingChannels={false}
			refreshChannels={mockRefreshChannels}
		/>,
	);
}

/** The picker's option row for a channel; antd renders it outside our markup. */
async function findChannelOption(name: string): Promise<HTMLElement> {
	fireEvent.mouseDown(screen.getByRole('combobox'));
	const matches = await screen.findAllByText(name);
	const option = matches
		.map((el) => el.closest<HTMLElement>('.ant-select-item-option'))
		.find(Boolean);
	if (!option) {
		throw new Error(`No picker option for ${name}`);
	}
	return option;
}

describe('RoutingPolicyDetails', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

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

		await waitForSaveEnabled();
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

		await waitForSaveEnabled();
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

	it('offers to create a channel with notification-channel:create', async () => {
		renderDetails('create', []);

		fireEvent.mouseDown(screen.getByRole('combobox'));

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
		await expect(screen.findByText('Create one')).resolves.toBeInTheDocument();
	});

	it('asks for an admin without notification-channel:create', async () => {
		server.use(setupAuthzDeny(NotificationChannelCreatePermission));
		renderDetails('create', []);

		fireEvent.mouseDown(screen.getByRole('combobox'));

		await expect(
			screen.findByText('Please ask your admin to create one.'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText('Create one')).not.toBeInTheDocument();
	});

	describe('authz', () => {
		const POLICY_ID = mockRoutingPolicy.id;
		const LINKED = MOCK_CHANNEL_1;
		const UNLINKED = MOCK_CHANNEL_2;

		it('opens read-only with Save disabled without update', async () => {
			server.use(setupAuthzAllow(buildRoutePolicyReadPermission(POLICY_ID)));
			renderDetails('edit');

			await waitFor(() =>
				expect(screen.getByDisplayValue(mockRoutingPolicy.name)).toBeDisabled(),
			);
			expect(screen.getByTestId(SAVE_TEST_ID)).toBeDisabled();
		});

		it('names update when Save is denied on edit', async () => {
			server.use(setupAuthzDeny(buildRoutePolicyUpdatePermission(POLICY_ID)));
			renderDetails('edit');

			await waitFor(() =>
				expect(screen.getByTestId(SAVE_TEST_ID)).toHaveAttribute(
					'data-denied-permissions',
					buildRoutePolicyUpdatePermission(POLICY_ID),
				),
			);
		});

		it('disables Save on create without attach on routing policies', async () => {
			server.use(setupAuthzDeny(RoutePolicyAttachPermission));
			renderDetails('create');

			await waitFor(() =>
				expect(screen.getByTestId(SAVE_TEST_ID)).toHaveAttribute(
					'data-denied-permissions',
					RoutePolicyAttachPermission,
				),
			);
			expect(screen.getByTestId(SAVE_TEST_ID)).toBeDisabled();
		});

		it('enables Save on create with create and attach', async () => {
			server.use(
				setupAuthzAllow(RoutePolicyCreatePermission, RoutePolicyAttachPermission),
			);
			renderDetails('create');

			await waitForSaveEnabled();
			expect(screen.getByTestId(SAVE_TEST_ID)).not.toHaveAttribute(
				'data-denied-permissions',
			);
		});

		it('disables a channel the user cannot attach, naming the permission', async () => {
			server.use(
				setupAuthzDeny(buildNotificationChannelAttachPermission(UNLINKED.id)),
			);
			renderDetails('edit');
			await waitForSaveEnabled();

			const option = await findChannelOption(UNLINKED.name);
			await waitFor(() =>
				expect(option).toHaveClass('ant-select-item-option-disabled'),
			);
			expect(option.getAttribute('title')).toContain(
				`attach:notification-channel:${UNLINKED.id}`,
			);
		});

		it('locks a linked channel the user cannot detach', async () => {
			server.use(
				setupAuthzDeny(buildNotificationChannelDetachPermission(LINKED.id)),
			);
			renderDetails('edit');
			await waitForSaveEnabled();

			const linked = await findChannelOption(LINKED.name);
			await waitFor(() =>
				expect(linked).toHaveClass('ant-select-item-option-disabled'),
			);
			expect(linked.getAttribute('title')).toContain(
				`detach:notification-channel:${LINKED.id}`,
			);
			await expect(findChannelOption(UNLINKED.name)).resolves.not.toHaveClass(
				'ant-select-item-option-disabled',
			);
		});

		it('blocks adding channels without attach on the policy', async () => {
			server.use(setupAuthzDeny(buildRoutePolicyAttachPermission(POLICY_ID)));
			renderDetails('edit');
			await waitForSaveEnabled();

			const option = await findChannelOption(UNLINKED.name);
			await waitFor(() =>
				expect(option).toHaveClass('ant-select-item-option-disabled'),
			);
			expect(option.getAttribute('title')).toContain(
				`attach:route-policy:${POLICY_ID}`,
			);
		});

		it('leaves channels pickable on create when the check fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			);
			renderDetails('create');

			const option = await findChannelOption(UNLINKED.name);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(option).not.toHaveClass('ant-select-item-option-disabled');
		});

		it('falls open when the check fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			);
			renderDetails('edit');

			const option = await findChannelOption(UNLINKED.name);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(option).not.toHaveClass('ant-select-item-option-disabled');
			expect(screen.getByDisplayValue(mockRoutingPolicy.name)).toBeEnabled();
		});
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
