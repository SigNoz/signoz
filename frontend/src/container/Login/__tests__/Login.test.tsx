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

		const headingElement = screen.getByRole('heading', {
			name: 'login_page_title',
		});
		expect(headingElement).toBeInTheDocument();

		const textboxElement = screen.getByRole('textbox');
		expect(textboxElement).toBeInTheDocument();

		const buttonElement = screen.getByRole('button', {
			name: 'button_initiate_login',
		});
		expect(buttonElement).toBeInTheDocument();

		const noAccountPromptElement = screen.getByText('prompt_no_account');
		expect(noAccountPromptElement).toBeInTheDocument();
	});

	test(`Display "invalid_email" if email is not provided`, async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />);

		const buttonElement = screen.getByText('button_initiate_login');
		fireEvent.click(buttonElement);

		await waitFor(() =>
			expect(errorNotification).toHaveBeenCalledWith({
				message: 'invalid_email',
			}),
		);
	});

	test('Display invalid_config if invalid email is provided and next clicked', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />);

		const textboxElement = screen.getByRole('textbox');
		fireEvent.change(textboxElement, {
			target: { value: 'failEmail@signoz.io' },
		});

		const buttonElement = screen.getByRole('button', {
			name: 'button_initiate_login',
		});
		fireEvent.click(buttonElement);

		await waitFor(() =>
			expect(errorNotification).toHaveBeenCalledWith({
				message: 'invalid_config',
			}),
		);
	});

	test('providing shaheer@signoz.io as email and pressing next, should make the login_with_sso button visible', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />);
		act(() => {
			fireEvent.change(screen.getByTestId('email'), {
				target: { value: 'shaheer@signoz.io' },
			});

			fireEvent.click(screen.getByTestId('initiate_login'));
		});

		await waitFor(() => {
			expect(screen.getByText('login_with_sso')).toBeInTheDocument();
		});
	});

	test('Display email, password, forgot password if password=Y', () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="Y" />);

		const emailTextBox = screen.getByTestId('email');
		expect(emailTextBox).toBeInTheDocument();

		const passwordTextBox = screen.getByTestId('password');
		expect(passwordTextBox).toBeInTheDocument();

		const forgotPasswordLink = screen.getByText('forgot_password');
		expect(forgotPasswordLink).toBeInTheDocument();
	});

	test('Display tooltip with "prompt_forgot_password" if forgot password is clicked while password=Y', async () => {
		render(<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="Y" />);
		const forgotPasswordLink = screen.getByText('forgot_password');

		act(() => {
			fireEvent.mouseOver(forgotPasswordLink);
		});

		await waitFor(() => {
			const forgotPasswordTooltip = screen.getByRole('tooltip', {
				name: 'prompt_forgot_password',
			});
			expect(forgotPasswordLink).toBeInTheDocument();
			expect(forgotPasswordTooltip).toBeInTheDocument();
		});
	});
});
