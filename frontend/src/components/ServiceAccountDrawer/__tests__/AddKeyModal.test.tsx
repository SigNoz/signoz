import type { ReactNode } from 'react';
import { toast } from '@signozhq/sonner';
import { useCreateServiceAccountKey } from 'api/generated/services/serviceaccount';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AddKeyModal from '../AddKeyModal';

jest.mock('@signozhq/toggle-group', () => ({
	ToggleGroup: ({
		children,
		className,
	}: {
		children: ReactNode;
		onValueChange?: (val: string) => void;
		value?: string;
		type?: string;
		className?: string;
	}): JSX.Element => <div className={className}>{children}</div>,
	ToggleGroupItem: ({
		children,
		className,
	}: {
		children: ReactNode;
		value: string;
		className?: string;
	}): JSX.Element => <span className={className}>{children}</span>,
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
			<div role="dialog" aria-label={title}>
				{children}
			</div>
		) : null,
}));

jest.mock('api/generated/services/serviceaccount');

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockCreateKey = jest.fn();
const mockToast = jest.mocked(toast);

const defaultProps = {
	open: true,
	accountId: 'sa-1',
	onClose: jest.fn(),
	onSuccess: jest.fn(),
};

const createdKeyResponse = {
	data: {
		id: 'key-1',
		name: 'Deploy Key',
		key: 'snz_abc123xyz456secret',
		expiresAt: 0,
		lastObservedAt: null,
	},
};

describe('AddKeyModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(useCreateServiceAccountKey).mockReturnValue(({
			mutateAsync: mockCreateKey,
		} as unknown) as ReturnType<typeof useCreateServiceAccountKey>);
	});

	beforeAll(() => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: jest.fn().mockResolvedValue(undefined) },
			configurable: true,
			writable: true,
		});
	});

	it('"Create Key" is disabled when name is empty; enabled after typing a name', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<AddKeyModal {...defaultProps} />);

		expect(screen.getByRole('button', { name: /Create Key/i })).toBeDisabled();

		await user.type(screen.getByPlaceholderText(/Enter key name/i), 'My Key');

		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /Create Key/i }),
			).not.toBeDisabled(),
		);
	});

	it('successful creation transitions to phase 2 with key displayed and security callout', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		mockCreateKey.mockResolvedValue(createdKeyResponse);

		render(<AddKeyModal {...defaultProps} />);

		await user.type(screen.getByPlaceholderText(/Enter key name/i), 'Deploy Key');
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /Create Key/i }),
			).not.toBeDisabled(),
		);
		await user.click(screen.getByRole('button', { name: /Create Key/i }));

		await screen.findByText('snz_abc123xyz456secret');
		expect(screen.getByText(/Store the key securely/i)).toBeInTheDocument();
		expect(
			screen.getByRole('dialog', { name: /Key Created Successfully/i }),
		).toBeInTheDocument();
	});

	it('copy button writes key to clipboard and shows toast.success', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const writeTextSpy = jest
			.spyOn(navigator.clipboard, 'writeText')
			.mockResolvedValue(undefined);

		mockCreateKey.mockResolvedValue(createdKeyResponse);

		render(<AddKeyModal {...defaultProps} />);

		await user.type(screen.getByPlaceholderText(/Enter key name/i), 'Deploy Key');
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /Create Key/i }),
			).not.toBeDisabled(),
		);
		await user.click(screen.getByRole('button', { name: /Create Key/i }));

		await screen.findByText('snz_abc123xyz456secret');

		const copyBtn = screen
			.getAllByRole('button')
			.find((btn) => btn.querySelector('svg'));
		if (!copyBtn) {
			throw new Error('Copy button not found');
		}
		await user.click(copyBtn);

		await waitFor(() => {
			expect(writeTextSpy).toHaveBeenCalledWith('snz_abc123xyz456secret');
			expect(mockToast.success).toHaveBeenCalledWith(
				'Key copied to clipboard',
				expect.anything(),
			);
		});

		writeTextSpy.mockRestore();
	});

	it('onSuccess called only when closing from phase 2, not from phase 1 (Cancel)', async () => {
		const onSuccess = jest.fn();
		const onClose = jest.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(
			<AddKeyModal {...defaultProps} onSuccess={onSuccess} onClose={onClose} />,
		);

		await user.click(screen.getByRole('button', { name: /Cancel/i }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
