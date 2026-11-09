import { notificationChannelsListResponse } from 'mocks-server/__mockdata__/alerts';
import { rest, server } from 'mocks-server/server';
import * as appHooks from 'providers/App/App';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';

import RoutingPolicyDetails from '../RoutingPolicyDetails';
import { RoutingPolicyDetailsProps } from '../types';
import { getAppContextMockState, MOCK_ROUTING_POLICY_1 } from './testUtils';

jest.spyOn(appHooks, 'useAppContext').mockReturnValue(getAppContextMockState());

const mockHandlePolicyDetailsModalAction = jest.fn();
const mockCloseModal = jest.fn();
const mockRoutingPolicy = MOCK_ROUTING_POLICY_1;

const CHANNELS_URL = 'http://localhost/api/v2/notification_channels';
const CHANNEL_SELECT = 'routing-policy-channel-select';
const CHANNEL_NAMES = ['Channel 1', 'Channel 2'];
const NEW_NAME = 'New Name';
const NEW_EXPRESSION = 'New Expression';
const NEW_DESCRIPTION = 'New Description';
const SAVE_BUTTON_TEXT = 'Save Routing Policy';
const NO_CHANNELS_FOUND_TEXT = 'No channels yet.';

const serveChannels = (names: string[]): void => {
	server.use(
		rest.get(CHANNELS_URL, (_req, res, ctx) =>
			res(ctx.json(notificationChannelsListResponse(names))),
		),
	);
};

const renderRoutingPolicyDetails = (
	props: Partial<RoutingPolicyDetailsProps> = {},
): ReturnType<typeof render> =>
	render(
		<RoutingPolicyDetails
			routingPolicy={mockRoutingPolicy}
			closeModal={mockCloseModal}
			mode="create"
			handlePolicyDetailsModalAction={mockHandlePolicyDetailsModalAction}
			isPolicyDetailsModalActionLoading={false}
			{...props}
		/>,
	);

const channelInput = (): HTMLElement =>
	within(screen.getByTestId(CHANNEL_SELECT)).getByRole('combobox');

