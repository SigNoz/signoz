import type { ComponentProps } from 'react';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

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

const NAME_INPUT = 'routing-policy-name-input';
const EXPRESSION_INPUT = 'routing-policy-expression-input';
const DESCRIPTION_INPUT = 'routing-policy-description-input';
const CHANNELS_SELECT = 'routing-policy-channels-select';
const CANCEL_BUTTON = 'routing-policy-cancel';
const SAVE_BUTTON = 'routing-policy-save';

type Props = ComponentProps<typeof RoutingPolicyDetails>;

function renderDetails(
	props: Partial<Props> = {},
	role: string = USER_ROLES.ADMIN,
): void {
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
			{...props}
		/>,
		undefined,
		{ role },
	);
}

function channelsSelectInput(): HTMLElement {
	return within(screen.getByTestId(CHANNELS_SELECT)).getByLabelText(
		'Notification Channels',
	);
}

describe('RoutingPolicyDetails', () => {
	it('renders base create layout with header, 3 inputs and footer', () => {
		renderDetails({ mode: 'create' });

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Create routing policy')).toBeInTheDocument();
		expect(screen.getByText('Routing Policy Name')).toBeInTheDocument();
		expect(screen.getByText('Expression')).toBeInTheDocument();
		expect(screen.getByText('Notification Channels')).toBeInTheDocument();
		expect(screen.getByTestId(CANCEL_BUTTON)).toHaveTextContent('Cancel');
		expect(screen.getByTestId(SAVE_BUTTON)).toHaveTextContent(SAVE_BUTTON_TEXT);
	});

	it('renders base edit layout with header, 3 inputs and footer', () => {
		renderDetails({ mode: 'edit' });

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Edit routing policy')).toBeInTheDocument();
		expect(screen.getByText('Routing Policy Name')).toBeInTheDocument();
		expect(screen.getByText('Expression')).toBeInTheDocument();
		expect(screen.getByText('Notification Channels')).toBeInTheDocument();

		expect(screen.getByTestId(CANCEL_BUTTON)).toHaveTextContent('Cancel');
		expect(screen.getByTestId(SAVE_BUTTON)).toHaveTextContent(SAVE_BUTTON_TEXT);
	});

	it('prefills inputs with existing policy values in edit mode', () => {
		renderDetails({ mode: 'edit' });

		expect(screen.getByTestId(NAME_INPUT)).toHaveValue(mockRoutingPolicy.name);
		expect(screen.getByTestId(EXPRESSION_INPUT)).toHaveValue(
			mockRoutingPolicy.expression,
		);

		expect(screen.getByText(MOCK_CHANNEL_1.name)).toBeInTheDocument();
	});

	it('creating and saving the routing policy works correctly', async () => {
		const user = userEvent.setup();
		renderDetails({ mode: 'create' });

		const nameInput = screen.getByTestId(NAME_INPUT);
		expect(nameInput).toHaveAttribute(
			'placeholder',
			'e.g. Base routing policy...',
		);
		const expressionTextarea = screen.getByTestId(EXPRESSION_INPUT);
		expect(expressionTextarea).toHaveAttribute(
			'placeholder',
			'e.g. service.name == "payment" && threshold.name == "critical"',
		);
		const descriptionTextarea = screen.getByTestId(DESCRIPTION_INPUT);
		expect(descriptionTextarea).toHaveAttribute(
			'placeholder',
			'e.g. This is a routing policy that...',
		);

		await user.click(nameInput);
		await user.paste(NEW_NAME);
		await user.click(expressionTextarea);
		await user.paste(NEW_EXPRESSION);
		await user.click(descriptionTextarea);
		await user.paste(NEW_DESCRIPTION);

		await user.click(channelsSelectInput());
		await user.click(await screen.findByTitle('Channel 1'));

		await user.click(screen.getByTestId(SAVE_BUTTON));

		await waitFor(() =>
			expect(mockHandlePolicyDetailsModalAction).toHaveBeenCalledWith('create', {
				name: NEW_NAME,
				expression: NEW_EXPRESSION,
				description: NEW_DESCRIPTION,
				channels: ['Channel 1'],
			}),
		);
	});

	it('editing and saving the routing policy works correctly', async () => {
		const user = userEvent.setup();
		renderDetails({ mode: 'edit' });

		const nameInput = screen.getByTestId(NAME_INPUT);
		expect(nameInput).toHaveValue(mockRoutingPolicy.name);
		const expressionTextarea = screen.getByTestId(EXPRESSION_INPUT);
		expect(expressionTextarea).toHaveValue(mockRoutingPolicy.expression);
		const descriptionTextarea = screen.getByTestId(DESCRIPTION_INPUT);
		expect(descriptionTextarea).toHaveValue(
			mockRoutingPolicy.description || 'description 1',
		);

		await user.clear(nameInput);
		await user.paste(NEW_NAME);
		await user.clear(expressionTextarea);
		await user.paste(NEW_EXPRESSION);
		await user.clear(descriptionTextarea);
		await user.paste(NEW_DESCRIPTION);

		await user.click(screen.getByTestId(SAVE_BUTTON));

		await waitFor(() =>
			expect(mockHandlePolicyDetailsModalAction).toHaveBeenCalledWith('edit', {
				name: NEW_NAME,
				expression: NEW_EXPRESSION,
				description: NEW_DESCRIPTION,
				channels: ['Channel 1'],
			}),
		);
	});

	it('should close modal when cancel button is clicked', async () => {
		const user = userEvent.setup();
		renderDetails({ mode: 'edit' });

		await user.click(screen.getByTestId(CANCEL_BUTTON));
		expect(mockCloseModal).toHaveBeenCalled();
	});

	it('buttons should be disabled when loading', () => {
		renderDetails({ mode: 'edit', isPolicyDetailsModalActionLoading: true });

		expect(screen.getByTestId(CANCEL_BUTTON)).toBeDisabled();

		const saveButton = screen.getByTestId(SAVE_BUTTON);
		expect(saveButton).toHaveTextContent(SAVE_BUTTON_TEXT);
		expect(saveButton).toBeDisabled();
		expect(within(saveButton).getByLabelText('loading')).toBeInTheDocument();
	});

	it('submit should not be called when inputs are invalid', async () => {
		const user = userEvent.setup();
		renderDetails({ mode: 'create' });

		await user.click(screen.getByTestId(SAVE_BUTTON));

		await expect(
			screen.findByText('Please provide a name for the routing policy'),
		).resolves.toBeInTheDocument();
		expect(mockHandlePolicyDetailsModalAction).not.toHaveBeenCalled();
	});

	it('notification channels select should be disabled when channels are loading', () => {
		renderDetails({ channels: [], isLoadingChannels: true });

		expect(channelsSelectInput()).toBeDisabled();
	});

	it('should show error state when channels fail to load', () => {
		renderDetails({ channels: [], isErrorChannels: true });

		expect(screen.getByTestId(CHANNELS_SELECT)).toHaveClass(
			'ant-select-status-error',
		);
	});

	it('should show empty state when no channels are available', async () => {
		const user = userEvent.setup();
		renderDetails({ channels: [] });

		await user.click(channelsSelectInput());

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
	});

	it('should show create channel button for admin users in empty state', async () => {
		const user = userEvent.setup();
		renderDetails({ channels: [] });

		await user.click(channelsSelectInput());

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
		expect(screen.getByText('Create one')).toBeInTheDocument();
	});

	it('should show admin message for non-admin users in empty state', async () => {
		const user = userEvent.setup();
		renderDetails({ channels: [] }, USER_ROLES.VIEWER);

		await user.click(channelsSelectInput());

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText('Please ask your admin to create one.'),
		).toBeInTheDocument();
		expect(screen.queryByText('Create one')).not.toBeInTheDocument();
	});

	it('should call refreshChannels when refresh button is clicked in empty state', async () => {
		const user = userEvent.setup();
		renderDetails({ channels: [] });

		await user.click(channelsSelectInput());

		const refreshButton = screen.getByText('Refresh');
		expect(refreshButton).toBeInTheDocument();

		await user.click(refreshButton);
		expect(mockRefreshChannels).toHaveBeenCalledTimes(1);
	});
});
