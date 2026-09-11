import { server } from 'mocks-server/server';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, waitFor, within } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import {
	DashboardCreatePermission,
	DashboardListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

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
					screen.getAllByText(/is not authorized to perform/).length,
				).toBeGreaterThan(0);
			});
			expect(screen.getAllByText('list:dashboard:*').length).toBeGreaterThan(0);
			expect(onList).not.toHaveBeenCalled();

			const cta = screen.getByTestId('new-dashboard-cta');
			expect(cta).not.toBeDisabled();

			// The box and filters edit a query only the list API can run, so they are
			// inert and say why; the rail carries its own denial.
			expect(
				within(screen.getByTestId('dashboards-filter-created-by')).getByRole(
					'combobox',
				),
			).toBeDisabled();
			expect(screen.getByLabelText('Run search')).toBeDisabled();
			expect(
				screen.getByTestId('dashboards-list-search').querySelector('.cm-content'),
			).toHaveAttribute('contenteditable', 'false');
			expect(screen.getByTestId('views-rail-denied')).toBeInTheDocument();

			expect(screen.getByTestId('dashboards-search-zone')).toHaveAttribute(
				'data-denied-permissions',
				DashboardListPermission,
			);
			expect(screen.getByTestId('dashboards-filter-zone')).toHaveAttribute(
				'data-denied-permissions',
				DashboardListPermission,
			);

			// Radix's content has no testid, and the table's callout carries the same
			// words, so the reason is read off the tooltip role.
			await userEvent.hover(screen.getByTestId('dashboards-search-zone'));
			await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
				'is not authorized to perform list:dashboard:*',
			);
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

		// Saved-view CRUD is gated on `dashboard:list`, so firing this only 403s.
		it('never fetches saved views when list is denied', async () => {
			const onViews = jest.fn();
			server.use(
				setupAuthzAllow(DashboardCreatePermission),
				rest.get(VIEWS_URL, (_req, res, ctx) => {
					onViews();
					return res(
						ctx.status(200),
						ctx.json({ status: 'success', data: { views: [] } }),
					);
				}),
			);

			renderList();

			await waitFor(() => {
				expect(
					screen.getAllByText(/is not authorized to perform/).length,
				).toBeGreaterThan(0);
			});
			expect(onViews).not.toHaveBeenCalled();
		});
	});

	describe('check failure', () => {
		// An unanswered check is not a grant, and the table is gated on the same
		// signal as the request, so it explains itself instead of rendering empty.
		it('blocks the table when the permission check fails', async () => {
			const onList = jest.fn();
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
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
					screen.getAllByText(/is not authorized to perform/).length,
				).toBeGreaterThan(0);
			});
			expect(onList).not.toHaveBeenCalled();
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
