import { Logout } from 'api/utils';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { createErrorResponse, rest, server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import ResetPassword from '../index';

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: { search: '' },
	},
}));

jest.mock('api/utils', () => ({
	Logout: jest.fn().mockResolvedValue(undefined),
}));

const VERIFY_TOKEN_ENDPOINT = '*/api/v2/reset_password_tokens/verify';
const VERSION_ENDPOINT = '*/version';

const mockHistoryPush = history.push as jest.MockedFunction<
	typeof history.push
>;

const successVerifyResponse = {
	data: { id: 'token-id', token: 'valid-token' },
};

const successVersionResponse = {
	version: '0.0.1',
	ee: 'Y',
	setupCompleted: true,
};

describe('ResetPassword Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(
			rest.get(VERSION_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(successVersionResponse)),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Token validation on page load', () => {
		it('shows spinner then form when token is valid', async () => {
			server.use(
				rest.post(VERIFY_TOKEN_ENDPOINT, (_, res, ctx) =>
					res(ctx.delay(50), ctx.status(200), ctx.json(successVerifyResponse)),
				),
			);

			window.history.pushState({}, '', '/password-reset?token=valid-token');
			render(<ResetPassword />, undefined, {
				initialRoute: '/password-reset?token=valid-token',
			});

			// Loading state: spinner visible, form and error absent
			expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
			expect(screen.queryByTestId('password')).not.toBeInTheDocument();
			expect(
				screen.queryByText(/reset password token is expired/i),
			).not.toBeInTheDocument();

			// After verification resolves: form is shown
			await waitFor(() => {
				expect(screen.getByTestId('password')).toBeInTheDocument();
			});
			expect(screen.getByTestId('confirmPassword')).toBeInTheDocument();
		});

		it('shows "Invalid Reset Link" when token is not found (404)', async () => {
			server.use(
				rest.post(
					VERIFY_TOKEN_ENDPOINT,
					createErrorResponse(
						404,
						'reset_password_token_not_found',
						'reset password token does not exist',
					),
				),
			);

			window.history.pushState({}, '', '/password-reset?token=invalid-token');
			render(<ResetPassword />, undefined, {
				initialRoute: '/password-reset?token=invalid-token',
			});

			await waitFor(() => {
				expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
			});

			expect(
				screen.getByText(/invalid or has already been used/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(/reset password token does not exist/i),
			).toBeInTheDocument();
		});

		it('shows "token is expired" when token is expired (401) without redirecting to login', async () => {
			server.use(
				rest.post(
					VERIFY_TOKEN_ENDPOINT,
					createErrorResponse(
						401,
						'reset_password_token_expired',
						'reset password token has expired',
					),
				),
			);

			window.history.pushState({}, '', '/password-reset?token=expired-token');
			render(<ResetPassword />, undefined, {
				initialRoute: '/password-reset?token=expired-token',
			});

			await waitFor(() => {
				expect(
					screen.getByText(/reset password token is expired/i),
				).toBeInTheDocument();
			});

			expect(
				screen.getByText(/single-use and expire after a set period/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(/reset password token has expired/i),
			).toBeInTheDocument();
			// 401 from this endpoint must NOT trigger logout/redirect
			expect(mockHistoryPush).not.toHaveBeenCalledWith(ROUTES.LOGIN);
			expect(Logout).not.toHaveBeenCalled();
		});

		it('redirects to login when no token is in the URL', async () => {
			window.history.pushState({}, '', '/password-reset');
			render(<ResetPassword />, undefined, {
				initialRoute: '/password-reset',
			});

			await waitFor(() => {
				expect(mockHistoryPush).toHaveBeenCalledWith(ROUTES.LOGIN);
			});

			expect(Logout).toHaveBeenCalled();
		});
	});
});
