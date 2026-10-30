import userEvent from '@testing-library/user-event';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useAlertRuleViewsStore } from 'container/ListAlertRules/useAlertRuleViewsStore';
import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { getCurrentNuqsSearchParams } from 'tests/nuqs-helpers';
import { getAppContextMock, screen, waitFor, within } from 'tests/test-utils';

import { renderListAlertRules, runSearchQuery } from './_helpers';

const VIEW_1_ORDER_BY = JSON.stringify({ columnName: 'name', order: 'asc' });
const VIEW_1_QUERY = "severity = 'critical'";

type Body = Record<string, unknown>;
type User = ReturnType<typeof userEvent.setup>;

function captureRulesRequests(): URLSearchParams[] {
	const requests: URLSearchParams[] = [];
	server.use(
		rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
			requests.push(req.url.searchParams);
			return res(
				ctx.status(200),
				ctx.json(listRulesV3Response(alertRulesFixture, req.url.searchParams)),
			);
		}),
	);
	return requests;
}

function captureViewWrites(): {
	posts: Body[];
	puts: { id: string; body: Body }[];
	deletes: string[];
} {
	const captured = {
		posts: [] as Body[],
		puts: [] as { id: string; body: Body }[],
		deletes: [] as string[],
	};
	server.use(
		rest.post('http://localhost/api/v2/rule_views', async (req, res, ctx) => {
			const body = (await req.json()) as Body;
			captured.posts.push(body);
			return res(
				ctx.status(201),
				ctx.json({
					data: { ...body, id: 'new-view-id', orgId: 'org-1' },
					status: 'success',
				}),
			);
		}),
		rest.put('http://localhost/api/v2/rule_views/:id', async (req, res, ctx) => {
			const body = (await req.json()) as Body;
			const id = req.params.id as string;
			captured.puts.push({ id, body });
			return res(
				ctx.status(200),
				ctx.json({ data: { ...body, id, orgId: 'org-1' }, status: 'success' }),
			);
		}),
		rest.delete('http://localhost/api/v2/rule_views/:id', (req, res, ctx) => {
			captured.deletes.push(req.params.id as string);
			return res(ctx.status(204));
		}),
	);
	return captured;
}

function lastRequest(requests: URLSearchParams[]): URLSearchParams {
	return requests[requests.length - 1];
}

function urlParam(key: string): string | null {
	return getCurrentNuqsSearchParams().get(key);
}

function viewItem(id: string): HTMLElement {
	return screen.getByTestId(`alert-rules-view-${id}`);
}

function activeHeading(): HTMLElement {
	return screen.getByRole('heading', { level: 1 });
}

async function selectView(user: User, id: string): Promise<void> {
	await user.click(await screen.findByTestId(`alert-rules-view-${id}`));
	await waitFor(() => expect(urlParam('view')).toBe(id));
}

