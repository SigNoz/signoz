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

	test('Display invalid_config if invalid email is provided and next clicked', async () => {
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

	test.only('Display "Login with SSO" if SSO-enabled valid email is provided and Next is clicked', async () => {
		const { getByRole, findByText } = render(
			<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />,
		);

		const textboxElement = getByRole('textbox');

		act(() => {
			fireEvent.change(textboxElement, {
				target: { value: 'shaheer@signoz.io' },
			});

			const nextButtonElement = getByRole('button', {
				name: 'button_initiate_login',
			});

			fireEvent.click(nextButtonElement);
		});
		const loginWithSsoButton = await findByText((text) =>
			text.includes('login_with_sso'),
		);
		expect(loginWithSsoButton).toBeInTheDocument();
		// await waitFor(() => {
		// });
	});

	// TODO(shaheer): find the issue and fix
	// test.only('Display password field if non-SSO email is provided e.g. example@abc.com', async () => {
	// 	const { getByRole, getByTestId } = render(
	// 		<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />,
	// 	);

	// 	const textboxElement = getByRole('textbox');

	// 	act(() => {
	// 		// Set invalid password
	// 		fireEvent.change(textboxElement, {
	// 			target: { value: 'example@abc.com' },
	// 		});
	// 	});

	// 	const buttonElement = getByRole('button', {
	// 		name: 'button_initiate_login',
	// 	});

	// 	fireEvent.click(buttonElement);

	// 	await waitFor(() => {
	// 		// Expect the "Get Started" button to be disabled
	// 		// expect(submitButton).toBeDisabled();
	// 		const passwordElement = getByTestId('reset_password');
	// 		expect(passwordElement).toBeInTheDocument();
	// 	});
	// });

	// test.only('Display password field if non-SSO email is provided e.g. example@abc.com', () => {
	// 	const { getByRole, findByRole } = render(
	// 		<Login ssoerror="" jwt="" refreshjwt="" userId="" withPassword="" />,
	// 	);

	// 	const textboxElement = getByRole('textbox');
	// 	fireEvent.change(textboxElement, {
	// 		target: { value: 'example@abc.com' },
	// 	});

	// 	const buttonElement = getByRole('button', {
	// 		name: 'button_initiate_login',
	// 	});

	// 	// fireEvent.click(buttonElement);

	// 	const passwordElement = findByRole('textbox', {
	// 		name: 'label_passwords',
	// 	});

	// 	expect(passwordElement).toBeInTheDocument();
	// });
});
