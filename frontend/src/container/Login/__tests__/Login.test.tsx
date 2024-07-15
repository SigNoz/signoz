import Login from 'container/Login';
import { act, fireEvent, render, waitFor } from 'tests/test-utils';

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
		const { getByRole, getByText } = render(
			<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />,
		);

		const headingElement = getByRole('heading', {
			name: 'login_page_title',
		});
		expect(headingElement).toBeInTheDocument();

		const textboxElement = getByRole('textbox');
		expect(textboxElement).toBeInTheDocument();

		const buttonElement = getByRole('button', {
			name: 'button_initiate_login',
		});
		expect(buttonElement).toBeInTheDocument();

		const noAccountPromptElement = getByText('prompt_no_account');
		expect(noAccountPromptElement).toBeInTheDocument();
	});

	test(`Display "invalid_email" if email is not provided`, async () => {
		const { getByText } = render(
			<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />,
		);

		const buttonElement = getByText('button_initiate_login');
		fireEvent.click(buttonElement);

		await waitFor(() =>
			expect(errorNotification).toHaveBeenCalledWith({
				message: 'invalid_email',
			}),
		);
	});

	test.skip('Display invalid_config if invalid email is provided and next clicked', async () => {
		const { getByRole } = render(
			<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />,
		);

		const textboxElement = getByRole('textbox');
		fireEvent.change(textboxElement, { target: { value: 'test' } });

		const buttonElement = getByRole('button', {
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
		const { getByText, getByTestId } = render(
			<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />,
		);
		act(() => {
			// Simulate typing into the email field
			fireEvent.change(getByTestId('email'), {
				target: { value: 'shaheer@signoz.io' },
			});

			// Simulate clicking the 'Next' button
			fireEvent.click(getByTestId('initiate_login'));
		});

		// Wait for the SSO button to appear
		await waitFor(() => {
			expect(getByText('login_with_sso')).toBeInTheDocument();
		});
	});

	test.skip('Display email, password, forgot password if password=Y', () => {
		const { getByTestId, getByText } = render(
			<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="Y" />,
		);

		const emailTextBox = getByTestId('email');

		const passwordTextBox = getByTestId('password');

		const forgotPasswordLink = getByText('forgot_password');

		expect(emailTextBox).toBeInTheDocument();
		expect(passwordTextBox).toBeInTheDocument();
		expect(forgotPasswordLink).toBeInTheDocument();
	});
	test.skip('Display tooltip with "prompt_forgot_password" if forgot password is clicked while password=Y', async () => {
		const { getByRole, getByText } = render(
			<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="Y" />,
		);

		const forgotPasswordLink = getByText('forgot_password');

		act(() => {
			fireEvent.mouseOver(forgotPasswordLink);
		});

		await waitFor(() => {
			const forgotPasswordTooltip = getByRole('tooltip', {
				name: 'prompt_forgot_password',
			});
			expect(forgotPasswordLink).toBeInTheDocument();
			expect(forgotPasswordTooltip).toBeInTheDocument();
		});
	});
});
