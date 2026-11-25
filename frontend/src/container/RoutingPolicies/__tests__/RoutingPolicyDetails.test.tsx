import type { ComponentProps } from 'react';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import type { AuthtypesTransactionDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
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
	buildRoutePolicyUpdatePermission,
	RoutePolicyAttachPermission,
	RoutePolicyCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/route-policy.permissions';
import { gettableTransactionToPermission } from 'lib/authz/hooks/useAuthZ/utils';

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

function renderDetails(props: Partial<Props> = {}): void {
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
	);
}

function channelsSelectInput(): HTMLElement {
	return within(screen.getByTestId(CHANNELS_SELECT)).getByLabelText(
		'Notification Channels',
	);
}

async function waitForSaveEnabled(): Promise<void> {
	await waitFor(() =>
		expect(screen.getByTestId(SAVE_BUTTON)).toHaveAttribute(
			'aria-disabled',
			'false',
		),
	);
}

type User = ReturnType<typeof userEvent.setup>;

async function findChannelOption(
	user: User,
	channelId: string,
): Promise<HTMLElement> {
	await user.click(channelsSelectInput());
	return screen.findByTestId(`routing-policy-channel-option-${channelId}`);
}

describe('RoutingPolicyDetails', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

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

		const option = await findChannelOption(user, MOCK_CHANNEL_1.id);
		await waitFor(() => expect(option).toHaveAttribute('aria-disabled', 'false'));
		await user.click(option);

		await user.click(screen.getByTestId(SAVE_BUTTON));

		await waitForSaveEnabled();
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

		await waitForSaveEnabled();
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
		expect(saveButton).toHaveAttribute('aria-disabled', 'true');
		expect(saveButton).toHaveAttribute('aria-busy', 'true');
	});

	it('submit should not be called when inputs are invalid', async () => {
		const user = userEvent.setup();
		renderDetails({ mode: 'create' });

		await waitForSaveEnabled();
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

	it('offers to create a channel with notification-channel:create', async () => {
		const user = userEvent.setup();
		renderDetails({ channels: [] });

		await user.click(channelsSelectInput());

		expect(screen.getByText(NO_CHANNELS_FOUND_TEXT)).toBeInTheDocument();
		await expect(
			screen.findByTestId('channels-not-found-create'),
		).resolves.toBeInTheDocument();
	});

	it('asks for an admin without notification-channel:create', async () => {
		const user = userEvent.setup();
		server.use(setupAuthzDeny(NotificationChannelCreatePermission));
		renderDetails({ channels: [] });

		await user.click(channelsSelectInput());

		await expect(
			screen.findByText('Please ask your admin to create one.'),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByTestId('channels-not-found-create'),
		).not.toBeInTheDocument();
	});

	describe('authz', () => {
		const POLICY_ID = mockRoutingPolicy.id;
		const LINKED = MOCK_CHANNEL_1;
		const UNLINKED = MOCK_CHANNEL_2;

		it('opens read-only with Save disabled without update', async () => {
			server.use(setupAuthzDeny(buildRoutePolicyUpdatePermission(POLICY_ID)));
			renderDetails({ mode: 'edit' });

			await waitFor(() =>
				expect(screen.getByDisplayValue(mockRoutingPolicy.name)).toBeDisabled(),
			);
			expect(screen.getByTestId(SAVE_BUTTON)).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('locks the channel picker without update', async () => {
			server.use(setupAuthzDeny(buildRoutePolicyUpdatePermission(POLICY_ID)));
			renderDetails({ mode: 'edit' });

			await waitFor(() =>
				expect(screen.getByDisplayValue(mockRoutingPolicy.name)).toBeDisabled(),
			);
			expect(channelsSelectInput()).toBeDisabled();
		});

		it('names update when Save is denied on edit', async () => {
			server.use(setupAuthzDeny(buildRoutePolicyUpdatePermission(POLICY_ID)));
			renderDetails({ mode: 'edit' });

			await waitFor(() =>
				expect(screen.getByTestId(SAVE_BUTTON)).toHaveAttribute(
					'data-denied-permissions',
					buildRoutePolicyUpdatePermission(POLICY_ID),
				),
			);
		});

		it('disables Save on create without attach on routing policies', async () => {
			server.use(setupAuthzDeny(RoutePolicyAttachPermission));
			renderDetails({ mode: 'create' });

			await waitFor(() =>
				expect(screen.getByTestId(SAVE_BUTTON)).toHaveAttribute(
					'data-denied-permissions',
					RoutePolicyAttachPermission,
				),
			);
			expect(screen.getByTestId(SAVE_BUTTON)).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('enables Save on create with create and attach', async () => {
			server.use(
				setupAuthzAllow(RoutePolicyCreatePermission, RoutePolicyAttachPermission),
			);
			renderDetails({ mode: 'create' });

			await waitForSaveEnabled();
			expect(screen.getByTestId(SAVE_BUTTON)).not.toHaveAttribute(
				'data-denied-permissions',
			);
		});

		it('checks unlinked channels only once the picker opens', async () => {
			const requested: AuthtypesTransactionDTO[] = [];
			server.use(
				rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
					const payload = (await req.json()) as AuthtypesTransactionDTO[];
					requested.push(...payload);
					return res(
						ctx.status(200),
						ctx.json(
							authzMockResponse(
								payload,
								payload.map(() => true),
							),
						),
					);
				}),
			);
			const isUnlinkedAttach = (txn: AuthtypesTransactionDTO): boolean =>
				txn.relation === 'attach' &&
				txn.object.resource.kind === 'notification-channel' &&
				txn.object.selector === UNLINKED.id;
			const user = userEvent.setup();
			renderDetails({ mode: 'edit' });
			await waitForSaveEnabled();

			expect(requested.some(isUnlinkedAttach)).toBe(false);

			const option = await findChannelOption(user, UNLINKED.id);
			await waitFor(() =>
				expect(option).toHaveAttribute('aria-disabled', 'false'),
			);
			expect(requested.some(isUnlinkedAttach)).toBe(true);
		});

		it('disables a channel the user cannot attach, naming the permission', async () => {
			server.use(
				setupAuthzDeny(buildNotificationChannelAttachPermission(UNLINKED.id)),
			);
			const user = userEvent.setup();
			renderDetails({ mode: 'edit' });
			await waitForSaveEnabled();

			const option = await findChannelOption(user, UNLINKED.id);
			await waitFor(() =>
				expect(option).toHaveAttribute(
					'title',
					expect.stringContaining(`attach:notification-channel:${UNLINKED.id}`),
				),
			);
			expect(option).toHaveAttribute('aria-disabled', 'true');
		});

		it('locks a linked channel the user cannot detach', async () => {
			server.use(
				setupAuthzDeny(buildNotificationChannelDetachPermission(LINKED.id)),
			);
			const user = userEvent.setup();
			renderDetails({ mode: 'edit' });
			await waitForSaveEnabled();

			const linked = await findChannelOption(user, LINKED.id);
			await waitFor(() =>
				expect(linked).toHaveAttribute(
					'title',
					expect.stringContaining(`detach:notification-channel:${LINKED.id}`),
				),
			);
			expect(linked).toHaveAttribute('aria-disabled', 'true');
			const unlinked = screen.getByTestId(
				`routing-policy-channel-option-${UNLINKED.id}`,
			);
			await waitFor(() =>
				expect(unlinked).toHaveAttribute('aria-disabled', 'false'),
			);
		});

		it('blocks adding channels without attach on the policy', async () => {
			server.use(setupAuthzDeny(buildRoutePolicyAttachPermission(POLICY_ID)));
			const user = userEvent.setup();
			renderDetails({ mode: 'edit' });
			await waitForSaveEnabled();

			const option = await findChannelOption(user, UNLINKED.id);
			await waitFor(() =>
				expect(option).toHaveAttribute(
					'title',
					expect.stringContaining(`attach:route-policy:${POLICY_ID}`),
				),
			);
			expect(option).toHaveAttribute('aria-disabled', 'true');
		});

		it('keeps a channel disabled while its check is pending', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
			);
			const user = userEvent.setup();
			renderDetails({ mode: 'create' });

			const option = await findChannelOption(user, UNLINKED.id);
			expect(option).toHaveAttribute('aria-disabled', 'true');
			expect(option).toHaveAttribute('title', 'Checking permissions');
		});

		it('leaves channels pickable on create when the check fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			);
			const user = userEvent.setup();
			renderDetails({ mode: 'create' });

			const option = await findChannelOption(user, UNLINKED.id);
			await waitFor(() =>
				expect(option).toHaveAttribute('aria-disabled', 'false'),
			);
		});

		it('keeps a denied linked channel locked when only the picker check fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
					const payload = (await req.json()) as AuthtypesTransactionDTO[];
					const isPickerCheck = payload.some(
						(txn) =>
							gettableTransactionToPermission(txn) ===
							buildNotificationChannelAttachPermission(UNLINKED.id),
					);
					if (isPickerCheck) {
						return res(ctx.status(500));
					}
					const denied = buildNotificationChannelDetachPermission(LINKED.id);
					return res(
						ctx.json(
							authzMockResponse(
								payload,
								payload.map((txn) => gettableTransactionToPermission(txn) !== denied),
							),
						),
					);
				}),
			);
			const user = userEvent.setup();
			renderDetails({ mode: 'edit' });
			await waitForSaveEnabled();

			const unlinked = await findChannelOption(user, UNLINKED.id);
			await waitFor(() =>
				expect(unlinked).toHaveAttribute('aria-disabled', 'false'),
			);
			expect(
				screen.getByTestId(`routing-policy-channel-option-${LINKED.id}`),
			).toHaveAttribute('aria-disabled', 'true');
		});

		it('falls open when the check fails', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			);
			const user = userEvent.setup();
			renderDetails({ mode: 'edit' });

			const option = await findChannelOption(user, UNLINKED.id);
			await waitFor(() =>
				expect(option).toHaveAttribute('aria-disabled', 'false'),
			);
			expect(screen.getByDisplayValue(mockRoutingPolicy.name)).toBeEnabled();
		});
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
