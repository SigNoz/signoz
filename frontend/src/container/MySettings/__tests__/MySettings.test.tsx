import MySettingsContainer from 'container/MySettings';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';

const toggleThemeFunction = jest.fn();

jest.mock('hooks/useDarkMode', () => ({
	__esModule: true,
	useIsDarkMode: jest.fn(() => ({
		toggleTheme: toggleThemeFunction,
	})),
	default: jest.fn(() => ({
		toggleTheme: toggleThemeFunction,
	})),
}));

const errorNotification = jest.fn();
const successNotification = jest.fn();
jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			error: errorNotification,
			success: successNotification,
		},
	})),
}));

enum ThemeOptions {
	Dark = 'Dark',
	Light = 'Light Beta',
}

describe('MySettings Flows', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		render(<MySettingsContainer />);
	});

	describe('Dark/Light Theme Switch', () => {
		it('Should display Dark and Light theme buttons properly', async () => {
			expect(screen.getByText('Dark')).toBeInTheDocument();

			const darkThemeIcon = screen.getByTestId('dark-theme-icon');
			expect(darkThemeIcon).toBeInTheDocument();
			expect(darkThemeIcon.tagName).toBe('svg');

			expect(screen.getByText('Light')).toBeInTheDocument();
			const lightThemeIcon = screen.getByTestId('light-theme-icon');
			expect(lightThemeIcon).toBeInTheDocument();
			expect(lightThemeIcon.tagName).toBe('svg');
		});

		it('Should activate Dark and Light buttons on click', async () => {
			const initialSelectedOption = screen.getByRole('radio', {
				name: ThemeOptions.Dark,
			});
			expect(initialSelectedOption).toBeChecked();

			const newThemeOption = screen.getByRole('radio', {
				name: ThemeOptions.Light,
			});
			fireEvent.click(newThemeOption);

			expect(newThemeOption).toBeChecked();
		});

		it('Should switch the them on clicking Light theme', async () => {
			const lightThemeOption = screen.getByRole('radio', {
				name: /light/i,
			});
			fireEvent.click(lightThemeOption);

			await waitFor(() => {
				expect(toggleThemeFunction).toBeCalled();
			});
		});
	});

	describe('User Details Form', () => {
		it('Should properly display the User Details Form', () => {
			const userDetailsHeader = screen.getByRole('heading', {
				name: /user details/i,
			});
			const nameLabel = screen.getByTestId('name-label');
			const nameTextbox = screen.getByTestId('name-textbox');
			const updateNameButton = screen.getByTestId('update-name-button');
			const emailLabel = screen.getByTestId('email-label');
			const emailTextbox = screen.getByTestId('email-textbox');
			const roleLabel = screen.getByTestId('role-label');
			const roleTextbox = screen.getByTestId('role-textbox');

			expect(userDetailsHeader).toBeInTheDocument();
			expect(nameLabel).toBeInTheDocument();
			expect(nameTextbox).toBeInTheDocument();
			expect(updateNameButton).toBeInTheDocument();
			expect(emailLabel).toBeInTheDocument();
			expect(emailTextbox).toBeInTheDocument();
			expect(roleLabel).toBeInTheDocument();
			expect(roleTextbox).toBeInTheDocument();
		});

		it('Should update the name on clicking Update button', async () => {
			const nameTextbox = screen.getByTestId('name-textbox');
			const updateNameButton = screen.getByTestId('update-name-button');

			act(() => {
				fireEvent.change(nameTextbox, { target: { value: 'New Name' } });
			});

			fireEvent.click(updateNameButton);

			await waitFor(() =>
				expect(successNotification).toHaveBeenCalledWith({
					message: 'success',
				}),
			);
		});
	});

	describe('Reset password', () => {
		let currentPasswordTextbox: Node | Window;
		let newPasswordTextbox: Node | Window;
		let submitButtonElement: HTMLElement;

		beforeEach(() => {
			currentPasswordTextbox = screen.getByTestId('current-password-textbox');
			newPasswordTextbox = screen.getByTestId('new-password-textbox');
			submitButtonElement = screen.getByTestId('update-password-button');
		});

		it('Should properly display the Password Reset Form', () => {
			const passwordResetHeader = screen.getByTestId('change-password-header');
			expect(passwordResetHeader).toBeInTheDocument();

			const currentPasswordLabel = screen.getByTestId('current-password-label');
			expect(currentPasswordLabel).toBeInTheDocument();

			expect(currentPasswordTextbox).toBeInTheDocument();

			const newPasswordLabel = screen.getByTestId('new-password-label');
			expect(newPasswordLabel).toBeInTheDocument();

			expect(newPasswordTextbox).toBeInTheDocument();
			expect(submitButtonElement).toBeInTheDocument();

			const savePasswordIcon = screen.getByTestId('update-password-icon');
			expect(savePasswordIcon).toBeInTheDocument();
			expect(savePasswordIcon.tagName).toBe('svg');
		});

		it('Should display validation error if password is less than 8 characters', async () => {
			const currentPasswordTextbox = screen.getByTestId(
				'current-password-textbox',
			);
			act(() => {
				fireEvent.change(currentPasswordTextbox, { target: { value: '123' } });
			});
			const validationMessage = await screen.findByTestId('validation-message');

			await waitFor(() => {
				expect(validationMessage).toHaveTextContent(
					'Password must a have minimum of 8 characters',
				);
			});
		});

		test("Should display 'inavlid credentials' error if different current and new passwords are provided", async () => {
			act(() => {
				fireEvent.change(currentPasswordTextbox, {
					target: { value: '123456879' },
				});

				fireEvent.change(newPasswordTextbox, { target: { value: '123456789' } });
			});

			fireEvent.click(submitButtonElement);

			await waitFor(() => expect(errorNotification).toHaveBeenCalled());
		});

		it('Should check if the "Change Password" button is disabled in case current / new password is less than 8 characters', () => {
			act(() => {
				fireEvent.change(currentPasswordTextbox, {
					target: { value: '123' },
				});
				fireEvent.change(newPasswordTextbox, { target: { value: '123' } });
			});

			expect(submitButtonElement).toBeDisabled();
		});

		test("Should check if 'Change Password' button is enabled when password is at least 8 characters ", async () => {
			expect(submitButtonElement).toBeDisabled();

			act(() => {
				fireEvent.change(currentPasswordTextbox, {
					target: { value: '123456789' },
				});
				fireEvent.change(newPasswordTextbox, { target: { value: '1234567890' } });
			});

			expect(submitButtonElement).toBeEnabled();
		});

		test("Should check if 'Change Password' button is disabled when current and new passwords are the same ", async () => {
			expect(submitButtonElement).toBeDisabled();

			act(() => {
				fireEvent.change(currentPasswordTextbox, {
					target: { value: '123456789' },
				});
				fireEvent.change(newPasswordTextbox, { target: { value: '123456789' } });
			});

			expect(submitButtonElement).toBeDisabled();
		});
	});
});