describe('ListAlertRules — saved views rail', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		localStorage.removeItem(LOCALSTORAGE.ALERT_RULES_LIST_VIEWS);
		useAlertRuleViewsStore.setState({ railCollapsed: false });
	});

	describe('builtin views', () => {
		it('renders the builtin views with All active by default', async () => {
			renderListAlertRules();

			await screen.findByText('High CPU Alert');
			expect(viewItem('mine')).toHaveTextContent('My alert rules');
			expect(viewItem('all')).toHaveTextContent('All alert rules');
			expect(viewItem('firing')).toHaveTextContent('Firing');
			expect(viewItem('disabled')).toHaveTextContent('Disabled');
			expect(activeHeading()).toHaveTextContent('All alert rules');
			expect(
				screen.queryByTestId('alert-rules-view-save-as-new'),
			).not.toBeInTheDocument();
			expect(
				screen.queryByTestId('alert-rules-view-reset'),
			).not.toBeInTheDocument();
		});

		it.each([
			['firing', 'Firing'],
			['disabled', 'Disabled'],
		])('%s sends states=%s', async (id, label) => {
			const user = userEvent.setup({ delay: null });
			const requests = captureRulesRequests();
			renderListAlertRules();
			await screen.findByText('High CPU Alert');

			await selectView(user, id);

			await waitFor(() => {
				expect(lastRequest(requests).getAll('states')).toStrictEqual([id]);
			});
			expect(lastRequest(requests).has('query')).toBe(false);
			expect(urlParam('states')).toBe(id);
			expect(activeHeading()).toHaveTextContent(label);
			expect(
				screen.queryByTestId('alert-rules-view-save-as-new'),
			).not.toBeInTheDocument();
		});

		it('My alert rules filters by the current user as creator', async () => {
			const user = userEvent.setup({ delay: null });
			const requests = captureRulesRequests();
			const { email } = getAppContextMock('ADMIN').user;
			renderListAlertRules();
			await screen.findByText('High CPU Alert');

			await selectView(user, 'mine');

			const expected = `created_by = '${email}'`;
			await waitFor(() => {
				expect(lastRequest(requests).get('query')).toBe(expected);
			});
			expect(lastRequest(requests).has('states')).toBe(false);
			expect(urlParam('query')).toBe(expected);
			expect(activeHeading()).toHaveTextContent('My alert rules');
		});

		it('editing a builtin view filter offers save as new view, which POSTs', async () => {
			const user = userEvent.setup({ delay: null });
			const captured = captureViewWrites();
			renderListAlertRules();
			await screen.findByText('High CPU Alert');

			await runSearchQuery(user, 'foo');

			await user.click(await screen.findByTestId('alert-rules-view-save-as-new'));
			expect(
				screen.queryByTestId('alert-rules-view-save-changes'),
			).not.toBeInTheDocument();
			await user.type(
				await screen.findByTestId('save-alert-rule-view-name'),
				'Foo alerts',
			);
			await user.click(screen.getByTestId('save-alert-rule-view-confirm'));

			await waitFor(() => expect(captured.posts).toHaveLength(1));
			expect(captured.posts[0]).toStrictEqual({
				name: 'Foo alerts',
				data: {
					version: 'v1',
					query: 'foo',
					states: [],
					sort: 'updated_at',
					order: 'desc',
				},
			});
			await waitFor(() => expect(urlParam('view')).toBe('new-view-id'));
		});
	});

	describe('saved views', () => {
		it('lists saved views and applies the selected one', async () => {
			const user = userEvent.setup({ delay: null });
			const requests = captureRulesRequests();
			renderListAlertRules({ initialRoute: '/?page=2' });

			await expect(
				screen.findByTestId('alert-rules-view-view-1'),
			).resolves.toHaveTextContent('Critical firing');
			expect(viewItem('view-2')).toHaveTextContent('Infra team');

			await selectView(user, 'view-1');

			await waitFor(() => {
				expect(urlParam('query')).toBe(VIEW_1_QUERY);
				expect(urlParam('states')).toBe('firing');
				expect(urlParam('orderBy')).toBe(VIEW_1_ORDER_BY);
			});
			expect(urlParam('page')).not.toBe('2');
			await waitFor(() => {
				const last = lastRequest(requests);
				expect(last.get('query')).toBe(VIEW_1_QUERY);
				expect(last.getAll('states')).toStrictEqual(['firing']);
				expect(last.get('sort')).toBe('name');
				expect(last.get('order')).toBe('asc');
				expect(last.get('offset')).toBe('0');
			});
			expect(activeHeading()).toHaveTextContent('Critical firing');
			expect(
				screen.queryByTestId('alert-rules-view-save-changes'),
			).not.toBeInTheDocument();
		});

		it('shows the unsaved-changes panel after editing an applied view filter', async () => {
			const user = userEvent.setup({ delay: null });
			renderListAlertRules();
			await selectView(user, 'view-1');

			await runSearchQuery(user, 'foo');

			await screen.findByTestId('alert-rules-view-save-changes');
			expect(screen.getByTestId('alert-rules-view-save-as')).toBeInTheDocument();
			expect(screen.getByTestId('alert-rules-view-reset')).toBeInTheDocument();
			expect(
				within(viewItem('view-1')).getByTitle('Unsaved changes'),
			).toBeInTheDocument();
		});

		it('Save PUTs the full current filter and the unchanged name', async () => {
			const user = userEvent.setup({ delay: null });
			const captured = captureViewWrites();
			renderListAlertRules();
			await selectView(user, 'view-1');
			await runSearchQuery(user, 'foo');

			await user.click(await screen.findByTestId('alert-rules-view-save-changes'));

			await waitFor(() => expect(captured.puts).toHaveLength(1));
			expect(captured.puts[0]).toStrictEqual({
				id: 'view-1',
				body: {
					name: 'Critical firing',
					data: {
						version: 'v1',
						query: 'foo',
						states: ['firing'],
						sort: 'name',
						order: 'asc',
					},
				},
			});
			await waitFor(() =>
				expect(
					screen.queryByTestId('alert-rules-view-save-changes'),
				).not.toBeInTheDocument(),
			);
		});

		it('Save as POSTs a new view and activates it', async () => {
			const user = userEvent.setup({ delay: null });
			const captured = captureViewWrites();
			renderListAlertRules();
			await selectView(user, 'view-1');
			await runSearchQuery(user, 'foo');

			await user.click(await screen.findByTestId('alert-rules-view-save-as'));
			await user.type(
				await screen.findByTestId('save-alert-rule-view-name'),
				'My view',
			);
			await user.click(screen.getByTestId('save-alert-rule-view-confirm'));

			await waitFor(() => expect(captured.posts).toHaveLength(1));
			expect(captured.posts[0]).toStrictEqual({
				name: 'My view',
				data: {
					version: 'v1',
					query: 'foo',
					states: ['firing'],
					sort: 'name',
					order: 'asc',
				},
			});
			await waitFor(() => expect(urlParam('view')).toBe('new-view-id'));
			expect(captured.puts).toHaveLength(0);
		});

		it('caps a view name at 64 characters', async () => {
			const user = userEvent.setup({ delay: null });
			const captured = captureViewWrites();
			renderListAlertRules();
			await screen.findByText('High CPU Alert');

			await user.click(screen.getByLabelText('Save current filters as a view'));
			const input = await screen.findByTestId('save-alert-rule-view-name');
			await user.type(input, 'x'.repeat(70));

			expect(input).toHaveValue('x'.repeat(64));
			await user.click(screen.getByTestId('save-alert-rule-view-confirm'));

			await waitFor(() => expect(captured.posts).toHaveLength(1));
			expect(captured.posts[0]).toMatchObject({ name: 'x'.repeat(64) });
		});

		it('Reset restores the active view filter', async () => {
			const user = userEvent.setup({ delay: null });
			renderListAlertRules();
			await selectView(user, 'view-1');
			await runSearchQuery(user, 'foo');
			await waitFor(() => expect(urlParam('query')).toBe('foo'));

			await user.click(await screen.findByTestId('alert-rules-view-reset'));

			await waitFor(() => {
				expect(urlParam('query')).toBe(VIEW_1_QUERY);
			});
			expect(urlParam('states')).toBe('firing');
			expect(urlParam('orderBy')).toBe(VIEW_1_ORDER_BY);
			expect(urlParam('view')).toBe('view-1');
			expect(
				screen.queryByTestId('alert-rules-view-reset'),
			).not.toBeInTheDocument();
		});

		it('rename PUTs the new name and keeps the stored filter', async () => {
			const user = userEvent.setup({ delay: null });
			const captured = captureViewWrites();
			renderListAlertRules();
			await selectView(user, 'view-2');
			await runSearchQuery(user, 'foo');
			await screen.findByTestId('alert-rules-view-save-changes');

			const row = viewItem('view-1').parentElement as HTMLElement;
			await user.click(within(row).getByLabelText('Rename view'));
			const input = await screen.findByTestId('rename-alert-rule-view-name');
			expect(input).toHaveValue('Critical firing');
			await user.clear(input);
			await user.type(input, 'Renamed');
			await user.click(screen.getByTestId('rename-alert-rule-view-confirm'));

			await waitFor(() => expect(captured.puts).toHaveLength(1));
			expect(captured.puts[0]).toStrictEqual({
				id: 'view-1',
				body: {
					name: 'Renamed',
					data: {
						version: 'v1',
						query: VIEW_1_QUERY,
						states: ['firing'],
						sort: 'name',
						order: 'asc',
					},
				},
			});
			await waitFor(() => expect(viewItem('view-1')).toHaveTextContent('Renamed'));
		});

		it('delete asks for confirmation and sends DELETE', async () => {
			const user = userEvent.setup({ delay: null });
			const captured = captureViewWrites();
			renderListAlertRules();
			await selectView(user, 'view-1');

			await user.click(screen.getByTestId('alert-rules-view-delete-view-2'));

			await expect(
				screen.findByText(/Views are shared across your organization/),
			).resolves.toBeInTheDocument();
			expect(captured.deletes).toHaveLength(0);
			await user.click(screen.getByRole('button', { name: 'Delete' }));

			await waitFor(() => expect(captured.deletes).toStrictEqual(['view-2']));
			expect(urlParam('view')).toBe('view-1');
		});

		it('deleting the active view falls back to All', async () => {
			const user = userEvent.setup({ delay: null });
			const captured = captureViewWrites();
			renderListAlertRules();
			await selectView(user, 'view-1');
			await waitFor(() => expect(urlParam('query')).toBe(VIEW_1_QUERY));

			await user.click(screen.getByTestId('alert-rules-view-delete-view-1'));
			await user.click(await screen.findByRole('button', { name: 'Delete' }));

			await waitFor(() => expect(captured.deletes).toStrictEqual(['view-1']));
			await waitFor(() => {
				expect(urlParam('view')).toBeNull();
				expect(urlParam('query')).toBeNull();
				expect(urlParam('states')).toBeNull();
			});
			expect(activeHeading()).toHaveTextContent('All alert rules');
		});

		it('All alert rules clears the view and its filters', async () => {
			const user = userEvent.setup({ delay: null });
			renderListAlertRules();
			await selectView(user, 'view-1');
			await waitFor(() => expect(urlParam('query')).not.toBeNull());

			await user.click(viewItem('all'));

			await waitFor(() => {
				expect(urlParam('view')).toBeNull();
				expect(urlParam('query')).toBeNull();
				expect(urlParam('states')).toBeNull();
			});
			expect(activeHeading()).toHaveTextContent('All alert rules');
		});
	});

	describe('shared links', () => {
		it('applies the linked view filter when the URL carries only view=', async () => {
			renderListAlertRules({ initialRoute: '/?view=view-1' });

			await waitFor(() => {
				expect(urlParam('query')).toBe(VIEW_1_QUERY);
				expect(urlParam('states')).toBe('firing');
				expect(urlParam('orderBy')).toBe(VIEW_1_ORDER_BY);
			});
			expect(urlParam('view')).toBe('view-1');
			expect(activeHeading()).toHaveTextContent('Critical firing');
			expect(
				screen.queryByTestId('alert-rules-view-save-changes'),
			).not.toBeInTheDocument();
		});

		it('keeps explicit filter params from the link and marks the view modified', async () => {
			renderListAlertRules({ initialRoute: '/?view=view-1&query=foo' });

			await screen.findByTestId('alert-rules-view-save-changes');
			expect(urlParam('query')).toBe('foo');
			expect(urlParam('states')).toBeNull();
			expect(activeHeading()).toHaveTextContent('Critical firing');
		});
	});

	describe('rail chrome', () => {
		it('filters views by name', async () => {
			const user = userEvent.setup({ delay: null });
			renderListAlertRules();
			await screen.findByTestId('alert-rules-view-view-2');

			const search = screen.getByTestId('alert-rules-view-search');
			await user.type(search, 'infra');

			expect(viewItem('view-2')).toBeInTheDocument();
			expect(
				screen.queryByTestId('alert-rules-view-view-1'),
			).not.toBeInTheDocument();
			expect(screen.queryByTestId('alert-rules-view-all')).not.toBeInTheDocument();

			await user.clear(search);
			await user.type(search, 'zzz');

			expect(screen.getByText(/No views match/)).toBeInTheDocument();
		});

		it('collapses the rail from the status bar and persists it', async () => {
			const user = userEvent.setup({ delay: null });
			renderListAlertRules();
			await screen.findByText('High CPU Alert');

			const toggle = screen.getByTestId('alert-rules-rail-toggle');
			expect(toggle).toHaveTextContent('Collapse');

			await user.click(toggle);

			expect(toggle).toHaveTextContent('Expand');
			const stored = JSON.parse(
				localStorage.getItem(LOCALSTORAGE.ALERT_RULES_LIST_VIEWS) ?? '{}',
			);
			expect(stored.state.railCollapsed).toBe(true);
		});
	});
});
