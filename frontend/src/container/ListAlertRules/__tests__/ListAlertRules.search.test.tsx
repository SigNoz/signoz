import userEvent from '@testing-library/user-event';
import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor, within } from 'tests/test-utils';
import {
	getCurrentNuqsQueryString,
	getCurrentNuqsSearchParams,
} from 'tests/nuqs-helpers';

import {
	getSearchDraft,
	renderListAlertRules,
	runSearchQuery,
	setSearchDraft,
} from './_helpers';

const QUERY = "name CONTAINS 'CPU'";

function lastRequest(requests: URLSearchParams[]): URLSearchParams {
	return requests[requests.length - 1];
}

describe('ListAlertRules — search', () => {
	let requests: URLSearchParams[];

	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		requests = [];
		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json(listRulesV3Response(alertRulesFixture, req.url.searchParams)),
				);
			}),
		);
	});

	it('sends the draft query only when Run is clicked', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		setSearchDraft(QUERY);

		await expect(
			screen.findByTestId('alert-rules-list-search-dirty'),
		).resolves.toBeInTheDocument();
		expect(requests.some((r) => r.has('query'))).toBe(false);
		expect(getCurrentNuqsSearchParams().has('query')).toBe(false);

		await user.click(screen.getByTestId('alert-rules-list-search-submit'));

		await waitFor(() => {
			expect(lastRequest(requests).get('query')).toBe(QUERY);
		});
		await waitFor(() => {
			expect(getCurrentNuqsSearchParams().get('query')).toBe(QUERY);
		});
		expect(
			screen.queryByTestId('alert-rules-list-search-dirty'),
		).not.toBeInTheDocument();
	});

	it('runs the draft on Mod-Enter', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		setSearchDraft(QUERY);
		const content = screen
			.getByTestId('alert-rules-list-search')
			.querySelector<HTMLElement>('.cm-content');
		if (!content) {
			throw new Error('Editor content not found');
		}
		content.focus();
		await user.keyboard('{Control>}{Enter}{/Control}');

		await waitFor(() => {
			expect(getCurrentNuqsSearchParams().get('query')).toBe(QUERY);
		});
	});

	it('trims the submitted query', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await runSearchQuery(user, `  ${QUERY}  `);

		await waitFor(() => {
			expect(getCurrentNuqsSearchParams().get('query')).toBe(QUERY);
		});
		expect(lastRequest(requests).get('query')).toBe(QUERY);
	});

	it('loads the query from the URL into the editor and the request', async () => {
		renderListAlertRules({
			initialRoute: `/?query=${encodeURIComponent(QUERY)}`,
		});

		await screen.findByText('High CPU Alert');

		expect(getSearchDraft()).toBe(QUERY);
		expect(requests[0].get('query')).toBe(QUERY);
	});

	it('resets page to 1 when a query is run', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules({ initialRoute: '/?page=2' });

		await screen.findByTestId('alert-rules-list-search');
		await runSearchQuery(user, QUERY);

		await waitFor(() => {
			expect(getCurrentNuqsSearchParams().get('query')).toBe(QUERY);
		});
		expect(getCurrentNuqsQueryString()).not.toContain('page=2');
		await waitFor(() => {
			expect(lastRequest(requests).get('offset')).toBe('0');
		});
	});

	it('sends each selected state as a repeated states= param', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.click(screen.getByTestId('alert-rules-filter-states'));
		await user.click(await screen.findByRole('option', { name: 'Firing' }));
		await user.click(await screen.findByRole('option', { name: 'Disabled' }));

		await waitFor(() => {
			expect(lastRequest(requests).getAll('states')).toStrictEqual([
				'firing',
				'disabled',
			]);
		});
		expect(lastRequest(requests).has('states[]')).toBe(false);
		await waitFor(() => {
			expect(getCurrentNuqsSearchParams().get('states')).toBe('firing,disabled');
		});
	});

	it('Clear empties the query and the states', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules({
			initialRoute: `/?query=${encodeURIComponent(QUERY)}&states=firing`,
		});

		await screen.findByText('High CPU Alert');
		expect(lastRequest(requests).get('query')).toBe(QUERY);

		await user.click(screen.getByTestId('alert-rules-filter-clear'));

		await waitFor(() => {
			const params = getCurrentNuqsSearchParams();
			expect(params.has('query')).toBe(false);
			expect(params.has('states')).toBe(false);
		});
		await waitFor(() => {
			const last = lastRequest(requests);
			expect(last.has('query')).toBe(false);
			expect(last.has('states')).toBe(false);
		});
		expect(getSearchDraft()).toBe('');
		expect(
			screen.queryByTestId('alert-rules-filter-clear'),
		).not.toBeInTheDocument();
	});

	it.each(['rule_list_filter_invalid', 'rule_list_invalid'])(
		'shows the backend message and no-results state for %s',
		async (code) => {
			const user = userEvent.setup({ delay: null });
			server.use(
				rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
					if (req.url.searchParams.has('query')) {
						return res(
							ctx.status(400),
							ctx.json({ error: { code, message: 'unknown field "nme"' } }),
						);
					}
					return res(
						ctx.status(200),
						ctx.json(listRulesV3Response(alertRulesFixture, req.url.searchParams)),
					);
				}),
			);

			renderListAlertRules();

			await screen.findByText('High CPU Alert');

			await runSearchQuery(user, "nme = 'x'");

			await expect(
				screen.findByTestId('alert-rules-query-error'),
			).resolves.toHaveTextContent('unknown field "nme"');
			const empty = screen.getByTestId('no-results-empty-state');
			expect(within(empty).getByTestId('no-results-subtitle')).toHaveTextContent(
				'The filter query is invalid. Fix it or clear the search.',
			);
			expect(screen.queryByTestId('error-empty-state')).not.toBeInTheDocument();
			expect(screen.queryByText('High CPU Alert')).not.toBeInTheDocument();
		},
	);
});
