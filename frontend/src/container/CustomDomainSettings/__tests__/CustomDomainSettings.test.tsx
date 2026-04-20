import { GetHosts200 } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CustomDomainSettings from '../CustomDomainSettings';

jest.mock('components/LaunchChatSupport/LaunchChatSupport', () => ({
	__esModule: true,
	default: ({ buttonText }: { buttonText?: string }): JSX.Element => (
		<button type="button">{buttonText ?? 'Facing issues?'}</button>
	),
}));

const mockToastCustom = jest.fn();
jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
	toast: {
		custom: (...args: unknown[]): unknown => mockToastCustom(...args),
		dismiss: jest.fn(),
	},
}));

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
	afterEach(() => {
		server.resetHandlers();
		mockToastCustom.mockClear();
	});

	it('renders active host URL in the trigger button', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
		);

		render(<CustomDomainSettings />);

		// The active host is the non-default one (custom-host)
		await screen.findByText(/custom-host\.test\.cloud/i);
	});

	it('opens edit modal when clicking the edit button', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CustomDomainSettings />);

		await screen.findByText(/custom-host\.test\.cloud/i);

		await user.click(
			screen.getByRole('button', { name: /edit workspace link/i }),
		);

		expect(
			screen.getByRole('dialog', { name: /edit workspace link/i }),
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

		await screen.findByText(/custom-host\.test\.cloud/i);
		await user.click(
			screen.getByRole('button', { name: /edit workspace link/i }),
		);

		// The input is inside the modal — find it by its role
		const input = screen.getByRole('textbox');
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

		await screen.findByText(/custom-host\.test\.cloud/i);
		await user.click(
			screen.getByRole('button', { name: /edit workspace link/i }),
		);

		const input = screen.getByRole('textbox');
		await user.clear(input);
		await user.type(input, 'myteam');
		await user.click(screen.getByRole('button', { name: /apply changes/i }));

		expect(
			await screen.findByRole('button', { name: /contact support/i }),
		).toBeInTheDocument();
	});

	it('shows validation error when subdomain is less than 3 characters', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CustomDomainSettings />);

		await screen.findByText(/custom-host\.test\.cloud/i);
		await user.click(
			screen.getByRole('button', { name: /edit workspace link/i }),
		);

		const input = screen.getByRole('textbox');
		await user.clear(input);
		await user.type(input, 'ab');
		await user.click(screen.getByRole('button', { name: /apply changes/i }));

		expect(
			screen.getByText(/minimum 3 characters required/i),
		).toBeInTheDocument();
	});

	it('shows all workspace URLs as links in the dropdown', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CustomDomainSettings />);

		await screen.findByText(/custom-host\.test\.cloud/i);

		// Open the URL dropdown
		await user.click(
			screen.getByRole('button', { name: /custom-host\.test\.cloud/i }),
		);

		// Both host URLs should appear as links in the dropdown
		const links = await screen.findAllByRole('link');
		const hostLinks = links.filter(
			(link) =>
				link.getAttribute('href')?.includes('test.cloud') &&
				link.getAttribute('target') === '_blank',
		);
		expect(hostLinks).toHaveLength(2);

		// Verify the URLs
		const hrefs = hostLinks.map((link) => link.getAttribute('href'));
		expect(hrefs).toContain('https://accepted-starfish.test.cloud');
		expect(hrefs).toContain('https://custom-host.test.cloud');
	});

	it('calls toast.custom with new URL after successful domain update', async () => {
		server.use(
			rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockHostsResponse)),
			),
			rest.put(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({})),
			),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CustomDomainSettings />);

		await screen.findByText(/custom-host\.test\.cloud/i);
		await user.click(
			screen.getByRole('button', { name: /edit workspace link/i }),
		);

		const input = screen.getByRole('textbox');
		await user.clear(input);
		await user.type(input, 'myteam');
		await user.click(screen.getByRole('button', { name: /apply changes/i }));

		// Verify toast.custom was called
		await waitFor(() => {
			expect(mockToastCustom).toHaveBeenCalledTimes(1);
		});

		// Render the toast element to verify its content
		const toastRenderer = mockToastCustom.mock.calls[0][0] as (
			id: string,
		) => JSX.Element;
		const { container } = render(toastRenderer('test-id'));
		expect(container).toHaveTextContent(/myteam\.test\.cloud/i);
	});

	describe('Workspace Name rendering', () => {
		it('renders org displayName when available from appContext', async () => {
			server.use(
				rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(mockHostsResponse)),
				),
			);

			render(<CustomDomainSettings />, undefined, {
				appContextOverrides: {
					org: [{ id: 'xyz', displayName: 'My Org Name', createdAt: 0 }],
				},
			});

			expect(await screen.findByText('My Org Name')).toBeInTheDocument();
		});

		it('falls back to customDomainSubdomain when org displayName is missing', async () => {
			server.use(
				rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(mockHostsResponse)),
				),
			);

			render(<CustomDomainSettings />, undefined, {
				appContextOverrides: { org: [] },
			});

			expect(await screen.findByText('custom-host')).toBeInTheDocument();
		});

		it('falls back to activeHost.name when neither org name nor custom domain exists', async () => {
			const onlyDefaultHostResponse = {
				...mockHostsResponse,
				data: {
					...mockHostsResponse.data,
					hosts: mockHostsResponse.data.hosts
						? [mockHostsResponse.data.hosts[0]]
						: [],
				},
			};

			server.use(
				rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(onlyDefaultHostResponse)),
				),
			);

			render(<CustomDomainSettings />, undefined, {
				appContextOverrides: { org: [] },
			});

			// 'accepted-starfish' is the default host's name
			expect(await screen.findByText('accepted-starfish')).toBeInTheDocument();
		});

		it('does not render the card name row if workspaceName is totally falsy', async () => {
			const emptyHostsResponse = {
				...mockHostsResponse,
				data: {
					...mockHostsResponse.data,
					hosts: [],
				},
			};

			server.use(
				rest.get(ZEUS_HOSTS_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(emptyHostsResponse)),
				),
			);

			const { container } = render(<CustomDomainSettings />, undefined, {
				appContextOverrides: { org: [] },
			});

			await screen.findByRole('button', { name: /edit workspace link/i });

			expect(
				container.querySelector('.custom-domain-card-name-row'),
			).not.toBeInTheDocument();
		});
	});
});
