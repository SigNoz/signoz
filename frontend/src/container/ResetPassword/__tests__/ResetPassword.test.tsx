/* eslint-disable sonarjs/no-duplicate-string */
import { Logout } from 'api/utils';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ResetPassword from '../index';

// Mock dependencies
jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: {
			search: '?token=reset-token-123',
		},
	},
}));

jest.mock('api/utils', () => ({
	Logout: jest.fn(),
}));

const mockSuccessNotification = jest.fn();
const mockErrorNotification = jest.fn();

interface MockNotifications {
	success: jest.MockedFunction<(...args: unknown[]) => void>;
	error: jest.MockedFunction<(...args: unknown[]) => void>;
}

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): { notifications: MockNotifications } => ({
		notifications: {
			success: mockSuccessNotification,
			error: mockErrorNotification,
		},
	}),
}));

const RESET_PASSWORD_ENDPOINT = '*/resetPassword';

const mockHistoryPush = history.push as jest.MockedFunction<
	typeof history.push
>;

describe('ResetPassword Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSuccessNotification.mockClear();
		mockErrorNotification.mockClear();
		window.history.pushState({}, '', '/password-reset?token=reset-token-123');
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Initial Render', () => {
		it('renders reset password form with all required fields', () => {
			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
			expect(screen.getByTestId('password')).toBeInTheDocument();
			expect(screen.getByTestId('confirmPassword')).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /reset password/i }),
			).toBeInTheDocument();
			expect(screen.getByText(/signoz 1\.0\.0/i)).toBeInTheDocument();
		});

		it('redirects to login when token is missing', () => {
			window.history.pushState({}, '', '/password-reset');

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset',
			});

			expect(Logout).toHaveBeenCalled();
			expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.LOGIN);
		});
	});

	describe('Form Validation', () => {
		it('disables submit button when passwords do not match', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /reset password/i,
			});

			expect(submitButton).toBeDisabled();

			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await waitFor(() => {
				expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
				expect(submitButton).toBeDisabled();
			});
		});

		it('enables submit button when passwords match', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /reset password/i,
			});

			await user.type(passwordInput, 'newPassword123');
			await user.type(confirmPasswordInput, 'newPassword123');

			// Wait for debounced validation
			await waitFor(
				() => {
					expect(submitButton).not.toBeDisabled();
				},
				{ timeout: 200 },
			);
		});

		it('clears password mismatch error when passwords match', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);

			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await waitFor(() => {
				expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
			});

			await user.clear(confirmPasswordInput);
			await user.type(confirmPasswordInput, 'password123');
			await user.tab(); // Blur again to trigger validation

			await waitFor(
				() => {
					expect(
						screen.queryByText(/passwords don't match/i),
					).not.toBeInTheDocument();
				},
				{ timeout: 200 },
			);
		});
	});

	describe('Successful Password Reset', () => {
		it('successfully resets password and redirects to login', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(RESET_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							message: 'Password reset successfully',
						}),
					),
				),
			);

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /reset password/i,
			});

			await user.type(passwordInput, 'newPassword123');
			await user.type(confirmPasswordInput, 'newPassword123');

			await waitFor(
				() => {
					expect(submitButton).not.toBeDisabled();
				},
				{ timeout: 200 },
			);

			await user.click(submitButton);

			await waitFor(() => {
				expect(mockSuccessNotification).toHaveBeenCalled();
				expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.LOGIN);
			});
		});
	});

	describe('Error Handling', () => {
		it('displays error message when reset password API fails', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(RESET_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(400),
						ctx.json({
							error: {
								code: 'INVALID_TOKEN',
								message: 'Invalid or expired reset token',
							},
						}),
					),
				),
			);

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=invalid-token',
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /reset password/i,
			});

			await user.type(passwordInput, 'newPassword123');
			await user.type(confirmPasswordInput, 'newPassword123');

			await waitFor(
				() => {
					expect(submitButton).not.toBeDisabled();
				},
				{ timeout: 200 },
			);

			await user.click(submitButton);

			await waitFor(() => {
				expect(
					screen.getByText(/invalid or expired reset token/i),
				).toBeInTheDocument();
			});
		});

		it('does not show API error when password mismatch error is shown', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(RESET_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(400),
						ctx.json({
							error: {
								code: 'INVALID_TOKEN',
								message: 'Invalid token',
							},
						}),
					),
				),
			);

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);

			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await waitFor(() => {
				expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
				expect(screen.queryByText(/invalid token/i)).not.toBeInTheDocument();
			});
		});
	});

	describe('Loading States', () => {
		it('disables submit button during password reset', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(RESET_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.delay(100),
						ctx.status(200),
						ctx.json({
							status: 'success',
							message: 'Password reset successfully',
						}),
					),
				),
			);

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /reset password/i,
			});

			await user.type(passwordInput, 'newPassword123');
			await user.type(confirmPasswordInput, 'newPassword123');

			await waitFor(
				() => {
					expect(submitButton).not.toBeDisabled();
				},
				{ timeout: 200 },
			);

			await user.click(submitButton);

			// Button should be disabled during API call
			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});
		});
	});
});
