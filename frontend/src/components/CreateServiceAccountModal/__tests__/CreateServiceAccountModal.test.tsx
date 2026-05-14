import { toast } from '@signozhq/ui/sonner';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import {
	render,
	screen,
	userEvent,
	waitFor,
	waitForElementToBeRemoved,
} from 'tests/test-utils';

import CreateServiceAccountModal from '../CreateServiceAccountModal';

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: { success: jest.fn(), error: jest.fn() },
}));

const mockToast = jest.mocked(toast);

const showErrorModal = jest.fn();
jest.mock('providers/ErrorModalProvider', () => ({
	__esModule: true,
	...jest.requireActual('providers/ErrorModalProvider'),
	useErrorModal: jest.fn(() => ({
		showErrorModal,
		isErrorModalVisible: false,
	})),
}));

const SERVICE_ACCOUNTS_ENDPOINT = '*/api/v1/service_accounts';

function renderModal(): ReturnType<typeof render> {
	return render(
		<NuqsTestingAdapter searchParams={{ 'create-sa': 'true' }} hasMemory>
			<CreateServiceAccountModal />
		</NuqsTestingAdapter>,
	);
}

describe('CreateServiceAccountModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.post(SERVICE_ACCOUNTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(201), ctx.json({ status: 'success', data: {} })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('submit button is disabled when form is empty', () => {
		renderModal();

		expect(
			screen.getByRole('button', { name: /Create Service Account/i }),
		).toBeDisabled();
	});

	it('successful submit shows toast.success and closes modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		await user.type(screen.getByPlaceholderText('Enter a name'), 'Deploy Bot');

		const submitBtn = screen.getByRole('button', {
			name: /Create Service Account/i,
		});
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith(
				'Service account created successfully',
			);
		});

		await waitFor(() => {
			expect(
				screen.queryByRole('dialog', { name: /New Service Account/i }),
			).not.toBeInTheDocument();
		});
	});

	it('shows toast.error on API error and keeps modal open', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.post(SERVICE_ACCOUNTS_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({ status: 'error', error: 'Internal Server Error' }),
				),
			),
		);

		renderModal();

		await user.type(screen.getByPlaceholderText('Enter a name'), 'Dupe Bot');

		const submitBtn = screen.getByRole('button', {
			name: /Create Service Account/i,
		});
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await waitFor(() => {
			expect(showErrorModal).toHaveBeenCalledWith(
				expect.objectContaining({
					getErrorMessage: expect.any(Function),
				}),
			);
			const passedError = showErrorModal.mock.calls[0][0] as any;
			expect(passedError.getErrorMessage()).toBe('Internal Server Error');
		});

		expect(
			screen.getByRole('dialog', { name: /New Service Account/i }),
		).toBeInTheDocument();
	});

	it('Cancel button closes modal without submitting', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const dialog = await screen.findByRole('dialog', {
			name: /New Service Account/i,
		});
		await user.click(screen.getByRole('button', { name: /Cancel/i }));

		await waitForElementToBeRemoved(dialog);
	});

	it('shows "Name is required" after clearing the name field', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const nameInput = screen.getByPlaceholderText('Enter a name');
		await user.type(nameInput, 'Bot');
		await user.clear(nameInput);

		await screen.findByText('Name is required');
	});
});
