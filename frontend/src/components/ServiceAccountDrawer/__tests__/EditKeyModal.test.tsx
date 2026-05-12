import { toast } from '@signozhq/ui/sonner';
import type { ServiceaccounttypesGettableFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import EditKeyModal from '../EditKeyModal';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockToast = jest.mocked(toast);

const SA_KEY_ENDPOINT = '*/api/v1/service_accounts/sa-1/keys/key-1';

const mockKey: ServiceaccounttypesGettableFactorAPIKeyDTO = {
	id: 'key-1',
	name: 'Original Key Name',
	expiresAt: 0,
	lastObservedAt: null as any,
	serviceAccountId: 'sa-1',
};

function renderModal(
	keyItem: ServiceaccounttypesGettableFactorAPIKeyDTO | null = mockKey,
	searchParams: Record<string, string> = {
		account: 'sa-1',
		'edit-key': 'key-1',
	},
	onUrlUpdate?: jest.Mock,
): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter
			searchParams={searchParams}
			hasMemory
			onUrlUpdate={onUrlUpdate}
		>
			<EditKeyModal keyItem={keyItem} />
		</NuqsTestingAdapter>,
	);
}

describe('EditKeyModal (URL-controlled)', () => {
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

	it('renders nothing when edit-key param is absent', () => {
		renderModal(null, { account: 'sa-1' });

		expect(
			screen.queryByRole('dialog', { name: /Edit Key Details/i }),
		).not.toBeInTheDocument();
	});

	it('renders key data from prop when edit-key param is set', async () => {
		renderModal();

		await expect(
			screen.findByDisplayValue('Original Key Name'),
		).resolves.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
	});

	it('save calls update API, shows toast, and closes modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const nameInput = await screen.findByPlaceholderText(/Enter key name/i);
		await user.clear(nameInput);
		await user.type(nameInput, 'Updated Key Name');

		await user.click(screen.getByRole('button', { name: /Save Changes/i }));

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith('Key updated successfully');
		});

		await waitFor(() => {
			expect(
				screen.queryByRole('dialog', { name: /Edit Key Details/i }),
			).not.toBeInTheDocument();
		});
	});

	it('cancel clears edit-key param and closes modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onUrlUpdate = jest.fn();
		renderModal(mockKey, undefined, onUrlUpdate);

		await screen.findByDisplayValue('Original Key Name');
		await user.click(screen.getByRole('button', { name: /Cancel/i }));

		await waitFor(() => {
			expect(onUrlUpdate).toHaveBeenCalled();
		});

		const latestUrlUpdate =
			onUrlUpdate.mock.calls[onUrlUpdate.mock.calls.length - 1]?.[0];
		expect(latestUrlUpdate).toStrictEqual(
			expect.objectContaining({
				queryString: expect.any(String),
			}),
		);
		expect(latestUrlUpdate.queryString).toContain('account=sa-1');
		expect(latestUrlUpdate.queryString).not.toContain('edit-key=');

		await waitFor(() => {
			expect(
				screen.queryByRole('dialog', { name: /Edit Key Details/i }),
			).not.toBeInTheDocument();
		});
	});

	it('revoke flow: clicking Revoke Key shows confirmation inside same dialog', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		await screen.findByDisplayValue('Original Key Name');
		await user.click(screen.getByRole('button', { name: /Revoke Key/i }));

		// Same dialog, now showing revoke confirmation
		await expect(
			screen.findByRole('dialog', { name: /Revoke Original Key Name/i }),
		).resolves.toBeInTheDocument();
		expect(
			screen.getByText(/Revoking this key will permanently invalidate it/i),
		).toBeInTheDocument();
	});

	it('revoke flow: confirming revoke shows toast and closes modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		await screen.findByDisplayValue('Original Key Name');
		await user.click(screen.getByRole('button', { name: /Revoke Key/i }));

		const confirmBtn = await screen.findByRole('button', {
			name: /^Revoke Key$/i,
		});
		await user.click(confirmBtn);

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith('Key revoked successfully');
		});

		await waitFor(() => {
			expect(
				screen.queryByRole('dialog', { name: /Edit Key Details/i }),
			).not.toBeInTheDocument();
		});
	});
});
