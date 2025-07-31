import Login from 'container/Login';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';

const errorNotification = jest.fn();
jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			error: errorNotification,
		},
	})),
}));

describe('Login Flow', () => {
	test('Login form is rendered correctly', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />);

		// Check for the main description
		expect(
			screen.getByText(
				'Sign in to monitor, trace, and troubleshoot your applications effortlessly.',
			),
		).toBeInTheDocument();

		// Email input
		const emailInput = screen.getByTestId('email');
		expect(emailInput).toBeInTheDocument();
		expect(emailInput).toHaveAttribute('type', 'email');

		// Next button
		const nextButton = screen.getByRole('button', { name: /next/i });
		expect(nextButton).toBeInTheDocument();

		// No account prompt (default: canSelfRegister is false)
		expect(
			screen.getByText(
				"Don't have an account? Contact your admin to send you an invite link.",
			),
		).toBeInTheDocument();
	});

	test('Display error if email is not provided', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />);

		const nextButton = screen.getByRole('button', { name: /next/i });
		fireEvent.click(nextButton);

		await waitFor(() =>
			expect(errorNotification).toHaveBeenCalledWith({
				message: 'Please enter a valid email address',
			}),
		);
	});

	test('Display error if invalid email is provided and next clicked', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />);

		const emailInput = screen.getByTestId('email');
		fireEvent.change(emailInput, {
			target: { value: 'failEmail@signoz.io' },
		});

		const nextButton = screen.getByRole('button', { name: /next/i });
		fireEvent.click(nextButton);

		await waitFor(() =>
			expect(errorNotification).toHaveBeenCalledWith({
				message:
					'Invalid configuration detected, please contact your administrator',
			}),
		);
	});

	test('providing shaheer@signoz.io as email and pressing next, should make the Login with SSO button visible', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />);
		act(() => {
			fireEvent.change(screen.getByTestId('email'), {
				target: { value: 'shaheer@signoz.io' },
			});
			fireEvent.click(screen.getByTestId('initiate_login'));
		});

		await waitFor(() => {
			expect(screen.getByText(/login with sso/i)).toBeInTheDocument();
		});
	});

	test('Display email, password, forgot password if password=Y', () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="Y" />);

		const emailInput = screen.getByTestId('email');
		expect(emailInput).toBeInTheDocument();

		const passwordInput = screen.getByTestId('password');
		expect(passwordInput).toBeInTheDocument();

		const forgotPasswordLink = screen.getByText('Forgot password?');
		expect(forgotPasswordLink).toBeInTheDocument();
	});

	test('Display tooltip with correct message if forgot password is hovered while password=Y', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="Y" />);
		const forgotPasswordLink = screen.getByText('Forgot password?');

		act(() => {
			fireEvent.mouseOver(forgotPasswordLink);
		});

		await waitFor(() => {
			// Tooltip text is static in the new UI
			expect(
				screen.getByText(
					'Ask your admin to reset your password and send you a new invite link',
				),
			).toBeInTheDocument();
		});
	});
});
