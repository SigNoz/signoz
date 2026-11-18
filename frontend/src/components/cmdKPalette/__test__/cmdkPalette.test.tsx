/**
 * src/components/cmdKPalette/__test__/cmdkPalette.test.tsx
 */
// ---- Mocks (must run BEFORE importing the component) ----
import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';
import { render, screen, userEvent } from 'tests/test-utils';

import '@testing-library/jest-dom/extend-expect';

import { CmdKPalette } from '../cmdKPalette';

const HOME_LABEL = 'Go to Home';

beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
		configurable: true,
		value: jest.fn(),
	});
});

afterAll(() => {
	// restore
	delete (HTMLElement.prototype as any).scrollIntoView;
});

jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: jest.fn(),
}));

const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

// Mock ResizeObserver for Jest/jsdom
class ResizeObserver {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	observe() {}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	unobserve() {}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	disconnect() {}
}

(global as any).ResizeObserver = ResizeObserver;

// mock cmdK provider hook (open state + setter)
const mockSetOpen = jest.fn();
jest.mock('providers/cmdKProvider', (): unknown => ({
	useCmdK: (): {
		open: boolean;
		setOpen: jest.Mock;
		openCmdK: jest.Mock;
		closeCmdK: jest.Mock;
	} => ({
		open: true,
		setOpen: mockSetOpen,
		openCmdK: jest.fn(),
		closeCmdK: jest.fn(),
	}),
}));

// mock notifications hook
jest.mock('hooks/useNotifications', (): unknown => ({
	useNotifications: (): { notifications: [] } => ({ notifications: [] }),
}));

// mock theme hook
jest.mock('hooks/useDarkMode', (): unknown => ({
	useThemeMode: (): {
		setAutoSwitch: jest.Mock;
		setTheme: jest.Mock;
		theme: string;
	} => ({
		setAutoSwitch: jest.fn(),
		setTheme: jest.fn(),
		theme: 'dark',
	}),
}));

// mock updateUserPreference API and react-query mutation
jest.mock('api/v1/user/preferences/name/update', (): jest.Mock => jest.fn());
jest.mock('react-query', (): unknown => {
	const actual = jest.requireActual('react-query');
	return {
		...actual,
		useMutation: (): { mutate: jest.Mock } => ({ mutate: jest.fn() }),
	};
});

// mock other side-effecty modules
jest.mock('api/browser/localstorage/set', () => jest.fn());
jest.mock('utils/error', () => ({ showErrorNotification: jest.fn() }));

// ---- Tests ----
describe('CmdKPalette', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders navigation and settings groups and items', () => {
		render(<CmdKPalette userRole="ADMIN" />);

		expect(screen.getByText('Navigation')).toBeInTheDocument();
		expect(screen.getByText('Settings')).toBeInTheDocument();

		expect(screen.getByText(HOME_LABEL)).toBeInTheDocument();
		expect(screen.getByText('Go to Dashboards')).toBeInTheDocument();
		expect(screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
	});

	it('clicking a navigation item navigates to the correct route', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CmdKPalette userRole="ADMIN" />);

		const homeItem = screen.getByText(HOME_LABEL);
		await user.click(homeItem);

		expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);
	});

	it('role-based filtering (basic smoke)', () => {
		render(<CmdKPalette userRole="VIEWER" />);

		// VIEWER still sees basic navigation items
		expect(screen.getByText(HOME_LABEL)).toBeInTheDocument();
	});

	it('keyboard shortcut opens palette via setOpen', () => {
		render(<CmdKPalette userRole="ADMIN" />);

		const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
		window.dispatchEvent(event);

		expect(mockSetOpen).toHaveBeenCalledWith(true);
	});

	it('items render with icons when provided', () => {
		render(<CmdKPalette userRole="ADMIN" />);

		const iconHolders = document.querySelectorAll('.cmd-item-icon');
		expect(iconHolders.length).toBeGreaterThan(0);
		expect(screen.getByText(HOME_LABEL)).toBeInTheDocument();
	});

	it('closing the palette via handleInvoke sets open to false', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CmdKPalette userRole="ADMIN" />);

		const dashItem = screen.getByText('Go to Dashboards');
		await user.click(dashItem);

		// last call from handleInvoke should set open to false
		expect(mockSetOpen).toHaveBeenCalledWith(false);
	});
});
