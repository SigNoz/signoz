import dayjs from 'dayjs';
import type {
	AuthtypesTransactionDTO,
	GatewaytypesIngestionKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	buildIngestionKeyAttachPermission,
	buildIngestionKeyDeletePermission,
	buildIngestionKeyDetachPermission,
	buildIngestionKeyUpdatePermission,
	buildIngestionLimitDeletePermission,
	buildIngestionLimitUpdatePermission,
	IngestionKeyCreatePermission,
	IngestionKeyListPermission,
	IngestionLimitCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/ingestion.permissions';
import { gettableTransactionToPermission } from 'lib/authz/hooks/useAuthZ/utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import MultiIngestionSettings from '../MultiIngestionSettings';

jest.setTimeout(15_000);

const ROUTE = '/ingestion-settings';
const DATE = '2024-01-01T00:00:00Z';
const EXPIRES_AT = '2030-01-01T00:00:00Z';

const DENIED_TEXT = /is not authorized to perform/i;

const makeKey = (
	id: string,
	name: string,
	limits: GatewaytypesIngestionKeyDTO['limits'] = [],
): GatewaytypesIngestionKeyDTO => ({
	id,
	name,
	value: 'secret',
	workspace_id: 'w1',
	expires_at: EXPIRES_AT,
	created_at: DATE,
	updated_at: DATE,
	tags: [],
	limits,
});

const KEY_ONE = makeKey('k1', 'Key One', [
	{ id: 'l1', signal: 'logs', config: { day: { size: 1073741824 } } },
]);
const KEY_TWO = makeKey('k2', 'Key Two');
const KEY_THREE = makeKey('k3', 'Key Three');

function mockKeys(keys: GatewaytypesIngestionKeyDTO[]): jest.Mock {
	const onList = jest.fn();
	server.use(
		rest.get('*/api/v1/global/config*', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						external_url: '',
						ingestion_url: 'http://ingest.example.com',
						ai_assistant_url: null,
						mcp_url: null,
					},
				}),
			),
		),
		rest.get('*/api/v2/gateway/ingestion_keys*', (_req, res, ctx) => {
			onList();
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						keys,
						_pagination: {
							page: 1,
							per_page: 10,
							pages: 1,
							total: keys.length,
						},
					},
				}),
			);
		}),
	);
	return onList;
}

function recordAuthzChecks(): Set<string> {
	const seen = new Set<string>();
	server.use(
		rest.post(AUTHZ_CHECK_URL, async (req) => {
			const payload = (await req.json()) as AuthtypesTransactionDTO[];
			payload.forEach((txn) => seen.add(gettableTransactionToPermission(txn)));
			return undefined;
		}),
	);
	return seen;
}

async function expandKey(
	user: ReturnType<typeof userEvent.setup>,
	name: string,
): Promise<void> {
	await user.click(
		await screen.findByRole('button', { name: new RegExp(`right ${name}`, 'i') }),
	);
	await screen.findByText('LIMITS');
}

async function settledButton(testId: string): Promise<HTMLElement> {
	const button = await screen.findByTestId(testId);
	await waitFor(() => {
		expect(button).not.toHaveAttribute('aria-busy');
	});
	return button;
}

function renderPage(): ReturnType<typeof userEvent.setup> {
	render(<MultiIngestionSettings />, undefined, { initialRoute: ROUTE });
	return userEvent.setup({ pointerEventsCheck: 0 });
}

