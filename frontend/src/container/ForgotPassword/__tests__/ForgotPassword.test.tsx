import ROUTES from 'constants/routes';
import history from 'lib/history';
import {
	createErrorResponse,
	handleInternalServerError,
	rest,
	server,
} from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { OrgSessionContext } from 'types/api/v2/sessions/context/get';

import ForgotPassword, { ForgotPasswordRouteState } from '../index';

// Mock dependencies
jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: {
			search: '',
		},
	},
}));

const mockHistoryPush = history.push as jest.MockedFunction<
	typeof history.push
>;

const FORGOT_PASSWORD_ENDPOINT = '*/api/v2/factor_password/forgot';

// Mock data
const mockSingleOrg: OrgSessionContext[] = [
	{
		id: 'org-1',
		name: 'Test Organization',
		authNSupport: {
			password: [{ provider: 'email_password' }],
			callback: [],
		},
	},
];

const mockMultipleOrgs: OrgSessionContext[] = [
	{
		id: 'org-1',
		name: 'Organization One',
		authNSupport: {
			password: [{ provider: 'email_password' }],
			callback: [],
		},
	},
	{
		id: 'org-2',
		name: 'Organization Two',
		authNSupport: {
			password: [{ provider: 'email_password' }],
			callback: [],
		},
	},
];

const TEST_EMAIL = 'jest.test@signoz.io';

const defaultProps: ForgotPasswordRouteState = {
	email: TEST_EMAIL,
	orgs: mockSingleOrg,
};

const multiOrgProps: ForgotPasswordRouteState = {
	email: TEST_EMAIL,
	orgs: mockMultipleOrgs,
};

