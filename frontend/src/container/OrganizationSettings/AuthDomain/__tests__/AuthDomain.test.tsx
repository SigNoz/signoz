import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AuthDomain from '../index';
import {
	AUTH_DOMAINS_LIST_ENDPOINT,
	mockDomainsListResponse,
	mockEmptyDomainsResponse,
	mockErrorResponse,
} from './mocks';

jest.mock('@signozhq/sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

describe('AuthDomain', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('List View', () => {
		it('renders page header and add button', async () => {
			server.use(
				rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(mockEmptyDomainsResponse)),
				),
			);

			render(<AuthDomain />);

			expect(screen.getByText(/authenticated domains/i)).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /add domain/i }),
			).toBeInTheDocument();
		});

		it('renders list of auth domains successfully', async () => {
			server.use(
				rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(mockDomainsListResponse)),
				),
			);

			render(<AuthDomain />);

			await waitFor(() => {
				expect(screen.getByText('signoz.io')).toBeInTheDocument();
				expect(screen.getByText('example.com')).toBeInTheDocument();
				expect(screen.getByText('corp.io')).toBeInTheDocument();
			});
		});

		it('renders empty state when no domains exist', async () => {
			server.use(
				rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(mockEmptyDomainsResponse)),
				),
			);

			render(<AuthDomain />);

			await waitFor(() => {
				expect(screen.getByText(/no data/i)).toBeInTheDocument();
			});
		});

		it('displays error content when API fails', async () => {
			server.use(
				rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(500), ctx.json(mockErrorResponse)),
				),
			);

			render(<AuthDomain />);

			await waitFor(() => {
				expect(
					screen.getByText(/failed to perform operation/i),
				).toBeInTheDocument();
			});
		});
	});

	describe('Add Domain', () => {
		it('opens create modal when Add Domain button is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(mockEmptyDomainsResponse)),
				),
			);

			render(<AuthDomain />);

			const addButton = await screen.findByRole('button', { name: /add domain/i });
			await user.click(addButton);

			await waitFor(() => {
				expect(
					screen.getByText(/configure authentication method/i),
				).toBeInTheDocument();
			});
		});
	});

	describe('Configure Domain', () => {
		it('opens edit modal when configure action is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
					res(ctx.status(200), ctx.json(mockDomainsListResponse)),
				),
			);

			render(<AuthDomain />);

			await waitFor(() => {
				expect(screen.getByText('signoz.io')).toBeInTheDocument();
			});

			const configureLinks = await screen.findAllByText(/configure google auth/i);
			await user.click(configureLinks[0]);

			await waitFor(() => {
				expect(screen.getByText(/edit google authentication/i)).toBeInTheDocument();
			});
		});
	});
});
