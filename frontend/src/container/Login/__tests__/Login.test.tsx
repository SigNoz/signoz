/* eslint-disable sonarjs/no-identical-functions */
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { ErrorV2 } from 'types/api';
import { Info } from 'types/api/v1/version/get';
import { SessionsContext } from 'types/api/v2/sessions/context/get';
import { Token } from 'types/api/v2/sessions/email_password/post';

import Login from '../index';

const VERSION_ENDPOINT = '*/api/v1/version';
const SESSIONS_CONTEXT_ENDPOINT = '*/api/v2/sessions/context';
const CALLBACK_AUTHN_ORG = 'callback_authn_org';
const CALLBACK_AUTHN_URL = 'https://sso.example.com/auth';
const PASSWORD_AUTHN_ORG = 'password_authn_org';
const PASSWORD_AUTHN_EMAIL = 'jest.test@signoz.io';

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

// Mock data
const mockVersionSetupCompleted: Info = {
	setupCompleted: true,
	ee: 'Y',
	version: '0.25.0',
};

const mockVersionSetupIncomplete: Info = {
	setupCompleted: false,
	ee: 'Y',
	version: '0.25.0',
};

const mockSingleOrgPasswordAuth: SessionsContext = {
	exists: true,
	orgs: [
		{
			id: 'org-1',
			name: 'Test Organization',
			authNSupport: {
				password: [{ provider: 'email_password' }],
				callback: [],
			},
		},
	],
};

const mockSingleOrgCallbackAuth: SessionsContext = {
	exists: true,
	orgs: [
		{
			id: 'org-1',
			name: 'Test Organization',
			authNSupport: {
				password: [],
				callback: [{ provider: 'google', url: CALLBACK_AUTHN_URL }],
			},
		},
	],
};

const mockMultiOrgMixedAuth: SessionsContext = {
	exists: true,
	orgs: [
		{
			id: 'org-1',
			name: PASSWORD_AUTHN_ORG,
			authNSupport: {
				password: [{ provider: 'email_password' }],
				callback: [],
			},
		},
		{
			id: 'org-2',
			name: CALLBACK_AUTHN_ORG,
			authNSupport: {
				password: [],
				callback: [{ provider: 'google', url: CALLBACK_AUTHN_URL }],
			},
		},
	],
};

const mockOrgWithWarning: SessionsContext = {
	exists: true,
	orgs: [
		{
			id: 'org-1',
			name: 'Warning Organization',
			authNSupport: {
				password: [{ provider: 'email_password' }],
				callback: [],
			},
			warning: {
				code: 'ORG_WARNING',
				message: 'Organization has limited access',
				url: 'https://example.com/warning',
				errors: [{ message: 'Contact admin for full access' }],
			} as ErrorV2,
		},
	],
};

const mockEmailPasswordResponse: Token = {
	accessToken: 'mock-access-token',
	refreshToken: 'mock-refresh-token',
};

