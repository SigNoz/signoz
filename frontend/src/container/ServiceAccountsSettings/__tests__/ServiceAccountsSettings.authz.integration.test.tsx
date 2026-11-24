import { EditorView } from '@uiw/react-codemirror';
import {
	reflectedValues,
	spliceClause,
} from 'components/ListFilter/dsl/filterQuery';
import { listRolesSuccessResponse } from 'mocks-server/__mockdata__/roles';
import { rest, server } from 'mocks-server/server';
import {
	NuqsTestingAdapter,
	type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import {
	act,
	configure,
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

import ServiceAccountsSettings from '../ServiceAccountsSettings';

configure({ asyncUtilTimeout: 3000 });

const SA_LIST_ENDPOINT = '*/api/v1/service_accounts';
const SA_ENDPOINT = '*/api/v1/service_accounts/:id';
const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/:id/keys';
const ROLES_ENDPOINT = '*/api/v1/roles';

const mockServiceAccountsAPI = [
	{
		id: 'sa-1',
		name: 'CI Bot',
		email: 'ci-bot@signoz.io',
		serviceAccountRoles: [],
		status: 'active',
		createdAt: 1700000000,
		updatedAt: 1700000001,
	},
	{
		id: 'sa-2',
		name: 'Monitoring Agent',
		email: 'monitor@signoz.io',
		serviceAccountRoles: [],
		status: 'active',
		createdAt: 1700000002,
		updatedAt: 1700000003,
	},
	{
		id: 'sa-3',
		name: 'Legacy Bot',
		email: 'legacy@signoz.io',
		serviceAccountRoles: [],
		status: 'deleted',
		createdAt: 1700000004,
		updatedAt: 1700000005,
	},
];

type ListRequestSpy = jest.MockedFunction<(params: string) => void>;

const ACTIVE_QUERY = "status = 'active'";

const listParams = (params: Record<string, string>): string =>
	new URLSearchParams(params).toString();

const listServiceAccountsHandler = (
	onRequest?: ListRequestSpy,
): ReturnType<typeof rest.get> =>
	rest.get(SA_LIST_ENDPOINT, (req, res, ctx) => {
		onRequest?.(req.url.searchParams.toString());
		const query = req.url.searchParams.get('query') ?? '';
		const statuses = reflectedValues(query, 'status');
		const text = spliceClause(query, 'status', null).toLowerCase();
		const matched = mockServiceAccountsAPI.filter(
			(account) =>
				(statuses.length === 0 || statuses.includes(account.status)) &&
				(!text ||
					account.name.toLowerCase().includes(text) ||
					account.email.toLowerCase().includes(text)),
		);

		return res(
			ctx.status(200),
			ctx.json({
				status: 'success',
				data: {
					serviceAccounts: matched,
					total: matched.length,
					reservedKeywords: ['created_at', 'email', 'name', 'status', 'updated_at'],
				},
			}),
		);
	});

function setSearchDraft(value: string): void {
	const view = EditorView.findFromDOM(screen.getByTestId('sa-list-search'));
	if (!view) {
		throw new Error('Search editor not found');
	}
	act(() => {
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: value },
		});
	});
}

