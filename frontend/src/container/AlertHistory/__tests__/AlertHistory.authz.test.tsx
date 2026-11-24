import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AllTheProviders,
	render,
	renderHook,
	screen,
	waitFor,
	within,
} from 'tests/test-utils';

import TopContributorsRenderer from '../Statistics/TopContributorsRenderer/TopContributorsRenderer';
import TimelineTable from '../Timeline/Table/Table';
import { useAlertHistoryFilterSuggestions } from '../Timeline/Table/useAlertHistoryFilterSuggestions';

const RULE_ID = 'rule-1';
const HISTORY = `http://localhost/api/v2/rules/${RULE_ID}/history`;
const route = `${ROUTES.ALERT_HISTORY}?ruleId=${RULE_ID}&relativeTime=6h`;
const DENIAL =
	'user/u-1 is not authorized to perform logs:read on resource "service.name"';

const failWith = (
	path: string,
	status: number,
	code: string,
): ReturnType<typeof rest.get> =>
	rest.get(`${HISTORY}/${path}`, (_req, res, ctx) =>
		res(
			ctx.status(status),
			ctx.json({ status: 'error', error: { code, message: DENIAL } }),
		),
	);

describe('Alert history - AuthZ', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('names the telemetry the server refused in place of top contributors', async () => {
		server.use(failWith('top_contributors', 403, 'authz_forbidden'));
		render(<TopContributorsRenderer totalCurrentTriggers={0} />, undefined, {
			initialRoute: route,
		});

		await expect(screen.findByText(DENIAL)).resolves.toBeInTheDocument();
	});

	it('shows no denial for top contributors failing otherwise', async () => {
		let answered = false;
		server.use(
			rest.get(`${HISTORY}/top_contributors`, (_req, res, ctx) => {
				answered = true;
				return res(
					ctx.status(500),
					ctx.json({
						status: 'error',
						error: { code: 'internal', message: DENIAL },
					}),
				);
			}),
		);
		render(<TopContributorsRenderer totalCurrentTriggers={0} />, undefined, {
			initialRoute: route,
		});

		await waitFor(() => expect(answered).toBe(true));
		expect(screen.queryByText(DENIAL)).not.toBeInTheDocument();
	});

	it('names the telemetry the server refused in the timeline', async () => {
		server.use(failWith('timeline', 403, 'authz_forbidden'));
		render(<TimelineTable />, undefined, { initialRoute: route });

		const error = await screen.findByTestId('timeline-error');
		expect(error).toHaveTextContent(DENIAL);
		// The generic error block heads itself with the code; the callout does not.
		expect(within(error).queryByText('authz_forbidden')).not.toBeInTheDocument();
	});

	describe('value suggestions', () => {
		const suggest = (): ReturnType<
			ReturnType<
				typeof useAlertHistoryFilterSuggestions
			>['valueSuggestionsOverride']
		> => {
			const { result } = renderHook(
				() => useAlertHistoryFilterSuggestions(RULE_ID),
				{
					wrapper: ({ children }) => (
						<AllTheProviders initialRoute={route}>{children}</AllTheProviders>
					),
				},
			);
			return result.current.valueSuggestionsOverride('service.name', '');
		};

		it('suggests nothing, without an error, when the server refuses', async () => {
			server.use(failWith('filter_values', 403, 'authz_forbidden'));

			await expect(suggest()).resolves.toStrictEqual({
				stringValues: [],
				numberValues: [],
				complete: true,
			});
		});

		it('still fails on other errors', async () => {
			server.use(failWith('filter_values', 500, 'internal'));

			await expect(suggest()).rejects.toBeTruthy();
		});
	});
});
