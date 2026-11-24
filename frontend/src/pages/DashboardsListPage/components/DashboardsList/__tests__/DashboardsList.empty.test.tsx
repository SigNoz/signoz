import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen } from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

import DashboardsList from '../DashboardsList';

const LIST_URL = 'http://localhost/api/v2/users/me/dashboards';
const VIEWS_URL = 'http://localhost/api/v2/dashboard_views';

describe('DashboardsList - empty workspace', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('keeps the query bar above the empty state', async () => {
		server.use(
			setupAuthzAdmin(),
			rest.get(VIEWS_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: [] })),
			),
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

		render(
			<NuqsTestingAdapter searchParams={{}} hasMemory>
				<DashboardsList />
			</NuqsTestingAdapter>,
		);

		await screen.findByTestId('learn-more');
		expect(screen.getByTestId('dashboards-list-search')).toBeInTheDocument();
		expect(screen.getAllByTestId('new-dashboard-cta')).toHaveLength(1);
	});
});
