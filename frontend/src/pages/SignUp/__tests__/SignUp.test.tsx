import afterLogin from 'AppRoutes/utils';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { SignupResponse } from 'types/api/v1/register/post';
import { Token } from 'types/api/v2/sessions/email_password/post';

import SignUp from '../SignUp';

// Mock dependencies - must be before imports
jest.mock('AppRoutes/utils', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockAfterLogin = jest.mocked(afterLogin);

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: {
			search: '',
		},
	},
}));

const REGISTER_ENDPOINT = '*/api/v1/register';
const EMAIL_PASSWORD_ENDPOINT = '*/api/v2/sessions/email_password';

const mockSignupResponse: SignupResponse = {
	orgId: 'test-org-id',
	createdAt: Date.now(),
	email: 'test@signoz.io',
	id: 'test-user-id',
	displayName: 'Test User',
	role: 'ADMIN',
};

const mockTokenResponse: Token = {
	accessToken: 'mock-access-token',
	refreshToken: 'mock-refresh-token',
};

describe('SignUp Component - Regular Signup', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAfterLogin.mockClear();
		window.history.pushState({}, '', '/signup');
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Initial Render', () => {
		it('renders signup form with all required fields', () => {
			render(<SignUp />, undefined, { initialRoute: '/signup' });

			expect(screen.getByText(/create your account/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/set your password/i)).toBeInTheDocument();
			expect(
				screen.getByLabelText(/confirm your new password/i),
			).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /access my workspace/i }),
			).toBeInTheDocument();
		});

		it('shows info callout for admin account creation', () => {
			render(<SignUp />, undefined, { initialRoute: '/signup' });

			expect(
				screen.getByText(/this will create an admin account/i),
			).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('disables submit button when form is invalid', async () => {
			render(<SignUp />, undefined, { initialRoute: '/signup' });

			const submitButton = screen.getByRole('button', {
				name: /access my workspace/i,
			});

			expect(submitButton).toHaveAttribute('aria-disabled', 'true');
		});

		it('disables submit button for partially filled fields', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /access my workspace/i,
			});

			// Missing email
			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password123');
			expect(submitButton).toHaveAttribute('aria-disabled', 'true');

			// Missing password
			await user.clear(passwordInput);
			await user.clear(confirmPasswordInput);
			await user.type(emailInput, 'test@signoz.io');
			await user.type(confirmPasswordInput, 'password123');
			expect(submitButton).toHaveAttribute('aria-disabled', 'true');

			// Missing confirm password
			await user.clear(confirmPasswordInput);
			await user.type(passwordInput, 'password123');
			expect(submitButton).toHaveAttribute('aria-disabled', 'true');
		});

		it('shows error when passwords do not match', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);

			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await expect(
				screen.findByText(/passwords don't match/i),
			).resolves.toBeInTheDocument();
		});

		it('clears password mismatch error when passwords match', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);

			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password456');
			await user.tab(); // Blur the confirm password field to trigger validation

			await expect(
				screen.findByText(/passwords don't match/i),
			).resolves.toBeInTheDocument();

			await user.clear(confirmPasswordInput);
			await user.type(confirmPasswordInput, 'password123');
			await user.tab(); // Blur again to trigger validation

			await waitFor(() => {
				expect(
					screen.queryByText(/passwords don't match/i),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('Successful Signup', () => {
		it('successfully creates account and logs in user', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(REGISTER_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: mockSignupResponse,
							status: 'success',
						}),
					),
				),
				rest.post(EMAIL_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: mockTokenResponse,
							status: 'success',
						}),
					),
				),
			);

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /access my workspace/i,
			});

			await user.type(emailInput, 'test@signoz.io');
			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password123');

			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
			});

			await user.click(submitButton);

			await waitFor(() => {
				expect(mockAfterLogin).toHaveBeenCalledWith(
					'mock-access-token',
					'mock-refresh-token',
				);
			});
		});
	});

	describe('Error Handling', () => {
		it('displays error message when signup API fails', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(REGISTER_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(400),
						ctx.json({
							error: {
								code: 'EMAIL_EXISTS',
								message: 'Email already exists',
							},
						}),
					),
				),
			);

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /access my workspace/i,
			});

			await user.type(emailInput, 'existing@signoz.io');
			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password123');

			await waitFor(() => {
				expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
			});

			await user.click(submitButton);

			const errorCallouts = await screen.findAllByText(/email already exists/i);
			expect(errorCallouts.length).toBeGreaterThan(0);
		});
	});

	describe('Enter key submission', () => {
		function mockSignup(delayMs = 0): { registerCalls: () => number } {
			let calls = 0;
			server.use(
				rest.post(REGISTER_ENDPOINT, (_req, res, ctx) => {
					calls += 1;
					return res(
						ctx.delay(delayMs),
						ctx.status(200),
						ctx.json({ data: mockSignupResponse, status: 'success' }),
					);
				}),
				rest.post(EMAIL_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ data: mockTokenResponse, status: 'success' }),
					),
				),
			);
			return { registerCalls: (): number => calls };
		}

		it('submits once on Enter in the confirm password field', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const { registerCalls } = mockSignup();

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			await user.type(screen.getByLabelText(/email address/i), 'test@signoz.io');
			await user.type(
				screen.getByPlaceholderText(/enter new password/i),
				'password123',
			);
			await user.type(
				screen.getByPlaceholderText(/confirm your new password/i),
				'password123{enter}',
			);

			await waitFor(() => {
				expect(mockAfterLogin).toHaveBeenCalledWith(
					'mock-access-token',
					'mock-refresh-token',
				);
			});
			expect(registerCalls()).toBe(1);
		});

		it('does not submit on Enter while the passwords do not match', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const { registerCalls } = mockSignup();

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			await user.type(screen.getByLabelText(/email address/i), 'test@signoz.io');
			await user.type(
				screen.getByPlaceholderText(/enter new password/i),
				'password123',
			);
			await user.type(
				screen.getByPlaceholderText(/confirm your new password/i),
				'password456',
			);
			expect(
				screen.getByRole('button', { name: /access my workspace/i }),
			).toHaveAttribute('aria-disabled', 'true');

			await user.keyboard('{enter}');

			// Give a wrongly sent request time to land before asserting it never did.
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(registerCalls()).toBe(0);
		});

		it('does not submit again on Enter while the first submit is loading', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const { registerCalls } = mockSignup(1000);

			render(<SignUp />, undefined, { initialRoute: '/signup' });

			const emailInput = screen.getByLabelText(/email address/i);
			await user.type(emailInput, 'test@signoz.io');
			await user.type(
				screen.getByPlaceholderText(/enter new password/i),
				'password123',
			);
			await user.type(
				screen.getByPlaceholderText(/confirm your new password/i),
				'password123{enter}',
			);

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /access my workspace/i }),
				).toHaveAttribute('aria-disabled', 'true');
			});

			// The password inputs are disabled while loading; the email input is not.
			await user.type(emailInput, '{enter}');

			await waitFor(() => {
				expect(mockAfterLogin).toHaveBeenCalled();
			});
			expect(registerCalls()).toBe(1);
		});
	});
});
