import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzGrantByPrefix,
} from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ChannelForm from '../components/ChannelForm/ChannelForm';

const FIND = { timeout: 5000 };
const TEST_TIMEOUT = 20000;

describe('ChannelForm save', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/');
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it(
		'creates with a generated name and the typed config',
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				rest.post(
					'http://localhost/api/v2/notification_channels',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(201), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			const onDone = jest.fn();
			render(<ChannelForm onDone={onDone} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.type(
				await screen.findByTestId('channel-name-textbox-field', {}, FIND),
				'prod alerts',
			);
			await user.type(
				screen.getByTestId('webhook-url-textbox-field'),
				'https://hooks.slack.com/services/T/B/X',
			);
			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await waitFor(() => expect(onDone).toHaveBeenCalled(), FIND);

			expect(body).toMatchObject({
				generateName: true,
				displayName: 'prod alerts',
				config: {
					kind: 'slack',
					spec: { apiUrl: 'https://hooks.slack.com/services/T/B/X' },
				},
			});
			// the API rejects a name alongside generateName
			expect(body).not.toHaveProperty('name');
		},
		TEST_TIMEOUT,
	);

	it(
		'sends no telegram message, so the backend keeps its own template',
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				rest.post(
					'http://localhost/api/v2/notification_channels',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(201), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			render(<ChannelForm onDone={jest.fn()} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.click(await screen.findByTestId('channel-type-select', {}, FIND));
			await user.click(await screen.findByRole('option', { name: /^Telegram$/ }));

			await user.type(
				screen.getByTestId('channel-name-textbox-field'),
				'telegram alerts',
			);
			await user.type(
				screen.getByTestId('telegram-bot-token-textbox-field'),
				'123:abc',
			);
			await user.type(
				screen.getByTestId('telegram-chat-id-textbox-field'),
				'-100123',
			);

			// the box is empty on screen, and an empty box must not become an empty
			// string in the request: that would overwrite the backend's default
			expect(screen.getByTestId('telegram-message-textarea')).toHaveValue('');

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await waitFor(() => expect(body).toBeDefined(), FIND);
			const spec = (body as { config: { spec: Record<string, unknown> } }).config
				.spec;
			expect(spec).not.toHaveProperty('message');
		},
		TEST_TIMEOUT,
	);

	it(
		'sends only the credentials of the picked webhook auth',
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				rest.post(
					'http://localhost/api/v2/notification_channels',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(201), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			render(<ChannelForm onDone={jest.fn()} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.click(await screen.findByTestId('channel-type-select', {}, FIND));
			await user.click(await screen.findByRole('option', { name: /^Webhook$/ }));

			await user.type(
				screen.getByTestId('channel-name-textbox-field'),
				'hook alerts',
			);
			await user.type(
				screen.getByTestId('webhook-url-textbox-field'),
				'https://example.com/hook',
			);

			await user.click(screen.getByTestId('webhook-auth-radio-item-basic'));
			await user.type(
				screen.getByTestId('webhook-username-textbox-field'),
				'hook-user',
			);

			await user.click(screen.getByTestId('webhook-auth-radio-item-bearer'));
			expect(
				screen.queryByTestId('webhook-username-textbox-field'),
			).not.toBeInTheDocument();
			await user.type(
				screen.getByTestId('webhook-bearer-token-textbox-field'),
				'hook-token',
			);

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await waitFor(() => expect(body).toBeDefined(), FIND);
			expect(
				(body as { config: { spec: Record<string, unknown> } }).config.spec,
			).toStrictEqual({
				url: 'https://example.com/hook',
				bearerToken: 'hook-token',
				sendResolved: true,
			});
		},
		TEST_TIMEOUT,
	);

	it(
		'sends only the credentials of the picked jira deployment',
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				rest.post(
					'http://localhost/api/v2/notification_channels',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(201), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			render(<ChannelForm onDone={jest.fn()} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.click(await screen.findByTestId('channel-type-select', {}, FIND));
			await user.click(await screen.findByRole('option', { name: /^Jira$/ }));
			expect(
				screen.getByTestId('jira-deployment-radio-item-cloud'),
			).toHaveAttribute('aria-checked', 'true');

			await user.type(
				screen.getByTestId('channel-name-textbox-field'),
				'jira alerts',
			);
			await user.type(
				screen.getByTestId('jira-email-textbox-field'),
				'ops@acme.io',
			);

			await user.click(
				screen.getByTestId('jira-deployment-radio-item-selfhosted'),
			);
			expect(
				screen.queryByTestId('jira-email-textbox-field'),
			).not.toBeInTheDocument();
			await user.type(
				screen.getByTestId('jira-site-textbox-field'),
				'https://jira.acme.com',
			);
			await user.type(screen.getByTestId('jira-pat-textbox-field'), 'pat-1');
			await user.type(screen.getByTestId('jira-project-textbox-field'), 'OPS');

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await waitFor(() => expect(body).toBeDefined(), FIND);
			expect(
				(body as { config: { spec: Record<string, unknown> } }).config.spec,
			).toMatchObject({
				deployment: 'selfhosted',
				site: 'https://jira.acme.com',
				auth: { pat: 'pat-1' },
				project: 'OPS',
				issueType: 'Task',
			});
			expect(
				(body as { config: { spec: Record<string, unknown> } }).config.spec,
			).not.toHaveProperty('auth.email');
		},
		TEST_TIMEOUT,
	);

	it(
		'flags a slack field without a value instead of sending it',
		async () => {
			const onCreate = jest.fn();
			server.use(
				rest.post(
					'http://localhost/api/v2/notification_channels',
					(_, res, ctx) => {
						onCreate();
						return res(ctx.status(201), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			render(<ChannelForm onDone={jest.fn()} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.type(
				await screen.findByTestId('channel-name-textbox-field', {}, FIND),
				'slack alerts',
			);
			await user.type(
				screen.getByTestId('webhook-url-textbox-field'),
				'https://hooks.slack.com/services/T/B/X',
			);
			await user.click(screen.getByTestId('slack-field-add'));
			await user.type(screen.getByTestId('slack-field-title-0-field'), 'env');

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await screen.findByText('slack_field_value_required', {}, FIND);
			expect(onCreate).not.toHaveBeenCalled();
		},
		TEST_TIMEOUT,
	);

	it(
		'updates with the config only, since both names are immutable',
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				rest.put(
					'http://localhost/api/v2/notification_channels/:id',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			const onDone = jest.fn();
			render(<ChannelForm channelId="3" onDone={onDone} />);

			const channelName = await screen.findByTestId(
				'channel-name-textbox-field',
				{},
				FIND,
			);
			expect(channelName).toBeDisabled();

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.clear(screen.getByTestId('slack-channel-textbox-field'));
			await user.type(
				screen.getByTestId('slack-channel-textbox-field'),
				'#changed',
			);
			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await waitFor(() => expect(onDone).toHaveBeenCalled(), FIND);

			expect(body).toStrictEqual({
				config: {
					kind: 'slack',
					spec: expect.objectContaining({ channel: '#changed' }),
				},
			});
			expect(body).not.toHaveProperty('displayName');
		},
		TEST_TIMEOUT,
	);

	it(
		'keeps bearer auth while a saved token is cleared and replaced',
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				rest.get(
					'http://localhost/api/v2/notification_channels/:id',
					(_, res, ctx) =>
						res(
							ctx.status(200),
							ctx.json({
								status: 'success',
								data: {
									id: '3',
									name: 'webhook-channel',
									displayName: 'webhook channel',
									createdAt: '2026-01-01T00:00:00Z',
									updatedAt: '2026-01-01T00:00:00Z',
									config: {
										kind: 'webhook',
										spec: { url: 'https://example.com/hook', bearerToken: 'old-token' },
									},
								},
							}),
						),
				),
				rest.put(
					'http://localhost/api/v2/notification_channels/:id',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			const onDone = jest.fn();
			render(<ChannelForm channelId="3" onDone={onDone} />);

			const token = await screen.findByTestId(
				'webhook-bearer-token-textbox-field',
				{},
				FIND,
			);
			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.clear(token);
			await user.type(
				screen.getByTestId('webhook-bearer-token-textbox-field'),
				'new-token',
			);

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await waitFor(() => expect(onDone).toHaveBeenCalled(), FIND);
			expect(body).toStrictEqual({
				config: {
					kind: 'webhook',
					spec: { url: 'https://example.com/hook', bearerToken: 'new-token' },
				},
			});
		},
		TEST_TIMEOUT,
	);

	it(
		'opens read-only, with saving disabled rather than hidden, when update is denied',
		async () => {
			server.use(setupAuthzGrantByPrefix('read', 'list'));

			render(<ChannelForm channelId="3" onDone={jest.fn()} />);

			await screen.findByTestId('channel-name-textbox-field', {}, FIND);

			// the whole form goes disabled once the denial lands
			await waitFor(
				() =>
					expect(screen.getByTestId('slack-channel-textbox-field')).toBeDisabled(),
				FIND,
			);
			// set on the input itself, not inherited from the fieldset, so the
			// component renders its own disabled state
			expect(screen.getByTestId('slack-channel-textbox-field')).toHaveAttribute(
				'disabled',
			);
			// read-only arrives after mount, which the Controller's field.disabled misses
			expect(screen.getByTestId('field-send-resolved-checkbox')).toHaveAttribute(
				'aria-disabled',
				'true',
			);

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'true'),
				FIND,
			);
			expect(save).toHaveAttribute(
				'data-denied-permissions',
				expect.stringContaining('update'),
			);
			expect(screen.getByTestId('test-channel-button')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		},
		TEST_TIMEOUT,
	);

	it(
		'sends the saved config as a test from a read-only form',
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				setupAuthzGrantByPrefix('read', 'list', 'create'),
				rest.post(
					'http://localhost/api/v2/notification_channels/test',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			render(<ChannelForm channelId="3" onDone={jest.fn()} />);

			await waitFor(
				() =>
					expect(screen.getByTestId('slack-channel-textbox-field')).toBeDisabled(),
				FIND,
			);
			const testButton = screen.getByTestId('test-channel-button');
			await waitFor(
				() => expect(testButton).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.click(testButton);

			await waitFor(() => expect(body).toBeDefined(), FIND);
			expect(body).toMatchObject({
				config: {
					kind: 'slack',
					spec: {
						apiUrl: 'https://hooks.slack.com/services/dummy',
						channel: '#dummy_channel',
					},
				},
			});
		},
		TEST_TIMEOUT,
	);

	it(
		'stays editable when the permission check itself fails',
		async () => {
			// a failed check is an outage, not a denial: locking the form on one
			// would read as "no permission" every time the batch misses
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_, res, ctx) => res(ctx.status(500))),
			);

			render(<ChannelForm channelId="3" onDone={jest.fn()} />);

			const channel = await screen.findByTestId(
				'slack-channel-textbox-field',
				{},
				FIND,
			);
			await waitFor(() => expect(channel).toBeEnabled(), FIND);

			// Save is off until something changes, so one edit is what tells a
			// settled failure apart from a denial
			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.type(channel, '-edited');

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);

			expect(
				screen.queryByTestId('channel-read-only-notice'),
			).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		'keeps save off until something is edited',
		async () => {
			render(<ChannelForm channelId="3" onDone={jest.fn()} />);

			// Save is also off while the permission checks are in flight. Test is
			// gated on those checks alone, so it settling means Save is only off
			// because nothing has changed.
			const testButton = await screen.findByTestId(
				'test-channel-button',
				{},
				FIND,
			);
			await waitFor(
				() => expect(testButton).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);

			const save = screen.getByTestId('save-channel-button');
			expect(save).toHaveAttribute('aria-disabled', 'true');

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.type(
				screen.getByTestId('slack-channel-textbox-field'),
				'-edited',
			);

			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
		},
		TEST_TIMEOUT,
	);

	it(
		'asks before discarding an edited form, and leaves straight away otherwise',
		async () => {
			const onDone = jest.fn();
			render(<ChannelForm channelId="3" onDone={onDone} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			const discard = await screen.findByTestId(
				'discard-channel-button',
				{},
				FIND,
			);

			await user.click(discard);
			expect(onDone).toHaveBeenCalledTimes(1);

			await user.type(
				screen.getByTestId('slack-channel-textbox-field'),
				'-edited',
			);
			await user.click(discard);

			// the test harness stubs `t`, so the modal renders the keys themselves
			await screen.findByText('discard_changes_title', {}, FIND);
			expect(onDone).toHaveBeenCalledTimes(1);

			await user.click(
				screen.getByRole('button', { name: 'button_discard_confirm' }),
			);
			await waitFor(() => expect(onDone).toHaveBeenCalledTimes(2));
		},
		TEST_TIMEOUT,
	);

	it(
		'explains a channel the v2 API cannot model instead of showing a blank form',
		async () => {
			server.use(
				rest.get(
					'http://localhost/api/v2/notification_channels/:id',
					(_, res, ctx) =>
						res(
							ctx.status(400),
							ctx.json({
								status: 'error',
								error: {
									message: 'channel carries 2 notifier configurations',
								},
							}),
						),
				),
			);

			render(<ChannelForm channelId="3" onDone={jest.fn()} />);

			await expect(
				screen.findByTestId('channel-load-error', {}, FIND),
			).resolves.toBeInTheDocument();
			expect(
				screen.queryByTestId('channel-name-textbox-field'),
			).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		"drops the previous type's templates when switching type",
		async () => {
			let body: Record<string, unknown> | undefined;
			server.use(
				rest.post(
					'http://localhost/api/v2/notification_channels',
					async (req, res, ctx) => {
						body = await req.json();
						return res(ctx.status(201), ctx.json({ status: 'success', data: {} }));
					},
				),
			);

			render(<ChannelForm onDone={jest.fn()} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.click(await screen.findByTestId('channel-type-select', {}, FIND));
			await user.click(await screen.findByRole('option', { name: /^Telegram$/ }));

			expect(screen.getByTestId('telegram-title-textarea')).toHaveValue('');

			await user.type(
				screen.getByTestId('channel-name-textbox-field'),
				'telegram alerts',
			);
			await user.type(
				screen.getByTestId('telegram-bot-token-textbox-field'),
				'123:abc',
			);
			await user.type(
				screen.getByTestId('telegram-chat-id-textbox-field'),
				'-100123',
			);

			const save = screen.getByTestId('save-channel-button');
			await waitFor(
				() => expect(save).toHaveAttribute('aria-disabled', 'false'),
				FIND,
			);
			await user.click(save);

			await waitFor(() => expect(body).toBeDefined(), FIND);
			expect(
				(body as { config: { spec: Record<string, unknown> } }).config.spec,
			).toStrictEqual({
				botToken: '123:abc',
				chatId: -100123,
				sendResolved: true,
			});
		},
		TEST_TIMEOUT,
	);

	it(
		'leaves the pagerduty client url empty so the backend links to this instance',
		async () => {
			render(<ChannelForm onDone={jest.fn()} />);

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.click(await screen.findByTestId('channel-type-select', {}, FIND));
			await user.click(await screen.findByRole('option', { name: /^Pagerduty$/ }));

			expect(screen.getByTestId('pager-client-url-textarea-field')).toHaveValue(
				'',
			);
		},
		TEST_TIMEOUT,
	);
});
