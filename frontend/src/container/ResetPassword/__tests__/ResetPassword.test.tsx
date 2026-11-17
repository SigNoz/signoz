import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ResetPassword from '../index';

// Mock dependencies
jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: jest.fn(),
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

const RESET_PASSWORD_ENDPOINT = '*/api/v2/factor_password/reset';

const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

type User = ReturnType<typeof userEvent.setup>;

async function enterPassword(
	user: User,
	testId: 'password' | 'confirmPassword',
	value: string,
): Promise<void> {
	await user.click(screen.getByTestId(testId));
	await user.paste(value);
}

function mockReset(): {
	resetCalls: () => number;
	holdResponse: () => () => void;
} {
	let calls = 0;
	let pending: Promise<void> = Promise.resolve();
	server.use(
		rest.post(RESET_PASSWORD_ENDPOINT, async (_req, res, ctx) => {
			calls += 1;
			await pending;
			return res(
				ctx.status(200),
				ctx.json({ status: 'success', message: 'Password reset successfully' }),
			);
		}),
	);
	return {
		resetCalls: (): number => calls,
		holdResponse: (): (() => void) => {
			let release: () => void = () => {};
			pending = new Promise((resolve) => {
				release = resolve;
			});
			return release;
		},
	};
}

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
			expect(screen.getByTestId('reset-password-submit')).toHaveTextContent(
				/reset password/i,
			);
			expect(screen.getByText(/signoz 1\.0\.0/i)).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('disables submit button when passwords do not match', async () => {
			const user = userEvent.setup();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const submitButton = screen.getByTestId('reset-password-submit');

			expect(submitButton).toHaveAttribute('aria-disabled', 'true');

			await enterPassword(user, 'password', 'password123');
			await enterPassword(user, 'confirmPassword', 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await waitFor(() => {
				expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
				expect(submitButton).toHaveAttribute('aria-disabled', 'true');
			});
		});

		it('enables submit button when passwords match', async () => {
			const user = userEvent.setup();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const submitButton = screen.getByTestId('reset-password-submit');

			await enterPassword(user, 'password', 'newPassword123');
			await enterPassword(user, 'confirmPassword', 'newPassword123');

			// Wait for debounced validation
			await waitFor(
				() => {
					expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
				},
				{ timeout: 200 },
			);
		});

		it('clears password mismatch error when passwords match', async () => {
			const user = userEvent.setup();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			await enterPassword(user, 'password', 'password123');
			await enterPassword(user, 'confirmPassword', 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await waitFor(() => {
				expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
			});

			await user.clear(screen.getByTestId('confirmPassword'));
			await user.paste('password123');
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

		it('clears password mismatch error when confirm password is emptied', async () => {
			const user = userEvent.setup();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const submitButton = screen.getByTestId('reset-password-submit');

			await enterPassword(user, 'password', 'password123');
			await enterPassword(user, 'confirmPassword', 'password456');
			await user.tab();

			await waitFor(() => {
				expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
			});

			await user.clear(screen.getByTestId('confirmPassword'));

			await waitFor(() => {
				expect(
					screen.queryByText(/passwords don't match/i),
				).not.toBeInTheDocument();
				expect(submitButton).toHaveAttribute('aria-disabled', 'true');
			});
		});
	});

	describe('Successful Password Reset', () => {
		it('successfully resets password and redirects to login', async () => {
			const user = userEvent.setup();

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

			const submitButton = screen.getByTestId('reset-password-submit');

			await enterPassword(user, 'password', 'newPassword123');
			await enterPassword(user, 'confirmPassword', 'newPassword123');

			await waitFor(
				() => {
					expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
				},
				{ timeout: 200 },
			);

			await user.click(submitButton);

			await waitFor(() => {
				expect(mockSuccessNotification).toHaveBeenCalled();
				expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
			});
		});
	});

	describe('Error Handling', () => {
		it('displays error message when reset password API fails', async () => {
			const user = userEvent.setup();

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

			const submitButton = screen.getByTestId('reset-password-submit');

			await enterPassword(user, 'password', 'newPassword123');
			await enterPassword(user, 'confirmPassword', 'newPassword123');

			await waitFor(
				() => {
					expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
				},
				{ timeout: 200 },
			);

			await user.click(submitButton);

			await expect(
				screen.findByText(/invalid or expired reset token/i),
			).resolves.toBeInTheDocument();
		});

		it('does not show API error when password mismatch error is shown', async () => {
			const user = userEvent.setup();

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

			await enterPassword(user, 'password', 'password123');
			await enterPassword(user, 'confirmPassword', 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await waitFor(() => {
				expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
				expect(screen.queryByText(/invalid token/i)).not.toBeInTheDocument();
			});
		});

		it('clears API error when the user edits the password', async () => {
			const user = userEvent.setup();

			server.use(
				rest.post(RESET_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(400),
						ctx.json({
							error: {
								code: 'invalid_password',
								message: 'password must be at least 8 characters long',
							},
						}),
					),
				),
			);

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const submitButton = screen.getByTestId('reset-password-submit');

			await enterPassword(user, 'password', 'weak');
			await enterPassword(user, 'confirmPassword', 'weak');

			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
			});

			await user.click(submitButton);

			await expect(
				screen.findByText(/password must be at least 8 characters long/i),
			).resolves.toBeInTheDocument();

			await user.type(screen.getByTestId('password'), 'Er1!');

			await waitFor(() => {
				expect(
					screen.queryByText(/password must be at least 8 characters long/i),
				).not.toBeInTheDocument();
			});

			await user.type(screen.getByTestId('confirmPassword'), 'Er1!');

			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
			});
		});
	});

	describe('Loading States', () => {
		it('disables submit button during password reset', async () => {
			const user = userEvent.setup();

			mockReset().holdResponse();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			const submitButton = screen.getByTestId('reset-password-submit');

			await enterPassword(user, 'password', 'newPassword123');
			await enterPassword(user, 'confirmPassword', 'newPassword123');

			await waitFor(
				() => {
					expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
				},
				{ timeout: 200 },
			);

			await user.click(submitButton);

			// Button should be disabled during API call
			await waitFor(() => {
				expect(submitButton).toHaveAttribute('aria-disabled', 'true');
			});
		});
	});

	describe('Enter key submission', () => {
		async function typeMatchingPasswords(user: User): Promise<void> {
			await enterPassword(user, 'password', 'newPassword123');
			await enterPassword(user, 'confirmPassword', 'newPassword123');
			await waitFor(() => {
				expect(screen.getByTestId('reset-password-submit')).not.toHaveAttribute(
					'aria-disabled',
					'true',
				);
			});
		}

		it('resets once on Enter in the confirm password field', async () => {
			const user = userEvent.setup();
			const { resetCalls } = mockReset();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			await typeMatchingPasswords(user);
			await user.keyboard('{enter}');

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
			});
			expect(resetCalls()).toBe(1);
		});

		it('does not reset on Enter while the passwords do not match', async () => {
			const user = userEvent.setup();
			const { resetCalls } = mockReset();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			await enterPassword(user, 'password', 'password123');
			await enterPassword(user, 'confirmPassword', 'password456');
			await user.keyboard('{enter}');
			expect(screen.getByTestId('reset-password-submit')).toHaveAttribute(
				'aria-disabled',
				'true',
			);

			// Give a wrongly sent request time to land before asserting it never did.
			await new Promise((resolve) => setTimeout(resolve, 150));
			expect(resetCalls()).toBe(0);
		});

		it('does not reset again on Enter while the first reset is loading', async () => {
			const user = userEvent.setup();
			const { resetCalls, holdResponse } = mockReset();
			const releaseResponse = holdResponse();

			render(<ResetPassword version="1.0.0" />, undefined, {
				initialRoute: '/password-reset?token=reset-token-123',
			});

			await typeMatchingPasswords(user);
			await user.keyboard('{enter}');

			await waitFor(() => {
				expect(screen.getByTestId('reset-password-submit')).toHaveAttribute(
					'aria-disabled',
					'true',
				);
			});
			await user.keyboard('{enter}');

			releaseResponse();
			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
			});
			expect(resetCalls()).toBe(1);
		});
	});
});
