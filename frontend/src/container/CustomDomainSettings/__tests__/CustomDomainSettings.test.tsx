import { GetHosts200 } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CustomDomainSettings from '../CustomDomainSettings';

const ZEUS_HOSTS_ENDPOINT = '*/api/v2/zeus/hosts';

const mockHostsResponse: GetHosts200 = {
	status: 'success',
	data: {
		name: 'accepted-starfish',
		state: 'HEALTHY',
		tier: 'PREMIUM',
		hosts: [
			{
				name: 'accepted-starfish',
				is_default: true,
				url: 'https://accepted-starfish.test.cloud',
			},
			{
				name: 'custom-host',
				is_default: false,
				url: 'https://custom-host.test.cloud',
			},
		],
	},
};

describe('CustomDomainSettings', () => {
	afterEach(() => server.resetHandlers());

	it('renders host URLs with protocol stripped and marks the default host', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
		);

		render(<CustomDomainSettings />);

		await screen.findByText(/accepted-starfish\.test\.cloud/i);
		await screen.findByText(/custom-host\.test\.cloud/i);
		expect(screen.getByText('Default')).toBeInTheDocument();
	});

	it('opens edit modal with DNS suffix derived from the default host', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CustomDomainSettings />);

		await screen.findByText(/accepted-starfish\.test\.cloud/i);

		await user.click(
			screen.getByRole('button', { name: /customize team['’]s url/i }),
		);

		expect(
			screen.getByRole('dialog', { name: /customize your team['’]s url/i }),
		).toBeInTheDocument();
		// DNS suffix is the part of the default host URL after the name prefix
		expect(screen.getByText('test.cloud')).toBeInTheDocument();
	});

	it('submits PUT to /zeus/hosts with the entered subdomain as the payload', async () => {
		let capturedBody: Record<string, unknown> = {};

		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
			rest.put(ZEUS_HOSTS_ENDPOINT, async (req, res, ctx) => {
				capturedBody = await req.json<Record<string, unknown>>();
				return res(ctx.status(200), ctx.json({}));
			}),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CustomDomainSettings />);

		await screen.findByText(/accepted-starfish\.test\.cloud/i);
		await user.click(
			screen.getByRole('button', { name: /customize team['’]s url/i }),
		);

		const input = screen.getByPlaceholderText(/enter domain/i);
		await user.clear(input);
		await user.type(input, 'myteam');
		await user.click(screen.getByRole('button', { name: /apply changes/i }));

		await waitFor(() => {
			expect(capturedBody).toEqual({ name: 'myteam' });
		});
	});

	it('shows contact support option when domain update returns 409', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
			rest.put(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(409),
					ctx.json({ error: { message: 'Already updated today' } }),
				),
			),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CustomDomainSettings />);

		await screen.findByText(/accepted-starfish\.test\.cloud/i);
		await user.click(
			screen.getByRole('button', { name: /customize team['’]s url/i }),
		);
		await user.type(screen.getByPlaceholderText(/enter domain/i), 'myteam');
		await user.click(screen.getByRole('button', { name: /apply changes/i }));

		expect(
			await screen.findByRole('button', { name: /contact support/i }),
		).toBeInTheDocument();
	});
});
