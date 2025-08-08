import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import logEvent from 'api/common/logEvent';
import { GlobalShortcuts } from 'constants/shortcuts/globalShortcuts';
import { USER_PREFERENCES } from 'constants/userPreferences';
import {
	KeyboardHotkeysProvider,
	useKeyboardHotkeys,
} from 'hooks/hotkeys/useKeyboardHotkeys';
import { QueryClient, QueryClientProvider } from 'react-query';

// Mock dependencies
jest.mock('api/common/logEvent', () => jest.fn());

// Mock the AppContext
const mockUpdateUserPreferenceInContext = jest.fn();

const SHIFT_B_KEYBOARD_SHORTCUT = '{Shift>}b{/Shift}';

jest.mock('providers/App/App', () => ({
	useAppContext: jest.fn(() => ({
		userPreferences: [
			{
				name: USER_PREFERENCES.SIDENAV_PINNED,
				value: false,
			},
		],
		updateUserPreferenceInContext: mockUpdateUserPreferenceInContext,
	})),
}));

function TestComponent({
	mockHandleShortcut,
}: {
	mockHandleShortcut: () => void;
}): JSX.Element {
	const { registerShortcut } = useKeyboardHotkeys();
	registerShortcut(GlobalShortcuts.ToggleSidebar, mockHandleShortcut);
	return <div data-testid="test">Test</div>;
}

describe('Sidebar Toggle Shortcut', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
				mutations: {
					retry: false,
				},
			},
		});

		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Global Shortcuts Constants', () => {
		it('should have the correct shortcut key combination', () => {
			expect(GlobalShortcuts.ToggleSidebar).toBe('b+shift');
		});
	});

	describe('Keyboard Shortcut Registration', () => {
		it('should register the sidebar toggle shortcut correctly', async () => {
			const user = userEvent.setup();
			const mockHandleShortcut = jest.fn();

			render(
				<QueryClientProvider client={queryClient}>
					<KeyboardHotkeysProvider>
						<TestComponent mockHandleShortcut={mockHandleShortcut} />
					</KeyboardHotkeysProvider>
				</QueryClientProvider>,
			);

			// Trigger the shortcut
			await user.keyboard(SHIFT_B_KEYBOARD_SHORTCUT);

			expect(mockHandleShortcut).toHaveBeenCalled();
		});

		it('should not trigger shortcut in input fields', async () => {
			const user = userEvent.setup();
			const mockHandleShortcut = jest.fn();

			function TestComponent(): JSX.Element {
				const { registerShortcut } = useKeyboardHotkeys();
				registerShortcut(GlobalShortcuts.ToggleSidebar, mockHandleShortcut);
				return (
					<div>
						<input data-testid="input-field" />
						<div data-testid="test">Test</div>
					</div>
				);
			}

			render(
				<QueryClientProvider client={queryClient}>
					<KeyboardHotkeysProvider>
						<TestComponent />
					</KeyboardHotkeysProvider>
				</QueryClientProvider>,
			);

			// Focus on input field
			const inputField = screen.getByTestId('input-field');
			await user.click(inputField);

			// Try to trigger shortcut while focused on input
			await user.keyboard('{Shift>}b{/Shift}');

			// Should not trigger the shortcut
			expect(mockHandleShortcut).not.toHaveBeenCalled();
		});
	});

	describe('Sidebar Toggle Functionality', () => {
		it('should log the toggle event with correct parameters', async () => {
			const user = userEvent.setup();
			const mockHandleShortcut = jest.fn(() => {
				logEvent('Global Shortcut: Sidebar Toggle', {
					previousState: false,
					newState: true,
				});
			});

			render(
				<QueryClientProvider client={queryClient}>
					<KeyboardHotkeysProvider>
						<TestComponent mockHandleShortcut={mockHandleShortcut} />
					</KeyboardHotkeysProvider>
				</QueryClientProvider>,
			);

			await user.keyboard(SHIFT_B_KEYBOARD_SHORTCUT);

			expect(logEvent).toHaveBeenCalledWith('Global Shortcut: Sidebar Toggle', {
				previousState: false,
				newState: true,
			});
		});

		it('should update user preference in context', async () => {
			const user = userEvent.setup();
			const mockHandleShortcut = jest.fn(() => {
				const save = {
					name: USER_PREFERENCES.SIDENAV_PINNED,
					value: true,
				};
				mockUpdateUserPreferenceInContext(save);
			});

			render(
				<QueryClientProvider client={queryClient}>
					<KeyboardHotkeysProvider>
						<TestComponent mockHandleShortcut={mockHandleShortcut} />
					</KeyboardHotkeysProvider>
				</QueryClientProvider>,
			);

			await user.keyboard(SHIFT_B_KEYBOARD_SHORTCUT);

			expect(mockUpdateUserPreferenceInContext).toHaveBeenCalledWith({
				name: USER_PREFERENCES.SIDENAV_PINNED,
				value: true,
			});
		});
	});
});
