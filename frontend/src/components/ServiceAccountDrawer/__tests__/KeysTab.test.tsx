import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import { useRevokeServiceAccountKey } from 'api/generated/services/serviceaccount';
import { ServiceaccounttypesFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import KeysTab from '../KeysTab';

jest.mock('@signozhq/dialog', () => ({
	DialogWrapper: ({
		children,
		open,
		title,
	}: {
		children?: ReactNode;
		open: boolean;
		title?: string;
	}): JSX.Element | null =>
		open ? (
			<div role="dialog" aria-label={title}>
				{children}
			</div>
		) : null,
	DialogFooter: ({ children }: { children?: ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

jest.mock('antd', () => {
	const original = jest.requireActual('antd');
	return {
		...original,
		Skeleton: ({ active }: { active?: boolean }): JSX.Element | null =>
			active ? <div data-testid="skeleton">Loading...</div> : null,
	};
});

jest.mock('../EditKeyModal', () => ({
	__esModule: true,
	default: ({
		open,
		keyItem,
	}: {
		open: boolean;
		keyItem: any;
	}): JSX.Element | null =>
		open ? <div data-testid="edit-key-modal">Editing {keyItem?.name}</div> : null,
}));

jest.mock('api/generated/services/serviceaccount');

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockRevokeKey = jest.fn();
const mockToast = jest.mocked(toast);

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
		jest.mocked(useRevokeServiceAccountKey).mockReturnValue(({
			mutateAsync: mockRevokeKey,
		} as unknown) as ReturnType<typeof useRevokeServiceAccountKey>);
	});

	it('renders loading state', () => {
		render(<KeysTab {...defaultProps} isLoading={true} />);
		expect(screen.getByTestId('skeleton')).toBeInTheDocument();
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
		expect(screen.getByText('Never')).toBeInTheDocument(); // Expiry for Prod Key
		expect(screen.getByText('Dec 31, 2030')).toBeInTheDocument(); // Expiry for Staging Key
	});

	it('clicking a row opens EditKeyModal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<KeysTab {...defaultProps} />);

		const row = screen.getByText('Production Key').closest('tr');
		if (!row) {
			throw new Error('Row not found');
		}

		await user.click(row);

		expect(screen.getByTestId('edit-key-modal')).toHaveTextContent(
			'Editing Production Key',
		);
	});

	it('clicking revoke icon opens confirmation dialog', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<KeysTab {...defaultProps} />);

		const revokeBtns = screen
			.getAllByRole('button')
			.filter((btn) => btn.className.includes('keys-tab__revoke-btn'));
		await user.click(revokeBtns[0]);

		expect(
			screen.getByRole('dialog', { name: /Revoke Production Key\?/i }),
		).toBeInTheDocument();
	});

	it('handles successful key revocation', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onRefetch = jest.fn();
		mockRevokeKey.mockResolvedValue({});

		render(<KeysTab {...defaultProps} onRefetch={onRefetch} />);

		const revokeBtns = screen
			.getAllByRole('button')
			.filter((btn) => btn.className.includes('keys-tab__revoke-btn'));
		await user.click(revokeBtns[0]);

		const confirmBtn = screen.getByRole('button', { name: /Revoke Key/i });
		await user.click(confirmBtn);

		await waitFor(() => {
			expect(mockRevokeKey).toHaveBeenCalledWith({
				pathParams: { id: 'sa-1', fid: 'key-1' },
			});
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