describe('MultiIngestionSettings authz', () => {
	afterEach(async () => {
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});
		server.resetHandlers();
	});

	describe('ingestion-key:list', () => {
		it('hides the list, disables search and fires no list request when denied', async () => {
			const onList = mockKeys([KEY_ONE]);
			server.use(setupAuthzDeny(IngestionKeyListPermission));

			renderPage();

			await screen.findByText(DENIED_TEXT);
			expect(
				screen.getByPlaceholderText('Search for ingestion key...'),
			).toBeDisabled();
			expect(screen.queryByText('Key One')).not.toBeInTheDocument();
			expect(onList).not.toHaveBeenCalled();
		});

		it('shows the list and requests it when granted', async () => {
			const onList = mockKeys([KEY_ONE]);
			server.use(setupAuthzAdmin());

			renderPage();

			await screen.findByText('Key One');
			expect(onList).toHaveBeenCalled();
			expect(screen.queryByText(DENIED_TEXT)).not.toBeInTheDocument();
		});
	});

	describe('ingestion-key:create', () => {
		it('disables "New Ingestion key" when denied', async () => {
			mockKeys([KEY_ONE]);
			server.use(setupAuthzDeny(IngestionKeyCreatePermission));

			renderPage();

			await expect(
				settledButton('ingestion-key-add-btn'),
			).resolves.toHaveAttribute('aria-disabled', 'true');
		});

		it('enables "New Ingestion key" and opens the modal when granted', async () => {
			mockKeys([KEY_ONE]);
			server.use(setupAuthzAdmin());

			const user = renderPage();

			await expect(
				settledButton('ingestion-key-add-btn'),
			).resolves.not.toHaveAttribute('aria-disabled', 'true');
			await user.click(screen.getByTestId('ingestion-key-add-btn'));

			await screen.findByTestId('create-new-key');
		});
	});

	describe('creating a key without list access', () => {
		it('sends no list request after the key is created', async () => {
			const onList = mockKeys([KEY_ONE]);
			const onCreate = jest.fn();
			server.use(
				setupAuthzDeny(IngestionKeyListPermission),
				rest.post('*/api/v2/gateway/ingestion_keys', (_req, res, ctx) => {
					onCreate();
					return res(
						ctx.status(200),
						ctx.json({ status: 'success', data: { id: 'k9', value: 'v' } }),
					);
				}),
			);

			const user = renderPage();

			await expect(
				settledButton('ingestion-key-add-btn'),
			).resolves.not.toHaveAttribute('aria-disabled', 'true');
			await user.click(screen.getByTestId('ingestion-key-add-btn'));
			await user.type(await screen.findByLabelText('Name'), 'new-key');
			await user.click(screen.getByLabelText('Expiration'));
			await user.click(
				await screen.findByTitle(dayjs().add(1, 'day').format('YYYY-MM-DD')),
			);
			await user.click(screen.getByTestId('create-new-key'));

			await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
			await screen.findByText(DENIED_TEXT);
			expect(onList).not.toHaveBeenCalled();
		});
	});

	describe('ingestion-key:update', () => {
		it('disables "Update Ingestion Key" for the denied key', async () => {
			mockKeys([KEY_ONE, KEY_TWO]);
			server.use(setupAuthzDeny(buildIngestionKeyUpdatePermission('k1')));

			const user = renderPage();

			await user.click(await screen.findByTestId('ingestion-key-edit-btn-k1'));
			await expect(
				settledButton('ingestion-key-update-btn'),
			).resolves.toHaveAttribute('aria-disabled', 'true');
		});

		it('keeps "Update Ingestion Key" enabled for another key', async () => {
			mockKeys([KEY_ONE, KEY_TWO]);
			server.use(setupAuthzDeny(buildIngestionKeyUpdatePermission('k1')));

			const user = renderPage();

			await user.click(await screen.findByTestId('ingestion-key-edit-btn-k2'));
			await expect(
				settledButton('ingestion-key-update-btn'),
			).resolves.not.toHaveAttribute('aria-disabled', 'true');
		});
	});

	describe('ingestion-key:delete', () => {
		it('disables "Delete Ingestion Key" when denied for that key', async () => {
			mockKeys([KEY_ONE]);
			server.use(setupAuthzDeny(buildIngestionKeyDeletePermission('k1')));

			const user = renderPage();

			await user.click(
				await screen.findByTestId('ingestion-key-delete-open-btn-k1'),
			);
			await expect(
				settledButton('ingestion-key-delete-btn'),
			).resolves.toHaveAttribute('aria-disabled', 'true');
		});
	});

	describe('saving a new limit', () => {
		it('disables "Save" when attach is denied on the key', async () => {
			mockKeys([KEY_TWO]);
			server.use(setupAuthzDeny(buildIngestionKeyAttachPermission('k2')));

			const user = renderPage();
			await expandKey(user, 'Key Two');
			await user.click(screen.getByTestId('ingestion-limit-add-btn-logs'));

			await expect(
				settledButton('ingestion-limit-save-btn'),
			).resolves.toHaveAttribute('aria-disabled', 'true');
		});

		it('disables "Save" when ingestion-limit:create is denied', async () => {
			mockKeys([KEY_TWO]);
			server.use(setupAuthzDeny(IngestionLimitCreatePermission));

			const user = renderPage();
			await expandKey(user, 'Key Two');
			await user.click(screen.getByTestId('ingestion-limit-add-btn-logs'));

			await expect(
				settledButton('ingestion-limit-save-btn'),
			).resolves.toHaveAttribute('aria-disabled', 'true');
		});
	});

	describe('saving an existing limit', () => {
		it('disables "Save" when update is denied on that limit', async () => {
			mockKeys([KEY_ONE]);
			server.use(setupAuthzDeny(buildIngestionLimitUpdatePermission('l1')));

			const user = renderPage();
			await expandKey(user, 'Key One');
			await user.click(screen.getByTestId('ingestion-limit-edit-btn-logs'));

			await expect(
				settledButton('ingestion-limit-save-btn'),
			).resolves.toHaveAttribute('aria-disabled', 'true');
		});

		it('keeps "Save" enabled when only create and attach are denied', async () => {
			mockKeys([KEY_ONE]);
			server.use(
				setupAuthzDeny(
					IngestionLimitCreatePermission,
					buildIngestionKeyAttachPermission('k1'),
				),
			);

			const user = renderPage();
			await expandKey(user, 'Key One');
			await user.click(screen.getByTestId('ingestion-limit-edit-btn-logs'));

			await expect(
				settledButton('ingestion-limit-save-btn'),
			).resolves.not.toHaveAttribute('aria-disabled', 'true');
		});
	});

	describe('deleting a limit', () => {
		it.each([
			['ingestion-limit:delete', buildIngestionLimitDeletePermission('l1')],
			['ingestion-key:detach', buildIngestionKeyDetachPermission('k1')],
		])('disables "Delete Limit" when %s is denied', async (_name, denied) => {
			mockKeys([KEY_ONE]);
			server.use(setupAuthzDeny(denied));

			const user = renderPage();
			await expandKey(user, 'Key One');
			await user.click(screen.getByTestId('ingestion-limit-delete-open-btn-logs'));

			await expect(
				settledButton('ingestion-limit-delete-btn'),
			).resolves.toHaveAttribute('aria-disabled', 'true');
		});
	});

	describe('id checks', () => {
		it('only checks list and create on load, and per-id checks once a modal opens', async () => {
			mockKeys([KEY_ONE, KEY_TWO, KEY_THREE]);
			server.use(setupAuthzAdmin());
			const seen = recordAuthzChecks();

			const user = renderPage();

			await screen.findByText('Key Three');
			await expect(
				settledButton('ingestion-key-add-btn'),
			).resolves.not.toHaveAttribute('aria-disabled', 'true');

			expect([...seen].sort()).toStrictEqual(
				[IngestionKeyListPermission, IngestionKeyCreatePermission].sort(),
			);

			await user.click(screen.getByTestId('ingestion-key-edit-btn-k1'));
			await expect(
				settledButton('ingestion-key-update-btn'),
			).resolves.not.toHaveAttribute('aria-disabled', 'true');

			expect(seen.has(buildIngestionKeyUpdatePermission('k1'))).toBe(true);
			expect(seen.has(buildIngestionKeyUpdatePermission('k2'))).toBe(false);
			expect(seen.has(buildIngestionKeyUpdatePermission('k3'))).toBe(false);
		});
	});
});
