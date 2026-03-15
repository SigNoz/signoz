import { toast } from '@signozhq/sonner';
import { ServiceaccounttypesFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
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
	accountId: 'sa-1',
	keys,
	isLoading: false,
	isDisabled: false,
	currentPage: 1,
	pageSize: 10,
	onRefetch: jest.fn(),
	onAddKeyClick: jest.fn(),
};

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
		render(<KeysTab {...defaultProps} isLoading={true} />);
		expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
	});

	it('renders empty state when no keys', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onAddKeyClick = jest.fn();
		render(<KeysTab {...defaultProps} keys={[]} onAddKeyClick={onAddKeyClick} />);

		expect(
			screen.getByText(/No keys. Start by creating one./i),
		).toBeInTheDocument();
		const addBtn = screen.getByRole('button', { name: /\+ Add your first key/i });
		await user.click(addBtn);
		expect(onAddKeyClick).toHaveBeenCalled();
	});

	it('renders table with keys', () => {
		render(<KeysTab {...defaultProps} />);

		expect(screen.getByText('Production Key')).toBeInTheDocument();
		expect(screen.getByText('Staging Key')).toBeInTheDocument();
		expect(screen.getByText('Never')).toBeInTheDocument();
		expect(screen.getByText('Dec 31, 2030')).toBeInTheDocument();
	});

	it('clicking a row opens EditKeyModal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<KeysTab {...defaultProps} />);

		const row = screen.getByText('Production Key').closest('tr');
		if (!row) {
			throw new Error('Row not found');
		}

		await user.click(row);

		await screen.findByRole('dialog', { name: /Edit Key Details/i });
	});

	it('clicking revoke icon opens confirmation dialog', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<KeysTab {...defaultProps} />);

		const revokeBtns = screen
			.getAllByRole('button')
			.filter((btn) => btn.className.includes('keys-tab__revoke-btn'));
		await user.click(revokeBtns[0]);

		await screen.findByRole('dialog', { name: /Revoke Production Key/i });
	});

	it('handles successful key revocation', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onRefetch = jest.fn();

		render(<KeysTab {...defaultProps} onRefetch={onRefetch} />);

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
			expect(onRefetch).toHaveBeenCalled();
		});
	});

	it('disables actions when isDisabled is true', () => {
		render(<KeysTab {...defaultProps} isDisabled={true} />);

		const revokeBtns = screen
			.getAllByRole('button')
			.filter((btn) => btn.className.includes('keys-tab__revoke-btn'));
		revokeBtns.forEach((btn) => expect(btn).toBeDisabled());
	});
});
