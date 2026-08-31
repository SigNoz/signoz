import {
	AuthDomainListPermission,
	buildAuthDomainDeletePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/auth-domain.permissions';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDenyAll,
	setupAuthzGrantByPrefix,
} from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AuthDomain from '../index';
import { AUTH_DOMAINS_LIST_ENDPOINT, mockDomainsListResponse } from './mocks';

function setupListHandler(): void {
	server.use(
		rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) =>
			res(ctx.status(200), ctx.json(mockDomainsListResponse)),
		),
	);
}

describe('AuthDomain authz', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	describe('when all permissions are denied', () => {
		it('disables the add button and blocks the table with a callout', async () => {
			server.use(setupAuthzDenyAll());
			setupListHandler();

			render(<AuthDomain />);

			await waitFor(() => {
				expect(screen.getByTestId('auth-domain-add')).toBeDisabled();
			});

			await expect(
				screen.findByText(/is not authorized to perform/i),
			).resolves.toBeInTheDocument();
			expect(screen.getByText('list:auth-domain:*')).toBeInTheDocument();
			expect(screen.queryByText('signoz.io')).not.toBeInTheDocument();
		});
	});

	describe('when only list is granted', () => {
		it('renders rows but disables the row actions and the add button', async () => {
			server.use(setupAuthzGrantByPrefix('list'));
			setupListHandler();

			render(<AuthDomain />);

			await expect(screen.findByText('signoz.io')).resolves.toBeInTheDocument();

			await waitFor(() => {
				expect(screen.getByTestId('auth-domain-add')).toBeDisabled();
			});

			screen.getAllByTestId('auth-domain-configure').forEach((button) => {
				expect(button).toBeDisabled();
			});
			screen.getAllByTestId('auth-domain-delete').forEach((button) => {
				expect(button).toBeDisabled();
			});
			screen.getAllByRole('switch').forEach((toggle) => {
				expect(toggle).toBeDisabled();
			});
		});
	});

	describe('when all permissions are granted', () => {
		it('keeps every control interactive', async () => {
			server.use(setupAuthzAdmin());
			setupListHandler();

			render(<AuthDomain />);

			await expect(screen.findByText('signoz.io')).resolves.toBeInTheDocument();

			expect(screen.getByTestId('auth-domain-add')).toBeEnabled();
			await waitFor(() => {
				screen.getAllByTestId('auth-domain-configure').forEach((button) => {
					expect(button).toBeEnabled();
				});
			});
			screen.getAllByTestId('auth-domain-delete').forEach((button) => {
				expect(button).toBeEnabled();
			});
			screen.getAllByRole('switch').forEach((toggle) => {
				expect(toggle).toBeEnabled();
			});
		});
	});

	describe('when read is granted but update is not', () => {
		it('keeps configure clickable and disables save inside the modal', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			server.use(setupAuthzGrantByPrefix('list', 'read'));
			setupListHandler();

			render(<AuthDomain />);

			await expect(screen.findByText('signoz.io')).resolves.toBeInTheDocument();

			const configureButtons = screen.getAllByTestId('auth-domain-configure');
			await waitFor(() => {
				expect(configureButtons[0]).toBeEnabled();
			});
			await user.click(configureButtons[0]);

			await screen.findByTestId('auth-domain-save');
			await waitFor(() => {
				const saveButton = screen.getByTestId('auth-domain-save');
				expect(saveButton).toBeDisabled();
				expect(saveButton).toHaveAttribute('data-denied-permissions');
			});
		});
	});

	describe('when delete is granted on a single domain', () => {
		it('enables delete only for that row', async () => {
			server.use(
				setupAuthzAllow(
					AuthDomainListPermission,
					buildAuthDomainDeletePermission('domain-1'),
				),
			);
			setupListHandler();

			render(<AuthDomain />);

			await expect(screen.findByText('signoz.io')).resolves.toBeInTheDocument();

			const deleteButtons = screen.getAllByTestId('auth-domain-delete');
			expect(deleteButtons).toHaveLength(3);

			// Row order follows mockDomainsListResponse: domain-1, domain-2, domain-3
			await waitFor(() => {
				expect(deleteButtons[0]).toBeEnabled();
			});
			expect(deleteButtons[1]).toBeDisabled();
			expect(deleteButtons[2]).toBeDisabled();
		});
	});

	describe('while permission checks are loading', () => {
		it('keeps the add button disabled', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
			);
			setupListHandler();

			render(<AuthDomain />);

			await waitFor(() => {
				expect(screen.getByTestId('auth-domain-add')).toBeDisabled();
			});
		});
	});
});
