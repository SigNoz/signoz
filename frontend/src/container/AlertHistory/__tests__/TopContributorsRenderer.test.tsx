import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, within } from 'tests/test-utils';

import TopContributorsRenderer from '../Statistics/TopContributorsRenderer/TopContributorsRenderer';

const RULE_ID = 'rule-1';
const route = `${ROUTES.ALERT_HISTORY}?ruleId=${RULE_ID}&relativeTime=6h`;

const failWith = (status: number, code: string): ReturnType<typeof rest.get> =>
	rest.get(
		`http://localhost/api/v2/rules/${RULE_ID}/history/top_contributors`,
		(_req, res, ctx) =>
			res(
				ctx.status(status),
				ctx.json({ status: 'error', error: { code, message: 'refused' } }),
			),
	);

describe('TopContributorsRenderer', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it.each([
		[500, 'internal'],
		[403, 'authz_forbidden'],
	])('shows the generic error for a %i', async (status, code) => {
		server.use(failWith(status, code));
		render(<TopContributorsRenderer totalCurrentTriggers={0} />, undefined, {
			initialRoute: route,
		});

		const error = await screen.findByTestId('top-contributors-error');
		expect(within(error).getByText(code)).toBeInTheDocument();
	});
});
