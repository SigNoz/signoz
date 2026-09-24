import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ChannelForm from '../components/ChannelForm/ChannelForm';

const FIND = { timeout: 5000 };
const TEST_TIMEOUT = 20000;

describe('ChannelForm save', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/');
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
				await screen.findByTestId('channel-name-textbox', {}, FIND),
				'prod alerts',
			);
			await user.type(
				screen.getByTestId('webhook-url-textbox'),
				'https://hooks.slack.com/services/T/B/X',
			);
			await user.click(screen.getByTestId('save-channel-button'));

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
				'channel-name-textbox',
				{},
				FIND,
			);
			expect(channelName).toBeDisabled();

			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.clear(screen.getByTestId('slack-channel-textbox'));
			await user.type(screen.getByTestId('slack-channel-textbox'), '#changed');
			await user.click(screen.getByTestId('save-channel-button'));

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
			expect(screen.queryByTestId('channel-name-textbox')).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);
});