describe('Login Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		server.use(
			rest.get(VERSION_ENDPOINT, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({ data: mockVersionSetupCompleted, status: 'success' }),
				),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Initial Render', () => {
		it('renders login form with email input and next button', () => {
			const { getByTestId, getByPlaceholderText } = render(<Login />);

			expect(
				screen.getByText(/sign in to monitor, trace, and troubleshoot/i),
			).toBeInTheDocument();
			expect(getByTestId('email')).toBeInTheDocument();
			expect(getByTestId('initiate_login')).toBeInTheDocument();
			expect(getByPlaceholderText('name@yourcompany.com')).toBeInTheDocument();
		});

		it('shows loading state when version data is being fetched', () => {
			server.use(
				rest.get(VERSION_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.delay(100),
						ctx.status(200),
						ctx.json({ data: mockVersionSetupCompleted, status: 'success' }),
					),
				),
			);

			const { getByTestId } = render(<Login />);

			expect(getByTestId('initiate_login')).toBeDisabled();
		});
	});

	describe('Setup Check', () => {
		it('redirects to signup when setup is not completed', async () => {
			server.use(
				rest.get(VERSION_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ data: mockVersionSetupIncomplete, status: 'success' }),
					),
				),
			);

			render(<Login />);

			await waitFor(() => {
				expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.SIGN_UP);
			});
		});

		it('stays on login page when setup is completed', async () => {
			render(<Login />);

			await waitFor(() => {
				expect(mockHistoryPush).not.toHaveBeenCalled();
			});
		});

		it('handles version API error gracefully', async () => {
			server.use(
				rest.get(VERSION_ENDPOINT, (req, res, ctx) =>
					res(ctx.status(500), ctx.json({ error: 'Server error' })),
				),
			);

			render(<Login />);

			await waitFor(() => {
				expect(mockHistoryPush).not.toHaveBeenCalled();
			});
		});
	});

	describe('Session Context Fetching', () => {
		it('fetches session context on next button click and enables password', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgPasswordAuth }),
					),
				),
			);

			const { getByTestId } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByTestId('password')).toBeInTheDocument();
			});
		});

		it('handles session context API errors', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(500),
						ctx.json({
							error: {
								code: 'internal_server',
								message: 'couldnt fetch the sessions context',
								url: '',
							},
						}),
					),
				),
			);

			const { getByTestId, getByText } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByText('couldnt fetch the sessions context')).toBeInTheDocument();
			});
		});

		it('auto-selects organization when only one exists', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgPasswordAuth }),
					),
				),
			);

			const { getByTestId } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				// Should show password field directly (no org selection needed)
				expect(getByTestId('password')).toBeInTheDocument();
				expect(screen.queryByText(/organization name/i)).not.toBeInTheDocument();
			});
		});
	});

	describe('Organization Selection', () => {
		it('shows organization dropdown when multiple orgs exist', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockMultiOrgMixedAuth }),
					),
				),
			);

			const { getByTestId, getByText } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByText('Organization Name')).toBeInTheDocument();
				expect(screen.getByRole('combobox')).toBeInTheDocument();
			});

			// Click on the dropdown to reveal the options
			await user.click(screen.getByRole('combobox'));

			await waitFor(() => {
				expect(screen.getByText(PASSWORD_AUTHN_ORG)).toBeInTheDocument();
				expect(screen.getByText(CALLBACK_AUTHN_ORG)).toBeInTheDocument();
			});
		});

		it('updates selected organization on dropdown change', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: mockMultiOrgMixedAuth })),
				),
			);

			render(<Login />);

			const emailInput = screen.getByTestId('email');
			const nextButton = screen.getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(screen.getByRole('combobox')).toBeInTheDocument();
			});

			// Select CALLBACK_AUTHN_ORG
			await user.click(screen.getByRole('combobox'));
			await user.click(screen.getByText(CALLBACK_AUTHN_ORG));

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /login with callback/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe('Password Authentication', () => {
		it('shows password field when password auth is supported', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgPasswordAuth }),
					),
				),
			);

			const { getByTestId, getByText } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByTestId('password')).toBeInTheDocument();
				expect(getByText(/forgot password/i)).toBeInTheDocument();
				expect(getByTestId('password_authn_submit')).toBeInTheDocument();
			});
		});

		it('enables password auth when URL parameter password=Y', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgCallbackAuth }),
					),
				),
			);

			const { getByTestId } = render(<Login />, undefined, {
				initialRoute: '/login?password=Y',
			});

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				// Should show password field even for SSO org due to password=Y override
				expect(getByTestId('password')).toBeInTheDocument();
			});
		});
	});

	describe('Callback Authentication', () => {
		it('shows callback login button when callback auth is supported', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgCallbackAuth }),
					),
				),
			);

			const { getByTestId, queryByTestId } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByTestId('callback_authn_submit')).toBeInTheDocument();
				expect(queryByTestId('password')).not.toBeInTheDocument();
			});
		});

		it('redirects to callback URL on button click', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			// Mock window.location.href
			const mockLocation = {
				href: 'http://localhost/',
			};
			Object.defineProperty(window, 'location', {
				value: mockLocation,
				writable: true,
			});

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgCallbackAuth }),
					),
				),
			);

			const { getByTestId, queryByTestId } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByTestId('callback_authn_submit')).toBeInTheDocument();
				expect(queryByTestId('password')).not.toBeInTheDocument();
			});

			const callbackButton = getByTestId('callback_authn_submit');
			await user.click(callbackButton);

			// Check that window.location.href was set to the callback URL
			await waitFor(() => {
				expect(window.location.href).toBe(CALLBACK_AUTHN_URL);
			});
		});
	});

	describe('Password Authentication Execution', () => {
		it('calls email/password API with correct parameters', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgPasswordAuth }),
					),
				),
				rest.post('*/api/v2/sessions/email_password', async (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockEmailPasswordResponse }),
					),
				),
			);

			const { getByTestId } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByTestId('password')).toBeInTheDocument();
			});

			const passwordInput = getByTestId('password');
			const loginButton = getByTestId('password_authn_submit');

			await user.type(passwordInput, 'testpassword');
			await user.click(loginButton);

			// do not test for the request paramters here. Reference: https://mswjs.io/docs/best-practices/avoid-request-assertions
			// rather test for the effects of the request
			await waitFor(() => {
				expect(localStorage.getItem('AUTH_TOKEN')).toBe('mock-access-token');
			});
		});

		it('shows error modal on authentication failure', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockSingleOrgPasswordAuth }),
					),
				),
				rest.post('*/api/v2/sessions/email_password', (_, res, ctx) =>
					res(
						ctx.status(401),
						ctx.json({
							error: {
								code: 'invalid_input',
								message: 'invalid password',
								url: '',
							},
						}),
					),
				),
			);

			const { getByTestId, getByText } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByTestId('password')).toBeInTheDocument();
			});

			const passwordInput = getByTestId('password');
			const loginButton = getByTestId('password_authn_submit');

			await user.type(passwordInput, 'wrongpassword');
			await user.click(loginButton);

			await waitFor(() => {
				expect(getByText('invalid password')).toBeInTheDocument();
			});
		});
	});

	describe('URL Parameter Handling', () => {
		it('calls afterLogin when accessToken and refreshToken are in URL', async () => {
			render(<Login />, undefined, {
				initialRoute: '/login?accessToken=test-token&refreshToken=test-refresh',
			});

			await waitFor(() => {
				expect(localStorage.getItem('AUTH_TOKEN')).toBe('test-token');
				expect(localStorage.getItem('REFRESH_AUTH_TOKEN')).toBe('test-refresh');
			});
		});

		it('shows error modal when callbackauthnerr parameter exists', async () => {
			const { getByText } = render(<Login />, undefined, {
				initialRoute:
					'/login?callbackauthnerr=true&code=AUTH_ERROR&message=Authentication failed&url=https://example.com/error&errors=[{"message":"Invalid token"}]',
			});

			await waitFor(() => {
				expect(getByText('AUTH_ERROR')).toBeInTheDocument();
			});
		});

		it('handles malformed error JSON gracefully', async () => {
			const { queryByText, getByText } = render(<Login />, undefined, {
				initialRoute:
					'/login?callbackauthnerr=true&code=AUTH_ERROR&message=Authentication failed&errors=invalid-json',
			});

			await waitFor(() => {
				expect(queryByText('invalid-json')).not.toBeInTheDocument();
				expect(getByText('AUTH_ERROR')).toBeInTheDocument();
			});
		});
	});

	describe('Session Organization Warnings', () => {
		it('shows warning modal when org has warning', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockOrgWithWarning }),
					),
				),
			);

			render(<Login />);

			const emailInput = screen.getByTestId('email');
			const nextButton = screen.getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(
					screen.getByText(/organization has limited access/i),
				).toBeInTheDocument();
			});
		});

		it('shows warning modal when a warning org is selected among multiple orgs', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			// Mock multiple orgs including one with a warning
			const mockMultiOrgWithWarning = {
				orgs: [
					{ id: 'org1', name: 'Org 1' },
					{
						id: 'org2',
						name: 'Org 2',
						warning: {
							code: 'ORG_WARNING',
							message: 'Organization has limited access',
							url: 'https://example.com/warning',
							errors: [{ message: 'Contact admin for full access' }],
						} as ErrorV2,
					},
				],
			};

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (_, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({ status: 'success', data: mockMultiOrgWithWarning }),
					),
				),
			);

			const { getByTestId } = render(<Login />);

			const emailInput = getByTestId('email');
			const nextButton = getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				expect(screen.getByRole('combobox')).toBeInTheDocument();
			});

			// Select the organization with a warning
			await user.click(screen.getByRole('combobox'));
			await user.click(screen.getByText('Org 2'));

			await waitFor(() => {
				expect(
					screen.getByText(/organization has limited access/i),
				).toBeInTheDocument();
			});
		});
	});

	describe('Form State Management', () => {
		it('disables form fields during loading states', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (req, res, ctx) =>
					res(
						ctx.delay(100),
						ctx.status(200),
						ctx.json({ data: mockSingleOrgPasswordAuth }),
					),
				),
			);

			render(<Login />);

			const emailInput = screen.getByTestId('email');
			const nextButton = screen.getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			// Button should be disabled during API call
			expect(nextButton).toBeDisabled();
		});

		it('shows correct button text for each auth method', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: mockSingleOrgPasswordAuth })),
				),
			);

			render(<Login />);

			// Initially shows "Next" button
			expect(screen.getByTestId('initiate_login')).toBeInTheDocument();

			const emailInput = screen.getByTestId('email');
			const nextButton = screen.getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				// Should show "Login" button for password auth
				expect(screen.getByTestId('password_authn_submit')).toBeInTheDocument();
				expect(screen.queryByTestId('initiate_login')).not.toBeInTheDocument();
			});
		});
	});

	describe('Edge Cases', () => {
		it('handles user with no organizations', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			const mockNoOrgs: SessionsContext = {
				exists: false,
				orgs: [],
			};

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: mockNoOrgs })),
				),
			);

			render(<Login />);

			const emailInput = screen.getByTestId('email');
			const nextButton = screen.getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				// Should not show any auth method buttons
				expect(
					screen.queryByTestId('password_authn_submit'),
				).not.toBeInTheDocument();
				expect(
					screen.queryByTestId('callback_authn_submit'),
				).not.toBeInTheDocument();
			});
		});

		it('handles organization with no auth support', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			const mockNoAuthSupport: SessionsContext = {
				exists: true,
				orgs: [
					{
						id: 'org-1',
						name: 'No Auth Organization',
						authNSupport: {
							password: [],
							callback: [],
						},
					},
				],
			};

			server.use(
				rest.get(SESSIONS_CONTEXT_ENDPOINT, (req, res, ctx) =>
					res(ctx.status(200), ctx.json({ data: mockNoAuthSupport })),
				),
			);

			render(<Login />);

			const emailInput = screen.getByTestId('email');
			const nextButton = screen.getByTestId('initiate_login');

			await user.type(emailInput, PASSWORD_AUTHN_EMAIL);
			await user.click(nextButton);

			await waitFor(() => {
				// Should not show any auth method buttons
				expect(
					screen.queryByTestId('password_authn_submit'),
				).not.toBeInTheDocument();
				expect(
					screen.queryByTestId('callback_authn_submit'),
				).not.toBeInTheDocument();
			});
		});
	});
});
