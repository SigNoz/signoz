import { toast } from '@signozhq/sonner';
import { ServiceaccounttypesFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import KeysTab from '../KeysTab';

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockToast = jest.mocked(toast);

const SA_KEY_ENDPOINT = '*/api/v1/service_accounts/sa-1/keys/:fid';

const keys: ServiceaccounttypesFactorAPIKeyDTO[] = [
	{
		id: 'key-1',
		name: 'Production Key',
		expiresAt: 0,
		lastObservedAt: null as any,
		key: 'snz_prod_123',
		serviceAccountId: 'sa-1',
	},
	{
		id: 'key-2',
		name: 'Staging Key',
		expiresAt: 1924905600, // 2030-12-31
		lastObservedAt: new Date('2026-03-10T10:00:00Z'),
		key: 'snz_stag_456',
		serviceAccountId: 'sa-1',
	},
];

const defaultProps = {
	keys,
	isLoading: false,
	isDisabled: false,
	currentPage: 1,
	pageSize: 10,
};

function renderKeysTab(
	props: Partial<typeof defaultProps> = {},
	searchParams: Record<string, string> = { account: 'sa-1' },
): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<KeysTab {...defaultProps} {...props} />
		</NuqsTestingAdapter>,
	);
}

describe('KeysTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.delete(SA_KEY_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders loading state', () => {
		renderKeysTab({ isLoading: true });
		expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
	});

	it('renders empty state when no keys and clicking add sets add-key param', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onUrlUpdate = jest.fn();
		render(
			<NuqsTestingAdapter
				searchParams={{ account: 'sa-1' }}
				onUrlUpdate={onUrlUpdate}
			>
				<KeysTab {...defaultProps} keys={[]} />
			</NuqsTestingAdapter>,
		);

		expect(
			screen.getByText(/No keys. Start by creating one./i),
		).toBeInTheDocument();
		const addBtn = screen.getByRole('button', { name: /\+ Add your first key/i });
		await user.click(addBtn);
		expect(onUrlUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				queryString: expect.stringContaining('add-key=true'),
			}),
		);
	});

	it('renders table with keys', () => {
		renderKeysTab();

		expect(screen.getByText('Production Key')).toBeInTheDocument();
		expect(screen.getByText('Staging Key')).toBeInTheDocument();
		expect(screen.getByText('Never')).toBeInTheDocument();
		expect(screen.getByText('Dec 31, 2030')).toBeInTheDocument();
	});

	it('clicking a row sets the edit-key URL param', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onUrlUpdate = jest.fn();

		render(
			<NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
				<KeysTab {...defaultProps} />
			</NuqsTestingAdapter>,
		);

		const row = screen.getByText('Production Key').closest('tr');
		if (!row) {
			throw new Error('Row not found');
		}

		await user.click(row);

		expect(onUrlUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				queryString: expect.stringContaining('edit-key=key-1'),
			}),
		);
	});

	it('clicking revoke icon sets revoke-key URL param', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onUrlUpdate = jest.fn();

		render(
			<NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
				<KeysTab {...defaultProps} />
			</NuqsTestingAdapter>,
		);

		const revokeBtns = screen
			.getAllByRole('button')
			.filter((btn) => btn.className.includes('keys-tab__revoke-btn'));
		await user.click(revokeBtns[0]);

		expect(onUrlUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				queryString: expect.stringContaining('revoke-key=key-1'),
			}),
		);
	});

	it('handles successful key revocation via RevokeKeyModal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderKeysTab();

		// Seed the keys cache so RevokeKeyModal can read the key name
		const revokeBtns = screen
			.getAllByRole('button')
			.filter((btn) => btn.className.includes('keys-tab__revoke-btn'));
		await user.click(revokeBtns[0]);

		const confirmBtn = await screen.findByRole('button', { name: /Revoke Key/i });
		await user.click(confirmBtn);

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith(
				'Key revoked successfully',
				expect.anything(),
			);
		});
	});

	it('disables actions when isDisabled is true', () => {
		renderKeysTab({ isDisabled: true });

		const revokeBtns = screen
			.getAllByRole('button')
			.filter((btn) => btn.className.includes('keys-tab__revoke-btn'));
		revokeBtns.forEach((btn) => expect(btn).toBeDisabled());
	});
});
