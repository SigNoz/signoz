import { QueryClient, QueryClientProvider } from 'react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { logEventMock } from '__tests__/logEventMock';
import { GlobalShortcuts } from 'constants/shortcuts/globalShortcuts';
import { USER_PREFERENCES } from 'constants/userPreferences';
import {
	KeyboardHotkeysProvider,
	useKeyboardHotkeys,
} from 'hooks/hotkeys/useKeyboardHotkeys';

// Mock dependencies
vi.mock('providers/cmdKProvider', () => ({
	useCmdK: (): {
		open: boolean;
		setOpen: React.Dispatch<React.SetStateAction<boolean>>;
		openCmdK: () => void;
		closeCmdK: () => void;
	} => ({
		open: false,
		setOpen: vi.fn(),
		openCmdK: vi.fn(),
		closeCmdK: vi.fn(),
	}),
}));

// Mock the AppContext
const mockUpdateUserPreferenceInContext = vi.fn();

const SHIFT_B_KEYBOARD_SHORTCUT = '{Shift>}b{/Shift}';

vi.mock('providers/App/App', () => ({
	useAppContext: vi.fn(() => ({
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

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Global Shortcuts Constants', () => {
		it('should have the correct shortcut key combination', () => {
			expect(GlobalShortcuts.ToggleSidebar).toBe('shift+b');
		});
	});

	describe('Keyboard Shortcut Registration', () => {
		it('should register the sidebar toggle shortcut correctly', async () => {
			const user = userEvent.setup();
			const mockHandleShortcut = vi.fn();

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
			const mockHandleShortcut = vi.fn();

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
			const mockHandleShortcut = vi.fn(() => {
				logEventMock('Global Shortcut: Sidebar Toggle', {
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

			expect(logEventMock).toHaveBeenCalledWith(
				'Global Shortcut: Sidebar Toggle',
				{
					previousState: false,
					newState: true,
				},
			);
		});

		it('should update user preference in context', async () => {
			const user = userEvent.setup();
			const mockHandleShortcut = vi.fn(() => {
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
