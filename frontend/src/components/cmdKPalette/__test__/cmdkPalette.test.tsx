/**
 * src/components/cmdKPalette/__test__/cmdkPalette.test.tsx
 */
// ---- Mocks (must run BEFORE importing the component) ----
import ROUTES from 'constants/routes';
import { createShortcutActions } from 'constants/shortcutActions';
import history from 'lib/history';
import { render, screen, userEvent } from 'tests/test-utils';

import '@testing-library/jest-dom/extend-expect';

import { CmdKPalette, getActiveSectionFromActions } from '../cmdKPalette';

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
jest.mock('api/common/logEvent', () => jest.fn());
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

	it('clicking a navigation item calls history.push with correct route', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<CmdKPalette userRole="ADMIN" />);

		const homeItem = screen.getByText(HOME_LABEL);
		await user.click(homeItem);

		expect(history.push).toHaveBeenCalledWith(ROUTES.HOME);
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

// ---- getActiveSectionFromActions unit tests ----
const mockActions = createShortcutActions({
	navigate: jest.fn(),
	handleThemeChange: jest.fn(),
});

describe('getActiveSectionFromActions', () => {
	test('returns Settings for /settings paths', () => {
		expect(getActiveSectionFromActions('/settings', mockActions)).toBe(
			'Settings',
		);
		expect(
			getActiveSectionFromActions('/settings/my-settings', mockActions),
		).toBe('Settings');
		expect(getActiveSectionFromActions('/settings/billing', mockActions)).toBe(
			'Settings',
		);
	});

	test('returns Logs for /logs paths', () => {
		expect(getActiveSectionFromActions('/logs', mockActions)).toBe('Logs');
		expect(getActiveSectionFromActions('/logs/logs-explorer', mockActions)).toBe(
			'Logs',
		);
		expect(getActiveSectionFromActions('/logs/pipelines', mockActions)).toBe(
			'Logs',
		);
	});

	test('returns Traces for /traces paths', () => {
		// /traces-explorer – main explorer page (different URL pattern than sub-pages)
		expect(getActiveSectionFromActions('/traces-explorer', mockActions)).toBe(
			'Traces',
		);
		// /traces/* – sub-pages share the /traces/ prefix
		expect(getActiveSectionFromActions('/traces/saved-views', mockActions)).toBe(
			'Traces',
		);
		expect(getActiveSectionFromActions('/traces/funnels', mockActions)).toBe(
			'Traces',
		);
	});

	test('returns Metrics for /metrics-explorer paths', () => {
		expect(
			getActiveSectionFromActions('/metrics-explorer/summary', mockActions),
		).toBe('Metrics');
	});

	test('returns Navigation for top-level module paths', () => {
		expect(getActiveSectionFromActions('/home', mockActions)).toBe('Navigation');
		expect(getActiveSectionFromActions('/services', mockActions)).toBe(
			'Navigation',
		);
		expect(getActiveSectionFromActions('/dashboard', mockActions)).toBe(
			'Navigation',
		);
		expect(getActiveSectionFromActions('/alerts', mockActions)).toBe(
			'Navigation',
		);
		expect(getActiveSectionFromActions('/exceptions', mockActions)).toBe(
			'Navigation',
		);
		expect(
			getActiveSectionFromActions('/messaging-queues/overview', mockActions),
		).toBe('Navigation');
	});

	test('returns null for unrecognized paths', () => {
		expect(getActiveSectionFromActions('/', mockActions)).toBeNull();
		expect(getActiveSectionFromActions('/unknown-page', mockActions)).toBeNull();
	});

	test('returns null when actions have no routePrefix', () => {
		const noPrefix = [{ id: 'x', name: 'X', section: 'S', perform: jest.fn() }];
		expect(getActiveSectionFromActions('/anything', noPrefix)).toBeNull();
	});
});
// ---- contextual prioritization integration tests ----
describe('CmdKPalette contextual prioritization', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('Settings section appears first when on /settings route', () => {
		render(<CmdKPalette userRole="ADMIN" />, undefined, {
			initialRoute: '/settings/my-settings',
		});

		const groups = document.querySelectorAll('[cmdk-group]');
		const sectionOrder = Array.from(groups).map((g) =>
			g.getAttribute('data-value'),
		);

		// Settings should be the first section
		expect(sectionOrder[0]).toBe('Settings');
	});

	test('Logs section appears first when on /logs route', () => {
		render(<CmdKPalette userRole="ADMIN" />, undefined, {
			initialRoute: '/logs/logs-explorer',
		});

		const groups = document.querySelectorAll('[cmdk-group]');
		const sectionOrder = Array.from(groups).map((g) =>
			g.getAttribute('data-value'),
		);

		expect(sectionOrder[0]).toBe('Logs');
	});

	test('Navigation section stays first when on / (no match)', () => {
		render(<CmdKPalette userRole="ADMIN" />, undefined, {
			initialRoute: '/',
		});

		const groups = document.querySelectorAll('[cmdk-group]');
		const sectionOrder = Array.from(groups).map((g) =>
			g.getAttribute('data-value'),
		);

		// Default order: Navigation is first since no active section matched
		expect(sectionOrder[0]).toBe('Navigation');
	});

	test('Traces section appears first when on /traces-explorer route', () => {
		render(<CmdKPalette userRole="ADMIN" />, undefined, {
			initialRoute: '/traces-explorer',
		});

		const groups = document.querySelectorAll('[cmdk-group]');
		const sectionOrder = Array.from(groups).map((g) =>
			g.getAttribute('data-value'),
		);

		expect(sectionOrder[0]).toBe('Traces');
	});

	test('Traces section appears first when on /traces/funnels route', () => {
		render(<CmdKPalette userRole="ADMIN" />, undefined, {
			initialRoute: '/traces/funnels',
		});

		const groups = document.querySelectorAll('[cmdk-group]');
		const sectionOrder = Array.from(groups).map((g) =>
			g.getAttribute('data-value'),
		);

		expect(sectionOrder[0]).toBe('Traces');
	});

	test('Traces section appears first when on /traces/saved-views route', () => {
		render(<CmdKPalette userRole="ADMIN" />, undefined, {
			initialRoute: '/traces/saved-views',
		});

		const groups = document.querySelectorAll('[cmdk-group]');
		const sectionOrder = Array.from(groups).map((g) =>
			g.getAttribute('data-value'),
		);

		expect(sectionOrder[0]).toBe('Traces');
	});

	test('Metrics section appears first when on /metrics-explorer route', () => {
		render(<CmdKPalette userRole="ADMIN" />, undefined, {
			initialRoute: '/metrics-explorer/summary',
		});

		const groups = document.querySelectorAll('[cmdk-group]');
		const sectionOrder = Array.from(groups).map((g) =>
			g.getAttribute('data-value'),
		);

		expect(sectionOrder[0]).toBe('Metrics');
	});
});
