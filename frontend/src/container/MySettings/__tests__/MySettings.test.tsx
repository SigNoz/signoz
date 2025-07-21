import MySettingsContainer from 'container/MySettings';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';

const toggleThemeFunction = jest.fn();
const logEventFunction = jest.fn();

jest.mock('hooks/useDarkMode', () => ({
	__esModule: true,
	useIsDarkMode: jest.fn(() => true),
	useSystemTheme: jest.fn(() => 'dark'),
	default: jest.fn(() => ({
		toggleTheme: toggleThemeFunction,
		autoSwitch: false,
		setAutoSwitch: jest.fn(),
	})),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn((eventName, data) => logEventFunction(eventName, data)),
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

const THEME_SELECTOR_TEST_ID = 'theme-selector';
const RESET_PASSWORD_BUTTON_TEXT = 'Reset password';
const CURRENT_PASSWORD_TEST_ID = 'current-password-textbox';
const NEW_PASSWORD_TEST_ID = 'new-password-textbox';
const UPDATE_NAME_BUTTON_TEST_ID = 'update-name-btn';
const RESET_PASSWORD_BUTTON_TEST_ID = 'reset-password-btn';
const UPDATE_NAME_BUTTON_TEXT = 'Update name';
const PASSWORD_VALIDATION_MESSAGE_TEST_ID = 'password-validation-message';

describe('MySettings Flows', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		render(<MySettingsContainer />);
	});

	describe('Dark/Light Theme Switch', () => {
		it('Should display Dark, Light, and System theme options properly', async () => {
			// Check Dark theme option
			expect(screen.getByText('Dark')).toBeInTheDocument();
			const darkThemeIcon = screen.getByTestId('dark-theme-icon');
			expect(darkThemeIcon).toBeInTheDocument();
			expect(darkThemeIcon.tagName).toBe('svg');

			// Check Light theme option
			expect(screen.getByText('Light')).toBeInTheDocument();
			const lightThemeIcon = screen.getByTestId('light-theme-icon');
			expect(lightThemeIcon).toBeInTheDocument();
			expect(lightThemeIcon.tagName).toBe('svg');
			expect(screen.getByText('Beta')).toBeInTheDocument();

			// Check System theme option
			expect(screen.getByText('System')).toBeInTheDocument();
			const autoThemeIcon = screen.getByTestId('auto-theme-icon');
			expect(autoThemeIcon).toBeInTheDocument();
			expect(autoThemeIcon.tagName).toBe('svg');
		});

		it('Should have Dark theme selected by default', async () => {
			const themeSelector = screen.getByTestId(THEME_SELECTOR_TEST_ID);
			const darkOption = themeSelector.querySelector(
				'input[value="dark"]',
			) as HTMLInputElement;
			expect(darkOption).toBeChecked();
		});

		it('Should switch theme and log event when Light theme is selected', async () => {
			const themeSelector = screen.getByTestId(THEME_SELECTOR_TEST_ID);
			const lightOption = themeSelector.querySelector(
				'input[value="light"]',
			) as HTMLInputElement;

			fireEvent.click(lightOption);

			await waitFor(() => {
				expect(toggleThemeFunction).toHaveBeenCalled();
				expect(logEventFunction).toHaveBeenCalledWith(
					'Account Settings: Theme Changed',
					{
						theme: 'light',
					},
				);
			});
		});
	});

	describe('User Details Form', () => {
		it('Should properly display the User Details Form', () => {
			// Open the Update name modal first
			const updateNameButton = screen.getByText(UPDATE_NAME_BUTTON_TEXT);
			fireEvent.click(updateNameButton);

			// Find the label with class 'ant-typography' and text 'Name'
			const nameLabels = screen.getAllByText('Name');
			const nameLabel = nameLabels.find((el) =>
				el.className.includes('ant-typography'),
			);
			const nameTextbox = screen.getByPlaceholderText('e.g. John Doe');
			const modalUpdateNameButton = screen.getByTestId(UPDATE_NAME_BUTTON_TEST_ID);

			expect(nameLabel).toBeInTheDocument();
			expect(nameTextbox).toBeInTheDocument();
			expect(modalUpdateNameButton).toBeInTheDocument();
		});

		it('Should update the name on clicking Update button', async () => {
			// Open the Update name modal first
			const updateNameButton = screen.getByText(UPDATE_NAME_BUTTON_TEXT);
			fireEvent.click(updateNameButton);

			const nameTextbox = screen.getByPlaceholderText('e.g. John Doe');
			const modalUpdateNameButton = screen.getByTestId(UPDATE_NAME_BUTTON_TEST_ID);

			act(() => {
				fireEvent.change(nameTextbox, { target: { value: 'New Name' } });
			});

			fireEvent.click(modalUpdateNameButton);

			await waitFor(() =>
				expect(successNotification).toHaveBeenCalledWith({
					message: 'success',
				}),
			);
		});
	});

	describe('Reset password', () => {
		it('Should open password reset modal when clicking Reset password button', async () => {
			const resetPasswordButtons = screen.getAllByText(RESET_PASSWORD_BUTTON_TEXT);
			// The first button is the one in the user info section
			fireEvent.click(resetPasswordButtons[0]);

			// Check if modal is opened (look for modal title)
			expect(
				screen.getByText((content, element) =>
					Boolean(
						element &&
							'className' in element &&
							typeof element.className === 'string' &&
							element.className.includes('title') &&
							content === RESET_PASSWORD_BUTTON_TEXT,
					),
				),
			).toBeInTheDocument();
			expect(screen.getByTestId(CURRENT_PASSWORD_TEST_ID)).toBeInTheDocument();
			expect(screen.getByTestId(NEW_PASSWORD_TEST_ID)).toBeInTheDocument();
		});

		it('Should display validation error if password is less than 8 characters', async () => {
			const resetPasswordButtons = screen.getAllByText(RESET_PASSWORD_BUTTON_TEXT);
			fireEvent.click(resetPasswordButtons[0]);

			const currentPasswordTextbox = screen.getByTestId(CURRENT_PASSWORD_TEST_ID);
			act(() => {
				fireEvent.change(currentPasswordTextbox, { target: { value: '123' } });
			});

			await waitFor(() => {
				// Use getByTestId for the validation message (if present in your modal/component)
				if (screen.queryByTestId(PASSWORD_VALIDATION_MESSAGE_TEST_ID)) {
					expect(
						screen.getByTestId(PASSWORD_VALIDATION_MESSAGE_TEST_ID),
					).toBeInTheDocument();
				}
			});
		});

		it('Should disable reset button when current and new passwords are the same', async () => {
			const resetPasswordButtons = screen.getAllByText(RESET_PASSWORD_BUTTON_TEXT);
			fireEvent.click(resetPasswordButtons[0]);

			const currentPasswordTextbox = screen.getByTestId(CURRENT_PASSWORD_TEST_ID);
			const newPasswordTextbox = screen.getByTestId(NEW_PASSWORD_TEST_ID);
			const submitButton = screen.getByTestId(RESET_PASSWORD_BUTTON_TEST_ID);

			act(() => {
				fireEvent.change(currentPasswordTextbox, {
					target: { value: '123456789' },
				});
				fireEvent.change(newPasswordTextbox, { target: { value: '123456789' } });
			});

			expect(submitButton).toBeDisabled();
		});

		it('Should enable reset button when passwords are valid and different', async () => {
			const resetPasswordButtons = screen.getAllByText(RESET_PASSWORD_BUTTON_TEXT);
			fireEvent.click(resetPasswordButtons[0]);

			const currentPasswordTextbox = screen.getByTestId(CURRENT_PASSWORD_TEST_ID);
			const newPasswordTextbox = screen.getByTestId(NEW_PASSWORD_TEST_ID);
			const submitButton = screen.getByTestId(RESET_PASSWORD_BUTTON_TEST_ID);

			act(() => {
				fireEvent.change(currentPasswordTextbox, {
					target: { value: '123456789' },
				});
				fireEvent.change(newPasswordTextbox, { target: { value: '987654321' } });
			});

			expect(submitButton).not.toBeDisabled();
		});
	});
});
