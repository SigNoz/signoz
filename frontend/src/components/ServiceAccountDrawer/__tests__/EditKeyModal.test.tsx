import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import {
	useRevokeServiceAccountKey,
	useUpdateServiceAccountKey,
} from 'api/generated/services/serviceaccount';
import { ServiceaccounttypesFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import EditKeyModal from '../EditKeyModal';

jest.mock('@signozhq/toggle-group', () => ({
	ToggleGroup: ({
		children,
		onValueChange,
		value,
		className,
	}: {
		children: ReactNode;
		onValueChange?: (val: string) => void;
		value?: string;
		className?: string;
	}): JSX.Element => (
		<div
			className={className}
			data-testid="toggle-group"
			data-value={value}
			onClick={(e): void => {
				const target = e.target as HTMLElement;
				const toggleItem = target.closest('[data-toggle-value]');
				if (toggleItem) {
					onValueChange?.(toggleItem.getAttribute('data-toggle-value') || '');
				}
			}}
		>
			{children}
		</div>
	),
	ToggleGroupItem: ({
		children,
		value,
		className,
	}: {
		children: ReactNode;
		value: string;
		className?: string;
	}): JSX.Element => (
		<button
			type="button"
			className={className}
			data-toggle-value={value}
			data-testid={`toggle-item-${value}`}
		>
			{children}
		</button>
	),
}));

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
			<div role="dialog" aria-label={title} data-testid="dialog-wrapper">
				{children}
			</div>
		) : null,
	DialogFooter: ({ children }: { children?: ReactNode }): JSX.Element => (
		<div data-testid="dialog-footer">{children}</div>
	),
}));

jest.mock('api/generated/services/serviceaccount');

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUpdateKey = jest.fn();
const mockRevokeKey = jest.fn();
const mockToast = jest.mocked(toast);

const keyItem: ServiceaccounttypesFactorAPIKeyDTO = {
	id: 'key-1',
	name: 'Original Key Name',
	expiresAt: 0,
	lastObservedAt: null as any,
	key: 'snz_abc123',
	serviceAccountId: 'sa-1',
};

const defaultProps = {
	open: true,
	accountId: 'sa-1',
	keyItem,
	onClose: jest.fn(),
	onSuccess: jest.fn(),
};

describe('EditKeyModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(useUpdateServiceAccountKey).mockReturnValue(({
			mutateAsync: mockUpdateKey,
		} as unknown) as ReturnType<typeof useUpdateServiceAccountKey>);
		jest.mocked(useRevokeServiceAccountKey).mockReturnValue(({
			mutateAsync: mockRevokeKey,
		} as unknown) as ReturnType<typeof useRevokeServiceAccountKey>);
	});

	it('renders correctly with initial values', () => {
		render(<EditKeyModal {...defaultProps} />);

		expect(screen.getByDisplayValue('Original Key Name')).toBeInTheDocument();
		expect(screen.getByText('No Expiration')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
	});

	it('enables save button when name is changed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<EditKeyModal {...defaultProps} />);

		const nameInput = screen.getByPlaceholderText(/Enter key name/i);
		await user.clear(nameInput);
		await user.type(nameInput, 'New Key Name');

		expect(
			screen.getByRole('button', { name: /Save Changes/i }),
		).not.toBeDisabled();
	});

	it('calls updateKey API and onSuccess on save', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSuccess = jest.fn();
		mockUpdateKey.mockResolvedValue({});

		render(<EditKeyModal {...defaultProps} onSuccess={onSuccess} />);

		const nameInput = screen.getByPlaceholderText(/Enter key name/i);
		await user.type(nameInput, ' Updated');

		await user.click(screen.getByRole('button', { name: /Save Changes/i }));

		await waitFor(() => {
			expect(mockUpdateKey).toHaveBeenCalled();
			expect(mockToast.success).toHaveBeenCalledWith(
				'Key updated successfully',
				expect.anything(),
			);
			expect(onSuccess).toHaveBeenCalled();
		});
	});

	it('opens revoke confirmation and handles revocation', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSuccess = jest.fn();
		mockRevokeKey.mockResolvedValue({});

		render(<EditKeyModal {...defaultProps} onSuccess={onSuccess} />);

		await user.click(screen.getByRole('button', { name: /Revoke Key/i }));

		expect(
			screen.getByText(/Revoking this key will permanently invalidate it/i),
		).toBeInTheDocument();

		const confirmRevokeBtn = screen.getByRole('button', {
			name: (content, element) =>
				content === 'Revoke Key' && element?.tagName === 'BUTTON',
		});
		await user.click(confirmRevokeBtn);

		await waitFor(() => {
			expect(mockRevokeKey).toHaveBeenCalledWith({
				pathParams: { id: 'sa-1', fid: 'key-1' },
			});
			expect(mockToast.success).toHaveBeenCalledWith(
				'Key revoked successfully',
				expect.anything(),
			);
			expect(onSuccess).toHaveBeenCalled();
		});
	});

	it('closes modal when clicking cancel', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClose = jest.fn();
		render(<EditKeyModal {...defaultProps} onClose={onClose} />);

		await user.click(screen.getByRole('button', { name: /Cancel/i }));

		expect(onClose).toHaveBeenCalled();
	});
});
