import { toast } from '@signozhq/ui';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import {
	render,
	screen,
	userEvent,
	waitFor,
	waitForElementToBeRemoved,
} from 'tests/test-utils';

import AddKeyModal from '../AddKeyModal';

jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
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
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('"Create Key" is disabled when name is empty; enabled after typing a name', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

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
		renderModal();

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

		renderModal();

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
			expect(mockCopyToClipboard).toHaveBeenCalledWith('snz_abc123xyz456secret');
			expect(mockToast.success).toHaveBeenCalledWith('Key copied to clipboard');
		});
	});

	it('Cancel button closes the modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const dialog = await screen.findByRole('dialog', { name: /Add a New Key/i });
		await user.click(screen.getByRole('button', { name: /Cancel/i }));

		await waitForElementToBeRemoved(dialog);
	});
});
