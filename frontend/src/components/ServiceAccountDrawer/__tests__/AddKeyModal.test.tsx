import { toast } from '@signozhq/ui/sonner';
import { buildSAAttachPermission } from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AddKeyModal from '../AddKeyModal';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockCopyToClipboard = jest.fn();
const mockCopyState = { value: undefined, error: undefined };

jest.mock('react-use', () => ({
	useCopyToClipboard: (): [typeof mockCopyState, typeof mockCopyToClipboard] => [
		mockCopyState,
		mockCopyToClipboard,
	],
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

function renderModal(): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter
			searchParams={{ account: 'sa-1', 'add-key': 'true' }}
			hasMemory
		>
			<AddKeyModal />
		</NuqsTestingAdapter>,
	);
}

describe('AddKeyModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCopyToClipboard.mockClear();
		server.use(
			rest.post(SA_KEYS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(201), ctx.json(createdKeyResponse)),
			),
			setupAuthzAdmin(),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('"Create Key" is disabled when name is empty; enabled after typing a name', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		// The form only renders once the checks resolve, so waiting for it also
		// guarantees the button is no longer in its authz-loading state.
		const nameInput = await screen.findByTestId('add-key-name-input');
		const createBtn = await screen.findByTestId('add-key-submit-btn');

		expect(createBtn).toBeDisabled();

		await user.type(nameInput, 'My Key');
		await waitFor(() => expect(createBtn).not.toBeDisabled());

		await user.clear(nameInput);
		await waitFor(() => expect(createBtn).toBeDisabled());
	});

	it('successful creation transitions to phase 2 with key displayed and security callout', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const nameInput = await screen.findByTestId('add-key-name-input');
		const submitBtn = await screen.findByTestId('add-key-submit-btn');
		await user.type(nameInput, 'Deploy Key');
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await screen.findByText('snz_abc123xyz456secret');
		expect(screen.getByText(/Store the key securely/i)).toBeInTheDocument();
		expect(screen.getByTestId('add-key-modal')).toBeInTheDocument();
	});

	it('copy button writes key to clipboard and shows toast.success', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderModal();

		const nameInput = await screen.findByTestId('add-key-name-input');
		const submitBtn = await screen.findByTestId('add-key-submit-btn');
		await user.type(nameInput, 'Deploy Key');
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await screen.findByText('snz_abc123xyz456secret');

		const copyBtn = screen
			.getAllByRole('button')
			.find((btn) => btn.querySelector('svg'));
		if (!copyBtn) {
			throw new Error('Copy button not found');
		}
		await user.click(copyBtn);

		await waitFor(() => {
			expect(mockCopyToClipboard).toHaveBeenCalledWith('snz_abc123xyz456secret');
			expect(mockToast.success).toHaveBeenCalledWith('Key copied to clipboard');
		});
	});

	it('shows inline permission denial and hides the form when key create is denied', async () => {
		server.use(setupAuthzDenyAll());

		renderModal();

		await expect(
			screen.findByText(/is not authorized to perform/i),
		).resolves.toBeInTheDocument();

		expect(screen.queryByTestId('add-key-name-input')).not.toBeInTheDocument();
		expect(screen.getByTestId('add-key-modal')).toBeInTheDocument();
	});

	it('keeps the footer usable when key create is denied', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		server.use(setupAuthzDenyAll());

		renderModal();

		await expect(
			screen.findByText(/is not authorized to perform/i),
		).resolves.toBeInTheDocument();

		// The footer lives outside the guard: submit is gated, Cancel still works.
		expect(screen.getByTestId('add-key-submit-btn')).toBeDisabled();

		await user.click(screen.getByTestId('add-key-cancel-btn'));

		await waitFor(() => {
			expect(screen.queryByTestId('add-key-modal')).not.toBeInTheDocument();
		});
	});

	it('shows inline permission denial when attach on the service account is denied', async () => {
		server.use(setupAuthzDeny(buildSAAttachPermission('sa-1')));

		renderModal();

		await expect(
			screen.findByText(/is not authorized to perform/i),
		).resolves.toBeInTheDocument();

		expect(screen.queryByTestId('add-key-name-input')).not.toBeInTheDocument();
	});

	it('Cancel button closes the modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const cancelBtn = await screen.findByTestId('add-key-cancel-btn');
		await user.click(cancelBtn);

		await waitFor(() => {
			expect(screen.queryByTestId('add-key-modal')).not.toBeInTheDocument();
		});
	});
});
