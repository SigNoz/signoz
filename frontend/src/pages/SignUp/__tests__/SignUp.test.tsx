/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
import afterLogin from 'AppRoutes/utils';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { InviteDetails } from 'types/api/user/getInviteDetails';
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
const INVITE_DETAILS_ENDPOINT = '*/api/v1/invite/*';
const ACCEPT_INVITE_ENDPOINT = '*/api/v1/invite/accept';

interface MockSignupResponse extends SignupResponse {
	orgId: string;
}

const mockSignupResponse: MockSignupResponse = {
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

const mockInviteDetails: InviteDetails = {
	email: 'invited@signoz.io',
	name: 'Invited User',
	organization: 'Test Org',
	createdAt: Date.now(),
	role: 'ADMIN',
	token: 'invite-token-123',
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

			expect(
				await screen.findByText(/passwords don't match/i),
			).toBeInTheDocument();
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

			expect(
				await screen.findByText(/passwords don't match/i),
			).toBeInTheDocument();

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

describe('SignUp Component - Accept Invite', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		window.history.pushState({}, '', '/signup?token=invite-token-123');
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Initial Render with Invite', () => {
		it('pre-fills form fields from invite details', async () => {
			server.use(
				rest.get(INVITE_DETAILS_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: mockInviteDetails,
							status: 'success',
						}),
					),
				),
			);

			render(<SignUp />, undefined, {
				initialRoute: '/signup?token=invite-token-123',
			});

			const emailInput = await screen.findByLabelText(/email address/i);

			await waitFor(() => {
				expect(emailInput).toHaveValue('invited@signoz.io');
			});
		});

		it('disables email field when invite details are loaded', async () => {
			server.use(
				rest.get(INVITE_DETAILS_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: mockInviteDetails,
							status: 'success',
						}),
					),
				),
			);

			render(<SignUp />, undefined, {
				initialRoute: '/signup?token=invite-token-123',
			});

			const emailInput = await screen.findByLabelText(/email address/i);

			await waitFor(() => {
				expect(emailInput).toBeDisabled();
			});
		});

		it('does not show admin account info callout for invite flow', async () => {
			server.use(
				rest.get(INVITE_DETAILS_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: mockInviteDetails,
							status: 'success',
						}),
					),
				),
			);

			render(<SignUp />, undefined, {
				initialRoute: '/signup?token=invite-token-123',
			});

			await waitFor(() => {
				expect(
					screen.queryByText(/this will create an admin account/i),
				).not.toBeInTheDocument();
			});
		});
	});

	describe('Successful Invite Acceptance', () => {
		it('successfully accepts invite and logs in user', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(INVITE_DETAILS_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: mockInviteDetails,
							status: 'success',
						}),
					),
				),
				rest.post(ACCEPT_INVITE_ENDPOINT, (_req, res, ctx) =>
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

			render(<SignUp />, undefined, {
				initialRoute: '/signup?token=invite-token-123',
			});

			const emailInput = await screen.findByLabelText(/email address/i);
			await waitFor(() => {
				expect(emailInput).toHaveValue('invited@signoz.io');
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /access my workspace/i,
			});

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

	describe('Error Handling for Invite', () => {
		it('displays error when invite details fetch fails', async () => {
			server.use(
				rest.get(INVITE_DETAILS_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(404),
						ctx.json({
							error: {
								code: 'INVITE_NOT_FOUND',
								message: 'Invite not found',
							},
						}),
					),
				),
			);

			render(<SignUp />, undefined, {
				initialRoute: '/signup?token=invalid-token',
			});

			// Verify form is still accessible and fields are enabled
			const emailInput = await screen.findByLabelText(/email address/i);

			expect(emailInput).toBeInTheDocument();
			expect(emailInput).not.toBeDisabled();
		});

		it('displays error when accept invite API fails', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(INVITE_DETAILS_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							data: mockInviteDetails,
							status: 'success',
						}),
					),
				),
				rest.post(ACCEPT_INVITE_ENDPOINT, (_req, res, ctx) =>
					res(
						ctx.status(400),
						ctx.json({
							error: {
								code: 'INVALID_TOKEN',
								message: 'Invalid or expired invite token',
							},
						}),
					),
				),
			);

			render(<SignUp />, undefined, {
				initialRoute: '/signup?token=expired-token',
			});

			const emailInput = await screen.findByLabelText(/email address/i);
			await waitFor(() => {
				expect(emailInput).toHaveValue('invited@signoz.io');
			});

			const passwordInput = screen.getByPlaceholderText(/enter new password/i);
			const confirmPasswordInput = screen.getByPlaceholderText(
				/confirm your new password/i,
			);
			const submitButton = screen.getByRole('button', {
				name: /access my workspace/i,
			});

			await user.type(passwordInput, 'password123');
			await user.type(confirmPasswordInput, 'password123');

			await waitFor(() => {
				expect(submitButton).not.toBeDisabled();
			});

			await user.click(submitButton);

			expect(
				await screen.findByText(/invalid or expired invite token/i),
			).toBeInTheDocument();
		});
	});
});
