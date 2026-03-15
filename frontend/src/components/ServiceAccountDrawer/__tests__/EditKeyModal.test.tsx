import { toast } from '@signozhq/sonner';
import { ServiceaccounttypesFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import EditKeyModal from '../EditKeyModal';

jest.mock('@signozhq/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockToast = jest.mocked(toast);

const SA_KEY_ENDPOINT = '*/api/v1/service_accounts/sa-1/keys/key-1';

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
		server.use(
			rest.put(SA_KEY_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
			rest.delete(SA_KEY_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
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

		render(<EditKeyModal {...defaultProps} onSuccess={onSuccess} />);

		const nameInput = screen.getByPlaceholderText(/Enter key name/i);
		await user.type(nameInput, ' Updated');

		await user.click(screen.getByRole('button', { name: /Save Changes/i }));

		await waitFor(() => {
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

		render(<EditKeyModal {...defaultProps} onSuccess={onSuccess} />);

		await user.click(screen.getByRole('button', { name: /Revoke Key/i }));

		expect(
			screen.getByText(/Revoking this key will permanently invalidate it/i),
		).toBeInTheDocument();

		const confirmRevokeBtn = screen.getByRole('button', { name: /Revoke Key/i });
		await user.click(confirmRevokeBtn);

		await waitFor(() => {
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
