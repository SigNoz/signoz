/**
 * src/components/cmdKPalette/__test__/cmdkPalette.test.tsx
 */
// ---- Mocks (must run BEFORE importing the component) ----
import ROUTES from 'constants/routes';
import history from 'lib/history';
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
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	delete (HTMLElement.prototype as any).scrollIntoView;
});

// mock history.push / replace / go / location
jest.mock('lib/history', () => {
	const location = { pathname: '/', search: '', hash: '' };

	const stack: { pathname: string; search: string }[] = [
		{ pathname: '/', search: '' },
	];

	const push = jest.fn((path: string) => {
		const [rawPath, rawQuery] = path.split('?');
		const pathname = rawPath || '/';
		const search = path.includes('?') ? `?${rawQuery || ''}` : '';

		location.pathname = pathname;
		location.search = search;

		stack.push({ pathname, search });
		return undefined;
	});

	const replace = jest.fn((path: string) => {
		const [rawPath, rawQuery] = path.split('?');
		const pathname = rawPath || '/';
		const search = path.includes('?') ? `?${rawQuery || ''}` : '';

		location.pathname = pathname;
		location.search = search;

		if (stack.length > 0) {
			stack[stack.length - 1] = { pathname, search };
		} else {
			stack.push({ pathname, search });
		}
		return undefined;
	});

	const listen = jest.fn();
	const go = jest.fn((n: number) => {
		if (n < 0 && stack.length > 1) {
			stack.pop();
		}
		const top = stack[stack.length - 1] || { pathname: '/', search: '' };
		location.pathname = top.pathname;
		location.search = top.search;
	});

	return {
		push,
		replace,
		listen,
		go,
		location,
		__stack: stack,
	};
});

// Mock ResizeObserver for Jest/jsdom
class ResizeObserver {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, class-methods-use-this
	observe() {}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, class-methods-use-this
	unobserve() {}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, class-methods-use-this
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
jest.mock('api/common/logEvent', () => jest.fn());
jest.mock('api/browser/localstorage/set', () => jest.fn());
jest.mock('utils/error', () => ({ showErrorNotification: jest.fn() }));

// ---- Tests ----
describe('CmdKPalette', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('renders navigation and settings groups and items', () => {
		render(<CmdKPalette userRole="ADMIN" />);

		expect(screen.getByText('Navigation')).toBeInTheDocument();
		expect(screen.getByText('Settings')).toBeInTheDocument();

		expect(screen.getByText(HOME_LABEL)).toBeInTheDocument();
		expect(screen.getByText('Go to Dashboards')).toBeInTheDocument();
		expect(screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
	});

	test('clicking a navigation item calls history.push with correct route', async () => {
		render(<CmdKPalette userRole="ADMIN" />);

		const homeItem = screen.getByText(HOME_LABEL);
		await userEvent.click(homeItem);

		expect(history.push).toHaveBeenCalledWith(ROUTES.HOME);
	});

	test('role-based filtering (basic smoke)', () => {
		render(<CmdKPalette userRole="VIEWER" />);

		// VIEWER still sees basic navigation items
		expect(screen.getByText(HOME_LABEL)).toBeInTheDocument();
	});

	test('keyboard shortcut opens palette via setOpen', () => {
		render(<CmdKPalette userRole="ADMIN" />);

		const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
		window.dispatchEvent(event);

		expect(mockSetOpen).toHaveBeenCalledWith(true);
	});

	test('items render with icons when provided', () => {
		render(<CmdKPalette userRole="ADMIN" />);

		const iconHolders = document.querySelectorAll('.cmd-item-icon');
		expect(iconHolders.length).toBeGreaterThan(0);
		expect(screen.getByText(HOME_LABEL)).toBeInTheDocument();
	});

	test('closing the palette via handleInvoke sets open to false', async () => {
		render(<CmdKPalette userRole="ADMIN" />);

		const dashItem = screen.getByText('Go to Dashboards');
		await userEvent.click(dashItem);

		// last call from handleInvoke should set open to false
		expect(mockSetOpen).toHaveBeenCalledWith(false);
	});
});