describe('ServiceAccountsSettings (integration)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			setupAuthzAdmin(),
			listServiceAccountsHandler(),
			rest.get(SA_ENDPOINT, (req, res, ctx) => {
				const { id } = req.params as { id: string };
				const account = mockServiceAccountsAPI.find((a) => a.id === id);
				return account
					? res(ctx.status(200), ctx.json({ data: account }))
					: res(ctx.status(404), ctx.json({ message: 'Not found' }));
			}),
			rest.get(SA_KEYS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [] })),
			),
			rest.get(ROLES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('opens on the active accounts with the status clause in the query', async () => {
		const onRequest = jest.fn() as ListRequestSpy;
		server.use(listServiceAccountsHandler(onRequest));

		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await expect(screen.findByTestId('sa-row-sa-1')).resolves.toHaveTextContent(
			'CI Bot',
		);
		expect(screen.getByTestId('sa-row-sa-2')).toHaveTextContent(
			'Monitoring Agent',
		);
		expect(screen.queryByTestId('sa-row-sa-3')).not.toBeInTheDocument();
		expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
		expect(onRequest).toHaveBeenCalledWith(
			listParams({ limit: '20', offset: '0', query: ACTIVE_QUERY }),
		);
	});

	it('unchecking Active on the status chip lists the deleted ones too', async () => {
		const onRequest = jest.fn() as ListRequestSpy;
		server.use(listServiceAccountsHandler(onRequest));
		const user = userEvent.setup();
		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByTestId('sa-row-sa-1');

		await user.click(
			within(screen.getByTestId('sa-filter-status')).getByRole('combobox'),
		);
		await user.click(
			await waitFor(() => {
				const option = screen
					.getAllByTitle('Active')
					.find((el) => el.classList.contains('ant-select-item-option'));
				if (!option) {
					throw new Error('the Active option has not rendered yet');
				}
				return option;
			}),
		);
		await user.click(document.body);

		await expect(screen.findByTestId('sa-row-sa-3')).resolves.toHaveTextContent(
			'Legacy Bot',
		);
		expect(screen.getByText('DELETED')).toBeInTheDocument();
		expect(onRequest).toHaveBeenLastCalledWith(
			listParams({ limit: '20', offset: '0' }),
		);
	});

	it('keeps an unrun draft when the status chip changes', async () => {
		const onRequest = jest.fn() as ListRequestSpy;
		server.use(listServiceAccountsHandler(onRequest));
		const user = userEvent.setup();
		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByTestId('sa-row-sa-1');

		setSearchDraft("name CONTAINS 'ci'");
		await screen.findByTestId('sa-list-search-dirty');

		await user.click(
			within(screen.getByTestId('sa-filter-status')).getByRole('combobox'),
		);
		await user.click(
			await waitFor(() => {
				const option = screen
					.getAllByTitle('Deleted')
					.find((el) => el.classList.contains('ant-select-item-option'));
				if (!option) {
					throw new Error('the Deleted option has not rendered yet');
				}
				return option;
			}),
		);
		await user.click(document.body);

		await waitFor(() =>
			expect(onRequest).toHaveBeenLastCalledWith(
				listParams({
					limit: '20',
					offset: '0',
					query: "name CONTAINS 'ci' AND status = 'deleted'",
				}),
			),
		);
	});

	it('sends the draft query only when it is run', async () => {
		const onRequest = jest.fn() as ListRequestSpy;
		server.use(listServiceAccountsHandler(onRequest));
		const user = userEvent.setup();
		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByTestId('sa-row-sa-1');

		setSearchDraft('monitor');

		await screen.findByTestId('sa-list-search-dirty');
		expect(onRequest).not.toHaveBeenCalledWith(
			expect.stringContaining('monitor'),
		);

		await user.click(screen.getByTestId('sa-list-search-submit'));

		await expect(screen.findByTestId('sa-row-sa-2')).resolves.toHaveTextContent(
			'Monitoring Agent',
		);
		await waitFor(() =>
			expect(screen.queryByTestId('sa-row-sa-1')).not.toBeInTheDocument(),
		);
		expect(onRequest).toHaveBeenLastCalledWith(
			listParams({ limit: '20', offset: '0', query: 'monitor' }),
		);
		expect(screen.queryByTestId('sa-list-search-dirty')).not.toBeInTheDocument();
	});

	it('shows a rejected query under the search box and keeps the table', async () => {
		server.use(
			rest.get(SA_LIST_ENDPOINT, (req, res, ctx) =>
				req.url.searchParams.get('query')?.includes('owner')
					? res(
							ctx.status(400),
							ctx.json({
								status: 'error',
								error: {
									code: 'service_account_list_filter_invalid',
									type: 'invalid_input',
									message: 'invalid filter query: unknown key "owner"',
									url: '',
									errors: [],
									suggestions: [],
								},
							}),
						)
					: res(
							ctx.status(200),
							ctx.json({
								status: 'success',
								data: {
									serviceAccounts: mockServiceAccountsAPI,
									total: mockServiceAccountsAPI.length,
									reservedKeywords: [],
								},
							}),
						),
			),
		);
		const user = userEvent.setup();
		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');

		setSearchDraft('owner = ci');
		await user.click(screen.getByTestId('sa-list-search-submit'));

		await expect(
			screen.findByTestId('sa-invalid-query-detail'),
		).resolves.toHaveTextContent('unknown key "owner"');
		expect(
			screen.queryByText(/An unexpected error occurred while fetching/i),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('sa-row-sa-1')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('sa-filter-clear'));

		await expect(screen.findByText('CI Bot')).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('sa-invalid-query')).not.toBeInTheDocument();
	});

	it('pages on the server: the footer shows the total and page 2 asks for an offset', async () => {
		const onRequest = jest.fn() as ListRequestSpy;
		server.use(
			rest.get(SA_LIST_ENDPOINT, (req, res, ctx) => {
				onRequest(req.url.searchParams.toString());
				const offset = Number(req.url.searchParams.get('offset')) || 0;

				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							serviceAccounts: Array.from({ length: 20 }, (_, index) => ({
								id: `sa-${offset + index}`,
								name: `Bot ${offset + index}`,
								email: `bot-${offset + index}@signoz.io`,
								status: 'active',
								createdAt: 1700000000 + index,
								updatedAt: 1700000000 + index,
							})),
							total: 45,
						},
					}),
				);
			}),
		);
		const user = userEvent.setup();
		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await expect(screen.findByTestId('sa-row-sa-0')).resolves.toHaveTextContent(
			'Bot 0',
		);
		expect(screen.getByText('of 45')).toBeInTheDocument();

		await user.click(screen.getByTitle('2'));

		await expect(screen.findByTestId('sa-row-sa-20')).resolves.toHaveTextContent(
			'Bot 20',
		);
		expect(onRequest).toHaveBeenLastCalledWith(
			listParams({ limit: '20', offset: '20', query: ACTIVE_QUERY }),
		);
	});

	it('repairs page=0 to the first page without asking for a negative offset', async () => {
		const onRequest = jest.fn() as ListRequestSpy;
		const onUrlUpdate = jest.fn() as jest.MockedFunction<OnUrlUpdateFunction>;
		server.use(
			rest.get(SA_LIST_ENDPOINT, (req, res, ctx) => {
				onRequest(req.url.searchParams.toString());
				if (Number(req.url.searchParams.get('offset')) < 0) {
					return res(
						ctx.status(400),
						ctx.json({
							status: 'error',
							error: {
								code: 'service_account_invalid_input',
								type: 'invalid_input',
								message: 'offset must not be negative',
								url: '',
								errors: [],
								suggestions: [],
							},
						}),
					);
				}

				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: { serviceAccounts: mockServiceAccountsAPI, total: 3 },
					}),
				);
			}),
		);
		render(
			<NuqsTestingAdapter
				searchParams="?page=0"
				rateLimitFactor={0}
				onUrlUpdate={onUrlUpdate}
			>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await expect(screen.findByTestId('sa-row-sa-1')).resolves.toHaveTextContent(
			'CI Bot',
		);
		expect(screen.queryByTestId('sa-invalid-query')).not.toBeInTheDocument();
		expect(onRequest).not.toHaveBeenCalledWith(
			expect.stringContaining('offset=-'),
		);
		await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
		const update = onUrlUpdate.mock.lastCall?.[0];
		expect(update?.options.history).toBe('replace');
		expect(update?.searchParams.get('page')).not.toBe('0');
	});

	it('recovers an out-of-range page to the last page that has rows', async () => {
		const onUrlUpdate = jest.fn() as jest.MockedFunction<OnUrlUpdateFunction>;
		server.use(
			rest.get(SA_LIST_ENDPOINT, (req, res, ctx) => {
				const offset = Number(req.url.searchParams.get('offset')) || 0;
				const length = Math.max(0, Math.min(20, 25 - offset));

				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							serviceAccounts: Array.from({ length }, (_, index) => ({
								id: `sa-${offset + index}`,
								name: `Bot ${offset + index}`,
								email: `bot-${offset + index}@signoz.io`,
								status: 'active',
								createdAt: 1700000000 + index,
								updatedAt: 1700000000 + index,
							})),
							total: 25,
						},
					}),
				);
			}),
		);
		render(
			<NuqsTestingAdapter
				searchParams="?page=99"
				hasMemory
				rateLimitFactor={0}
				onUrlUpdate={onUrlUpdate}
			>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await expect(screen.findByTestId('sa-row-sa-20')).resolves.toHaveTextContent(
			'Bot 20',
		);
		const update = onUrlUpdate.mock.lastCall?.[0];
		expect(update?.searchParams.get('page')).toBe('2');
		expect(update?.options.history).toBe('replace');
	});

	it('clicking a row opens the drawer with account details visible', async () => {
		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		const viewButton = await screen.findByRole('button', {
			name: /View service account CI Bot/i,
		});

		fireEvent.click(viewButton);

		await expect(
			screen.findByRole('button', { name: /Delete Service Account/i }),
		).resolves.toBeInTheDocument();
	});

	it('saving changes in the drawer refetches the list', async () => {
		const listRefetchSpy = jest.fn() as ListRequestSpy;
		const putSpy = jest.fn();

		server.use(
			listServiceAccountsHandler(listRefetchSpy),
			rest.put(SA_ENDPOINT, async (req, res, ctx) => {
				putSpy(await req.json());
				return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
			}),
		);

		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');
		listRefetchSpy.mockClear();

		fireEvent.click(
			await screen.findByRole('button', { name: /View service account CI Bot/i }),
		);

		const nameInput = await screen.findByDisplayValue('CI Bot');
		fireEvent.change(nameInput, { target: { value: 'CI Bot Updated' } });

		await screen.findByDisplayValue('CI Bot Updated');

		fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

		// Wait for the PUT to complete with the right payload — confirms save fired
		await waitFor(() =>
			expect(putSpy).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'CI Bot Updated' }),
			),
		);

		await waitFor(() => {
			expect(listRefetchSpy).toHaveBeenCalled();
		});
	});

	it('"New Service Account" button opens the Create Service Account modal', async () => {
		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await screen.findByText('CI Bot');

		// Wait for authz check to resolve before clicking
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /New Service Account/i }),
			).not.toHaveAttribute('aria-disabled', 'true'),
		);

		fireEvent.click(screen.getByRole('button', { name: /New Service Account/i }));

		await screen.findByTestId('create-service-account-modal');
		expect(screen.getByPlaceholderText('Enter a name')).toBeInTheDocument();
	});

	it('shows error state when API fails', async () => {
		server.use(
			rest.get(SA_LIST_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(500), ctx.json({ message: 'Internal Server Error' })),
			),
		);

		render(
			<NuqsTestingAdapter hasMemory rateLimitFactor={0}>
				<ServiceAccountsSettings />
			</NuqsTestingAdapter>,
		);

		await expect(
			screen.findByText(
				/An unexpected error occurred while fetching service accounts/i,
			),
		).resolves.toBeInTheDocument();
	});
});