describe('ForgotPassword Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Initial Render', () => {
		it('renders forgot password form with all required elements', () => {
			render(<ForgotPassword {...defaultProps} />);

			expect(screen.getByText(/forgot your password\?/i)).toBeInTheDocument();
			expect(
				screen.getByText(/send a reset link to your inbox/i),
			).toBeInTheDocument();
			expect(screen.getByTestId('email')).toBeInTheDocument();
			expect(screen.getByTestId('forgot-password-submit')).toBeInTheDocument();
			expect(screen.getByTestId('forgot-password-back')).toBeInTheDocument();
		});

		it('pre-fills email from props', () => {
			render(<ForgotPassword {...defaultProps} />);

			const emailInput = screen.getByTestId('email');
			expect(emailInput).toHaveValue(TEST_EMAIL);
		});

		it('disables email input field', () => {
			render(<ForgotPassword {...defaultProps} />);

			const emailInput = screen.getByTestId('email');
			expect(emailInput).toBeDisabled();
		});

		it('does not show organization dropdown for single org', () => {
			render(<ForgotPassword {...defaultProps} />);

			expect(screen.queryByTestId('orgId')).not.toBeInTheDocument();
			expect(screen.queryByText('Organization Name')).not.toBeInTheDocument();
		});

		it('enables submit button when email is provided with single org', () => {
			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			expect(submitButton).not.toBeDisabled();
		});
	});

	describe('Multiple Organizations', () => {
		it('shows organization dropdown when multiple orgs exist', () => {
			render(<ForgotPassword {...multiOrgProps} />);

			expect(screen.getByTestId('orgId')).toBeInTheDocument();
			expect(screen.getByText('Organization Name')).toBeInTheDocument();
		});

		it('disables submit button when org is not selected', () => {
			const propsWithoutOrgId: ForgotPasswordRouteState = {
				email: TEST_EMAIL,
				orgs: mockMultipleOrgs,
			};

			render(<ForgotPassword {...propsWithoutOrgId} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			expect(submitButton).toBeDisabled();
		});

		it('enables submit button after selecting an organization', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<ForgotPassword {...multiOrgProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			expect(submitButton).toBeDisabled();

			// Click on the dropdown to reveal the options
			await user.click(screen.getByRole('combobox'));
			await user.click(screen.getByText('Organization One'));

			await waitFor(() => {
				expect(submitButton).not.toBeDisabled();
			});
		});

		it('pre-selects organization when orgId is provided', () => {
			const propsWithOrgId: ForgotPasswordRouteState = {
				email: TEST_EMAIL,
				orgId: 'org-1',
				orgs: mockMultipleOrgs,
			};

			render(<ForgotPassword {...propsWithOrgId} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			expect(submitButton).not.toBeDisabled();
		});
	});

	describe('Form Submission - Success', () => {
		it('successfully submits forgot password request and shows success screen', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(FORGOT_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ status: 'success' })),
				),
			);

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
			expect(
				screen.getByText(/we've sent a password reset link/i),
			).toBeInTheDocument();
		});

		it('shows back to login button on success screen', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(FORGOT_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ status: 'success' })),
				),
			);

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			expect(await screen.findByTestId('back-to-login')).toBeInTheDocument();
		});

		it('redirects to login when clicking back to login on success screen', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(FORGOT_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(ctx.status(200), ctx.json({ status: 'success' })),
				),
			);

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			expect(await screen.findByTestId('back-to-login')).toBeInTheDocument();

			const backToLoginButton = screen.getByTestId('back-to-login');
			await user.click(backToLoginButton);

			expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.LOGIN);
		});
	});

	describe('Form Submission - Error Handling', () => {
		it('displays error message when forgot password API fails', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(
					FORGOT_PASSWORD_ENDPOINT,
					createErrorResponse(400, 'USER_NOT_FOUND', 'User not found'),
				),
			);

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
		});

		it('displays error message when API returns server error', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(rest.post(FORGOT_PASSWORD_ENDPOINT, handleInternalServerError));

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			expect(
				await screen.findByText(/internal server error occurred/i),
			).toBeInTheDocument();
		});

		it('clears error message on new submission attempt', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let requestCount = 0;

			server.use(
				rest.post(FORGOT_PASSWORD_ENDPOINT, (_req, res, ctx) => {
					requestCount += 1;
					if (requestCount === 1) {
						return res(
							ctx.status(400),
							ctx.json({
								error: {
									code: 'USER_NOT_FOUND',
									message: 'User not found',
								},
							}),
						);
					}
					return res(ctx.status(200), ctx.json({ status: 'success' }));
				}),
			);

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			expect(await screen.findByText(/user not found/i)).toBeInTheDocument();

			// Click submit again
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.queryByText(/user not found/i)).not.toBeInTheDocument();
			});
			expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
		});
	});

	describe('Navigation', () => {
		it('redirects to login when clicking back button on form', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<ForgotPassword {...defaultProps} />);

			const backButton = screen.getByTestId('forgot-password-back');
			await user.click(backButton);

			expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.LOGIN);
		});
	});

	describe('Loading States', () => {
		it('shows loading state during API call', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(FORGOT_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(ctx.delay(100), ctx.status(200), ctx.json({ status: 'success' })),
				),
			);

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			// Button should show loading state
			expect(await screen.findByText(/sending\.\.\./i)).toBeInTheDocument();
		});

		it('disables submit button during loading', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.post(FORGOT_PASSWORD_ENDPOINT, (_req, res, ctx) =>
					res(ctx.delay(100), ctx.status(200), ctx.json({ status: 'success' })),
				),
			);

			render(<ForgotPassword {...defaultProps} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			await user.click(submitButton);

			await waitFor(() => {
				expect(submitButton).toBeDisabled();
			});
		});
	});

	describe('Edge Cases', () => {
		it('handles empty email gracefully', () => {
			const propsWithEmptyEmail: ForgotPasswordRouteState = {
				email: '',
				orgs: mockSingleOrg,
			};

			render(<ForgotPassword {...propsWithEmptyEmail} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			expect(submitButton).toBeDisabled();
		});

		it('handles whitespace-only email', () => {
			const propsWithWhitespaceEmail: ForgotPasswordRouteState = {
				email: '   ',
				orgs: mockSingleOrg,
			};

			render(<ForgotPassword {...propsWithWhitespaceEmail} />);

			const submitButton = screen.getByTestId('forgot-password-submit');
			expect(submitButton).toBeDisabled();
		});

		it('handles empty orgs array by disabling submission', () => {
			const propsWithNoOrgs: ForgotPasswordRouteState = {
				email: TEST_EMAIL,
				orgs: [],
			};

			render(<ForgotPassword {...propsWithNoOrgs} />);

			// Should not show org dropdown
			expect(screen.queryByTestId('orgId')).not.toBeInTheDocument();
			// Submit should be disabled because no orgId can be determined
			const submitButton = screen.getByTestId('forgot-password-submit');
			expect(submitButton).toBeDisabled();
		});
	});
});
