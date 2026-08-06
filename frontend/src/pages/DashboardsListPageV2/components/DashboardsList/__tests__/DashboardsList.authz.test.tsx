import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { DashboardCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import DashboardsList from '../DashboardsList';

const LIST_URL = 'http://localhost/api/v2/users/me/dashboards';
const VIEWS_URL = 'http://localhost/api/v2/dashboard_views';

function renderList(): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter searchParams={{}} hasMemory>
			<DashboardsList />
		</NuqsTestingAdapter>,
	);
}

describe('DashboardsList - AuthZ', () => {
	beforeEach(() => {
		server.use(
			rest.get(VIEWS_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: [] })),
			),
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('create permission', () => {
		it('renders the create CTA disabled instead of hiding it when create is denied', async () => {
			server.use(
				setupAuthzDeny(DashboardCreatePermission),
				rest.get(LIST_URL, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: { dashboards: [], total: 0, tags: [] },
						}),
					),
				),
			);

			renderList();

			await waitFor(() => {
				expect(screen.getByTestId('new-dashboard-cta')).toHaveAttribute(
					'data-denied-permissions',
					DashboardCreatePermission,
				);
			});
			expect(screen.getByTestId('new-dashboard-cta')).toBeDisabled();
		});

		it('enables the create CTA when create is granted', async () => {
			server.use(
				setupAuthzAdmin(),
				rest.get(LIST_URL, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: { dashboards: [], total: 0, tags: [] },
						}),
					),
				),
			);

			renderList();

			const cta = await screen.findByTestId('new-dashboard-cta');
			await waitFor(() => expect(cta).not.toBeDisabled());
		});
	});

	describe('list permission', () => {
		it('blocks the table and never fires the list request when list is denied', async () => {
			const onList = jest.fn();
			server.use(
				// Create is still granted — the CTA must stay usable (authz guide list pattern).
				setupAuthzAllow(DashboardCreatePermission),
				rest.get(LIST_URL, (_req, res, ctx) => {
					onList();
					return res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: { dashboards: [], total: 0, tags: [] },
						}),
					);
				}),
			);

			renderList();

			await waitFor(() => {
				expect(
					screen.getByText(/is not authorized to perform/),
				).toBeInTheDocument();
			});
			expect(screen.getByText('list:dashboard:*')).toBeInTheDocument();
			expect(onList).not.toHaveBeenCalled();

			const cta = screen.getByTestId('new-dashboard-cta');
			expect(cta).not.toBeDisabled();
		});

		it('renders the table when list is granted', async () => {
			server.use(
				setupAuthzAdmin(),
				rest.get(LIST_URL, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: {
								dashboards: [
									{
										id: 'dash-1',
										createdBy: 'someone@signoz.io',
										tags: [],
										spec: { display: { name: 'Checkout latency' } },
									},
								],
								total: 1,
								tags: [],
							},
						}),
					),
				),
			);

			renderList();

			await expect(
				screen.findByText('Checkout latency'),
			).resolves.toBeInTheDocument();
			expect(
				screen.queryByText(/is not authorized to perform/),
			).not.toBeInTheDocument();
		});
	});

	describe('loading', () => {
		it('leaves the create CTA disabled without a tooltip while the check is in flight', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
				rest.get(LIST_URL, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: { dashboards: [], total: 0, tags: [] },
						}),
					),
				),
			);

			renderList();

			const cta = await screen.findByTestId('new-dashboard-cta');
			expect(cta).toBeDisabled();
			expect(cta).not.toHaveAttribute('data-denied-permissions');
		});
	});
});
