import { toast } from '@signozhq/ui/sonner';
import {
	setupAuthzAdmin,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

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
			setupAuthzAdmin(),
			rest.post(SERVICE_ACCOUNTS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(201), ctx.json({ status: 'success', data: {} })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('submit button is disabled while the form is empty', async () => {
		renderModal();

		// The form only renders once the create check resolves, and the name field
		// registers its `required` rule on mount, so the empty-form invalid state
		// settles a tick later.
		await screen.findByTestId('create-sa-name-input');

		await waitFor(() =>
			expect(screen.getByTestId('create-sa-submit-btn')).toBeDisabled(),
		);
	});

	it('submit button becomes disabled after clearing the name field', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const nameInput = await screen.findByTestId('create-sa-name-input');
		const submitBtn = await screen.findByTestId('create-sa-submit-btn');

		await user.type(nameInput, 'test');
		await waitFor(() => expect(submitBtn).not.toBeDisabled());

		await user.clear(nameInput);
		await waitFor(() => expect(submitBtn).toBeDisabled());
	});

	it('successful submit shows toast.success and closes modal', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const nameInput = await screen.findByTestId('create-sa-name-input');
		await user.type(nameInput, 'Deploy Bot');

		const submitBtn = screen.getByTestId('create-sa-submit-btn');
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith(
				'Service account created successfully',
			);
		});

		await waitFor(() => {
			expect(
				screen.queryByTestId('create-service-account-modal'),
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

		const nameInput = await screen.findByTestId('create-sa-name-input');
		await user.type(nameInput, 'Dupe Bot');

		const submitBtn = screen.getByTestId('create-sa-submit-btn');
		await waitFor(() => expect(submitBtn).not.toBeDisabled());
		await user.click(submitBtn);

		await waitFor(() => {
			expect(showErrorModal).toHaveBeenCalledWith(
				expect.objectContaining({
					getErrorMessage: expect.any(Function),
				}),
			);
			const passedError = showErrorModal.mock.calls[0][0] as {
				getErrorMessage: () => string;
			};
			expect(passedError.getErrorMessage()).toBe('Internal Server Error');
		});

		expect(
			screen.getByTestId('create-service-account-modal'),
		).toBeInTheDocument();
	});

	it('Cancel button closes modal without submitting', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const cancelBtn = await screen.findByTestId('create-sa-cancel-btn');
		await user.click(cancelBtn);

		await waitFor(() => {
			expect(
				screen.queryByTestId('create-service-account-modal'),
			).not.toBeInTheDocument();
		});
	});

	it('shows inline permission denial and hides the form when create permission is denied', async () => {
		server.use(setupAuthzDenyAll());

		renderModal();

		await expect(
			screen.findByText(/is not authorized to perform/i),
		).resolves.toBeInTheDocument();

		expect(screen.queryByTestId('create-sa-name-input')).not.toBeInTheDocument();
		expect(
			screen.getByTestId('create-service-account-modal'),
		).toBeInTheDocument();
	});

	it('keeps the footer usable when create permission is denied', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		server.use(setupAuthzDenyAll());

		renderModal();

		await expect(
			screen.findByText(/is not authorized to perform/i),
		).resolves.toBeInTheDocument();

		// The footer lives outside the guard: submit is gated, Cancel still works.
		expect(screen.getByTestId('create-sa-submit-btn')).toBeDisabled();

		await user.click(screen.getByTestId('create-sa-cancel-btn'));

		await waitFor(() => {
			expect(
				screen.queryByTestId('create-service-account-modal'),
			).not.toBeInTheDocument();
		});
	});

	it('shows "Name is required" after clearing the name field', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderModal();

		const nameInput = await screen.findByTestId('create-sa-name-input');
		await user.type(nameInput, 'Bot');
		await user.clear(nameInput);

		await expect(
			screen.findByText('Name is required'),
		).resolves.toBeInTheDocument();
	});
});