describe('RoutingPolicyDetails', () => {
	beforeEach(() => {
		serveChannels(CHANNEL_NAMES);
	});

	it('renders base create layout with header, 3 inputs and footer', () => {
		renderRoutingPolicyDetails();

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
		renderRoutingPolicyDetails({ mode: 'edit' });

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
		renderRoutingPolicyDetails({ mode: 'edit' });

		const nameInput = screen.getByDisplayValue(mockRoutingPolicy.name);
		expect(nameInput).toBeInTheDocument();

		const expressionTextarea = screen.getByDisplayValue(
			mockRoutingPolicy.expression,
		);
		expect(expressionTextarea).toBeInTheDocument();

		expect(screen.getByText(CHANNEL_NAMES[0])).toBeInTheDocument();
	});

	it('creating and saving the routing policy works correctly', async () => {
		renderRoutingPolicyDetails();

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

		fireEvent.mouseDown(channelInput());
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
		renderRoutingPolicyDetails({ mode: 'edit' });

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
		renderRoutingPolicyDetails({ mode: 'edit' });

		const cancelButton = screen.getByRole('button', { name: 'Cancel' });
		fireEvent.click(cancelButton);
		expect(mockCloseModal).toHaveBeenCalled();
	});

	it('buttons should be disabled when loading', () => {
		renderRoutingPolicyDetails({
			mode: 'edit',
			isPolicyDetailsModalActionLoading: true,
		});

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
		renderRoutingPolicyDetails();

		const saveButton = screen.getByRole('button', {
			name: SAVE_BUTTON_TEXT,
		});
		fireEvent.click(saveButton);

		expect(mockHandlePolicyDetailsModalAction).not.toHaveBeenCalled();
	});

	it('shows a spinner in the channel list while channels load', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		server.use(
			rest.get(CHANNELS_URL, (_req, res, ctx) =>
				res(ctx.delay(1_000), ctx.json(notificationChannelsListResponse([]))),
			),
		);
		renderRoutingPolicyDetails();

		await user.click(channelInput());

		expect(
			screen.getByTestId('routing-policy-channel-spinner'),
		).toBeInTheDocument();
		expect(screen.queryByText(NO_CHANNELS_FOUND_TEXT)).not.toBeInTheDocument();
	});

	it('should show error state when channels fail to load', async () => {
		server.use(
			rest.get(CHANNELS_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error' })),
			),
		);
		renderRoutingPolicyDetails();

		await waitFor(() =>
			expect(screen.getByTestId(CHANNEL_SELECT)).toHaveClass(
				'ant-select-status-error',
			),
		);
	});

	it('should show empty state when no channels are available', async () => {
		serveChannels([]);
		renderRoutingPolicyDetails();

		fireEvent.mouseDown(channelInput());

		await expect(
			screen.findByText(NO_CHANNELS_FOUND_TEXT),
		).resolves.toBeInTheDocument();
	});

	it('should show create channel button for admin users in empty state', async () => {
		serveChannels([]);
		renderRoutingPolicyDetails();

		fireEvent.mouseDown(channelInput());

		await expect(
			screen.findByText(NO_CHANNELS_FOUND_TEXT),
		).resolves.toBeInTheDocument();
		expect(screen.getByText('Create one')).toBeInTheDocument();
	});

	it('should show admin message for non-admin users in empty state', async () => {
		jest
			.spyOn(appHooks, 'useAppContext')
			.mockReturnValue(getAppContextMockState({ role: 'VIEWER' }));
		serveChannels([]);
		renderRoutingPolicyDetails();

		fireEvent.mouseDown(channelInput());

		await expect(
			screen.findByText(NO_CHANNELS_FOUND_TEXT),
		).resolves.toBeInTheDocument();
		expect(
			screen.getByText('Please ask your admin to create one.'),
		).toBeInTheDocument();
		expect(screen.queryByText('Create one')).not.toBeInTheDocument();
	});

	it('refetches channels when refresh is clicked in empty state', async () => {
		let requestCount = 0;
		server.use(
			rest.get(CHANNELS_URL, (_req, res, ctx) => {
				requestCount += 1;
				return res(ctx.json(notificationChannelsListResponse([])));
			}),
		);
		renderRoutingPolicyDetails();

		fireEvent.mouseDown(channelInput());
		fireEvent.click(await screen.findByText('Refresh'));

		await waitFor(() => expect(requestCount).toBe(2));
	});

	it('searches channels on the server as the user types', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const queries: (string | null)[] = [];
		server.use(
			rest.get(CHANNELS_URL, (req, res, ctx) => {
				const query = req.url.searchParams.get('query');
				queries.push(query);
				return res(
					ctx.json(
						notificationChannelsListResponse(query ? ['Channel 2'] : CHANNEL_NAMES),
					),
				);
			}),
		);
		renderRoutingPolicyDetails();

		await user.click(channelInput());
		await screen.findByTitle('Channel 1');
		await user.type(channelInput(), '2');

		await expect(screen.findByTitle('Channel 2')).resolves.toBeInTheDocument();
		expect(screen.queryByTitle('Channel 1')).not.toBeInTheDocument();
		expect(queries).toStrictEqual([null, '2']);
	});

	it('loads the next page when the list is scrolled to the bottom', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const offsets: string[] = [];
		server.use(
			rest.get(CHANNELS_URL, (req, res, ctx) => {
				const offset = Number(req.url.searchParams.get('offset'));
				offsets.push(String(offset));
				const names = Array.from(
					{ length: offset === 0 ? 100 : 20 },
					(_, index) => `channel-${offset + index}`,
				);
				return res(ctx.json(notificationChannelsListResponse(names, 120)));
			}),
		);
		renderRoutingPolicyDetails();

		await user.click(channelInput());
		await screen.findByTitle('channel-0');
		fireEvent.scroll(
			document.querySelector('.rc-virtual-list-holder') as HTMLElement,
		);

		await waitFor(() => expect(offsets).toStrictEqual(['0', '100']));
	});

	it('keeps the name of a saved channel the results do not include', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		serveChannels(['Channel 2']);
		renderRoutingPolicyDetails({ mode: 'edit' });

		await user.click(channelInput());
		await screen.findByTitle('Channel 2');

		expect(
			within(screen.getByTestId(CHANNEL_SELECT)).getByTitle('Channel 1'),
		).toHaveTextContent('Channel 1');
	});
});
