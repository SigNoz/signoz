import { toast } from '@signozhq/ui/toast';
import {
	AuthDomainListPermission,
	buildAuthDomainDeletePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/auth-domain.permissions';
import {
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AuthDomain from '../index';
import {
	AUTH_DOMAINS_DELETE_ENDPOINT,
	AUTH_DOMAINS_LIST_ENDPOINT,
	mockDeleteSuccessResponse,
	mockDomainsListResponse,
	mockGoogleAuthDomain,
} from './mocks';

jest.mock('@signozhq/ui/toast', () => ({
	...jest.requireActual('@signozhq/ui/toast'),
	toast: {
		success: jest.fn(),
		danger: jest.fn(),
	},
}));

const FIRST_ID = mockGoogleAuthDomain.id ?? '';
const FIRST_ROW = `auth-domain-row-${mockGoogleAuthDomain.name}`;

function useListHandler(): { calls: () => number } {
	let calls = 0;
	server.use(
		rest.get(AUTH_DOMAINS_LIST_ENDPOINT, (_, res, ctx) => {
			calls += 1;
			return res(ctx.status(200), ctx.json(mockDomainsListResponse));
		}),
	);
	return { calls: (): number => calls };
}

async function openDeleteModal(rowIndex = 0): Promise<void> {
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	await screen.findByTestId(FIRST_ROW);
	await user.click(screen.getAllByTestId('auth-domain-delete')[rowIndex]);
	await screen.findByTestId('auth-domain-delete-confirm');
}

async function confirmAfterCheck(): Promise<HTMLElement> {
	await waitFor(() =>
		expect(screen.getByTestId('auth-domain-delete-confirm')).not.toHaveAttribute(
			'aria-busy',
		),
	);
	return screen.getByTestId('auth-domain-delete-confirm');
}

describe('AuthDomain — authz', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('list', () => {
		it('renders the domains when list is granted', async () => {
			server.use(setupAuthzAdmin());
			useListHandler();

			render(<AuthDomain />);

			await expect(screen.findByTestId(FIRST_ROW)).resolves.toBeInTheDocument();
			expect(
				screen.queryByText(/is not authorized to perform/i),
			).not.toBeInTheDocument();
		});

		it('shows the permission-denied UI and sends no list request when list is denied', async () => {
			server.use(setupAuthzDeny(AuthDomainListPermission));
			const list = useListHandler();

			render(<AuthDomain />);

			await expect(
				screen.findByText(/is not authorized to perform/i),
			).resolves.toBeInTheDocument();
			expect(screen.queryByTestId(FIRST_ROW)).not.toBeInTheDocument();
			expect(list.calls()).toBe(0);
		});

		it('keeps Add Domain and Configure enabled without create or update grants', async () => {
			server.use(setupAuthzAllow(AuthDomainListPermission));
			useListHandler();

			render(<AuthDomain />);

			await screen.findByTestId(FIRST_ROW);

			expect(screen.getByTestId('auth-domain-add')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
			expect(
				screen.getAllByTestId('auth-domain-configure')[0],
			).not.toHaveAttribute('aria-disabled', 'true');
		});
	});

	describe('delete', () => {
		it('deletes the domain and refetches the list when delete is granted', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let deletedId: string | readonly string[] | undefined;
			server.use(
				setupAuthzAdmin(),
				rest.delete(AUTH_DOMAINS_DELETE_ENDPOINT, (req, res, ctx) => {
					deletedId = req.params.id;
					return res(ctx.status(200), ctx.json(mockDeleteSuccessResponse));
				}),
			);
			const list = useListHandler();

			render(<AuthDomain />);
			await openDeleteModal();

			const confirm = await confirmAfterCheck();
			expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
			await user.click(confirm);

			await waitFor(() =>
				expect(toast.success).toHaveBeenCalledWith('Domain deleted successfully'),
			);
			expect(deletedId).toBe(mockGoogleAuthDomain.id);
			await waitFor(() => expect(list.calls()).toBeGreaterThan(1));
		});

		it('disables confirm with the denied permission when delete is denied on that domain', async () => {
			server.use(setupAuthzDeny(buildAuthDomainDeletePermission(FIRST_ID)));
			useListHandler();

			render(<AuthDomain />);
			await openDeleteModal();

			const confirm = await confirmAfterCheck();
			expect(confirm).toHaveAttribute('aria-disabled', 'true');
			expect(confirm).toHaveAttribute(
				'data-denied-permissions',
				expect.stringContaining(FIRST_ID),
			);
		});

		it('keeps confirm enabled on a domain whose delete is granted', async () => {
			server.use(setupAuthzDeny(buildAuthDomainDeletePermission(FIRST_ID)));
			useListHandler();

			render(<AuthDomain />);
			await openDeleteModal(1);

			const confirm = await confirmAfterCheck();
			expect(confirm).not.toHaveAttribute('data-denied-permissions');
			expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
		});

		it('shows the error modal and keeps the domain when the delete is rejected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			server.use(
				setupAuthzAdmin(),
				rest.delete(AUTH_DOMAINS_DELETE_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(403),
						ctx.json({
							error: {
								code: 'authz_forbidden',
								message: 'not allowed to delete this domain',
								url: '',
							},
						}),
					),
				),
			);
			useListHandler();

			render(<AuthDomain />);
			await openDeleteModal();

			const confirm = await confirmAfterCheck();
			expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
			await user.click(confirm);

			expect(
				(await screen.findAllByText(/not allowed to delete this domain/i)).length,
			).toBeGreaterThan(0);
			expect(toast.success).not.toHaveBeenCalled();
			expect(screen.getByTestId(FIRST_ROW)).toBeInTheDocument();
		});
	});
});
