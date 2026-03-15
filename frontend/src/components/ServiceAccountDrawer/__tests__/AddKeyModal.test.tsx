import { toast } from '@signozhq/sonner';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AddKeyModal from '../AddKeyModal';

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockToast = jest.mocked(toast);

const SA_KEYS_ENDPOINT = '*/api/v1/service_accounts/sa-1/keys';

const createdKeyResponse = {
	data: {
		id: 'key-1',
		name: 'Deploy Key',
		key: 'snz_abc123xyz456secret',
		expiresAt: 0,
		lastObservedAt: null,
	},
};

const defaultProps = {
	open: true,
	accountId: 'sa-1',
	onClose: jest.fn(),
	onSuccess: jest.fn(),
};

describe('AddKeyModal', () => {
	beforeAll(() => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: jest.fn().mockResolvedValue(undefined) },
			configurable: true,
			writable: true,
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.post(SA_KEYS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(201), ctx.json(createdKeyResponse)),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
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
		await screen.findByRole('dialog', { name: /Key Created Successfully/i });
	});

	it('copy button writes key to clipboard and shows toast.success', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const writeTextSpy = jest
			.spyOn(navigator.clipboard, 'writeText')
			.mockResolvedValue(undefined);

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
