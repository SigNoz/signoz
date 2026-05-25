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

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

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

			expect(submitButton).toBeDisabled();
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
			expect(submitButton).toBeDisabled();

			// Missing password
			await user.clear(passwordInput);
			await user.clear(confirmPasswordInput);
			await user.type(emailInput, 'test@signoz.io');
			await user.type(confirmPasswordInput, 'password123');
			expect(submitButton).toBeDisabled();

			// Missing confirm password
			await user.clear(confirmPasswordInput);
			await user.type(passwordInput, 'password123');
			expect(submitButton).toBeDisabled();
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
				expect(submitButton).not.toBeDisabled();
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
				expect(submitButton).not.toBeDisabled();
			});

			await user.click(submitButton);

			const errorCallouts = await screen.findAllByText(/email already exists/i);
			expect(errorCallouts.length).toBeGreaterThan(0);
		});
	});
});
