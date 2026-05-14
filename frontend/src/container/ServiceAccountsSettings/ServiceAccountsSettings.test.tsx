import type { AuthtypesTransactionDTO } from 'api/generated/services/sigNoz.schemas';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, waitFor } from 'tests/test-utils';
import { AUTHZ_CHECK_URL, authzMockResponse } from 'tests/authz-test-utils';
import ServiceAccountsSettings from './ServiceAccountsSettings';

const SA_LIST_URL = 'http://localhost/api/v1/service_accounts';

function renderPage(): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter searchParams={{}} hasMemory>
			<ServiceAccountsSettings />
		</NuqsTestingAdapter>,
	);
}

describe('ServiceAccountsSettings — FGA', () => {
	beforeEach(() => {
		server.use(
			rest.get(SA_LIST_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [] })),
			),
		);
	});

	it('shows PermissionDeniedFullPage when list permission is denied', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(
						authzMockResponse(
							payload,
							payload.map(() => false),
						),
					),
				);
			}),
		);

		renderPage();

		await waitFor(() => {
			expect(
				screen.getByText(/You don't have permission to view this page/),
			).toBeInTheDocument();
		});

		expect(screen.queryByRole('table')).not.toBeInTheDocument();
	});

	it('shows table when list permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
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

		renderPage();

		await waitFor(() => {
			expect(screen.getByRole('table')).toBeInTheDocument();
		});

		expect(
			screen.queryByText(/You don't have permission to view this page/),
		).not.toBeInTheDocument();
	});

	it('disables New Service Account button when create permission is denied', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				// grant list, deny create — matched by relation name
				return res(
					ctx.status(200),
					ctx.json(
						authzMockResponse(
							payload,
							payload.map((txn: AuthtypesTransactionDTO) => txn.relation === 'list'),
						),
					),
				);
			}),
		);

		renderPage();

		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: /New Service Account/i }),
			).toBeDisabled();
		});
	});

	it('enables New Service Account button when create permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
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

		renderPage();

		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: /New Service Account/i }),
			).not.toBeDisabled();
		});
	});
});
