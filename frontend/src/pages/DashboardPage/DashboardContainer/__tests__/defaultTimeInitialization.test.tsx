import { StrictMode, type ReactNode } from 'react';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import { getCurrentLocation, navigate } from 'lib/router/navigation';
import { act, render, screen } from 'tests/test-utils';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

import DashboardContainer from '../index';

const mockUpdateTimeInterval = jest.fn();
jest.mock('store/actions', () => ({
	...jest.requireActual('store/actions'),
	UpdateTimeInterval: (...args: unknown[]): (() => void) => {
		mockUpdateTimeInterval(...args);
		return (): void => {};
	},
}));

const mockSelectorMount = jest.fn();
const mockPanelMount = jest.fn();
const mockStore = { resetVariableFetch: jest.fn(), setEditContext: jest.fn() };
jest.mock('../store/useDashboardStore', () => ({
	useDashboardStore: (selector: (state: typeof mockStore) => unknown): unknown =>
		selector(mockStore),
}));
jest.mock('../hooks/useResolvedVariables', () => ({
	useResolvedVariables: jest.fn(),
}));
jest.mock('../hooks/useSyncVariablesForSuggestions', () => ({
	useSyncVariablesForSuggestions: jest.fn(),
}));
jest.mock('../hooks/useDashboardStaleCheck', () => ({
	useDashboardStaleCheck: (): object => ({
		showPrompt: false,
		reload: jest.fn(),
		dismiss: jest.fn(),
	}),
}));
jest.mock('../dashboardIcons', () => ({
	resolveDashboardImage: (): string => '',
}));
jest.mock('react-full-screen', () => ({
	FullScreen: ({ children }: { children: ReactNode }): ReactNode => children,
	useFullScreenHandle: (): object => ({ active: false }),
}));
jest.mock('../DashboardPageToolbar', () => ({
	__esModule: true,
	default: (): JSX.Element => {
		mockSelectorMount(getUnstableCurrentSearchParams().toString());
		return <div data-testid="time-selector" />;
	},
}));
jest.mock('../PanelsAndSectionsLayout', () => ({
	__esModule: true,
	default: (): JSX.Element => {
		mockPanelMount(getUnstableCurrentSearchParams().toString());
		return <div data-testid="panels" />;
	},
}));
jest.mock('../components/DashboardPageHeader/DashboardPageHeader', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('../components/LockedIndicator/LockedIndicator', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock(
	'../components/DashboardChangedDialog/DashboardChangedDialog',
	() => ({ __esModule: true, default: (): null => null }),
);
jest.mock('container/TopNav/AutoRefreshV2/AutoRefreshTicker', () => ({
	__esModule: true,
	default: (): null => null,
}));

const PATH = '/dashboard/abc';
const refetch = jest.fn();

function dashboard(
	duration = '1h',
	id = 'abc',
): DashboardtypesGettableDashboardV2DTO {
	return {
		id,
		name: id,
		orgId: 'org',
		source: DashboardtypesSourceDTO.user,
		locked: false,
		schemaVersion: 'v6',
		tags: [],
		spec: {
			display: { name: id },
			duration,
			layouts: [],
			panels: {},
			variables: [],
		},
	};
}

function view(data: DashboardtypesGettableDashboardV2DTO): JSX.Element {
	return (
		<StrictMode>
			<DashboardContainer dashboard={data} refetch={refetch} />
		</StrictMode>
	);
}

function mountDashboard(
	search = '',
	duration = '1h',
): ReturnType<typeof render> & {
	update: (data: DashboardtypesGettableDashboardV2DTO) => void;
} {
	const result = render(view(dashboard(duration)), undefined, {
		initialRoute: `${PATH}${search}`,
	});
	return {
		...result,
		update: (data): void => result.rerender(view(data)),
	};
}

describe('dashboard default time initialization', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
	});

	it('writes the default before the selector and panels first mount, replacing history', () => {
		const historyLength = window.history.length;
		mountDashboard('?variables=selected&tab=overview');
		expect(screen.getByTestId('time-selector')).toBeInTheDocument();
		expect(screen.getByTestId('panels')).toBeInTheDocument();
		for (const mounted of [mockSelectorMount, mockPanelMount]) {
			expect(mounted).toHaveBeenCalled();
			for (const [search] of mounted.mock.calls) {
				expect(new URLSearchParams(search).get('relativeTime')).toBe('1h');
			}
		}
		const params = new URLSearchParams(getCurrentLocation().search);
		expect(params.get('variables')).toBe('selected');
		expect(params.get('tab')).toBe('overview');
		expect(window.history).toHaveLength(historyLength);
	});

	it.each([
		'?relativeTime=15m',
		'?startTime=1000&endTime=2000',
		'?startTime=1000',
		'?endTime=2000',
	])('preserves explicit URL time %s', (search) => {
		mountDashboard(search);
		expect(getCurrentLocation().search).toBe(search);
		expect(mockSelectorMount.mock.calls[0][0]).toBe(search.slice(1));
	});

	it.each(['1d', JSON.stringify({ startTime: 1000, endTime: 2000 })])(
		'leaves a saved route preference %s for the shared selector',
		(saved) => {
			localStorage.setItem(
				LOCALSTORAGE.METRICS_TIME_IN_DURATION,
				JSON.stringify({ [PATH]: saved }),
			);
			mountDashboard();
			expect(getCurrentLocation().search).toBe('');
			expect(
				JSON.parse(
					localStorage.getItem(LOCALSTORAGE.METRICS_TIME_IN_DURATION) ?? '{}',
				)[PATH],
			).toBe(saved);
			expect(mockSelectorMount.mock.calls[0][0]).toBe('');
		},
	);

	it('does not use preferences from another dashboard', () => {
		localStorage.setItem(
			LOCALSTORAGE.METRICS_TIME_IN_DURATION,
			JSON.stringify({ '/dashboard/other': '1d' }),
		);
		mountDashboard();
		expect(getCurrentLocation().search).toBe('?relativeTime=1h');
	});

	it.each([
		['1h30m', '90m'],
		['120m', '2h'],
		['14d', '2w'],
		['1y', '365d'],
		['15s', '1m'],
		['90s', '2m'],
		['500ms', '1m'],
	])('opens a %s default as %s, in whole minutes', (duration, relativeTime) => {
		mountDashboard('', duration);
		expect(getCurrentLocation().search).toBe(`?relativeTime=${relativeTime}`);
	});

	it.each(['', '0m', '0s', 'invalid'])(
		'keeps the normal selector flow for unusable default %s',
		(duration) => {
			mountDashboard('', duration);
			expect(getCurrentLocation().search).toBe('');
			expect(screen.getByTestId('time-selector')).toBeInTheDocument();
		},
	);

	it('does not reset a current selection when settings refetch', () => {
		const { update } = mountDashboard();
		act(() => navigate(`${PATH}?relativeTime=15m`, { replace: true }));
		update(dashboard('1w'));
		expect(getCurrentLocation().search).toBe('?relativeTime=15m');
		expect(mockUpdateTimeInterval).not.toHaveBeenCalled();
	});

	it('moves a viewer still on the old default to a changed one', () => {
		const { update } = mountDashboard();
		update(dashboard('1d'));
		expect(getCurrentLocation().search).toBe('?relativeTime=1d');
		expect(mockUpdateTimeInterval).toHaveBeenCalledWith('1d');
	});

	it('moves a viewer to 30 minutes when the default is cleared', () => {
		const { update } = mountDashboard();
		update(dashboard(''));
		expect(getCurrentLocation().search).toBe('?relativeTime=30m');
		expect(mockUpdateTimeInterval).toHaveBeenCalledWith('30m');
	});

	it('moves a viewer off 30 minutes when a default is first set', () => {
		const { update } = mountDashboard('?relativeTime=30m', '');
		update(dashboard('1d'));
		expect(getCurrentLocation().search).toBe('?relativeTime=1d');
		expect(mockUpdateTimeInterval).toHaveBeenCalledWith('1d');
	});

	it('keeps the time a viewer picked when the default changes', () => {
		const { update } = mountDashboard();
		localStorage.setItem(
			LOCALSTORAGE.METRICS_TIME_IN_DURATION,
			JSON.stringify({ [PATH]: '1h' }),
		);
		update(dashboard('1d'));
		expect(getCurrentLocation().search).toBe('?relativeTime=1h');
		expect(mockUpdateTimeInterval).not.toHaveBeenCalled();
	});

	it('initializes a different dashboard before mounting its children', () => {
		const { update } = mountDashboard();
		mockSelectorMount.mockClear();
		mockPanelMount.mockClear();
		act(() => {
			navigate('/dashboard/other');
			update(dashboard('1w', 'other'));
		});
		expect(getCurrentLocation().search).toBe('?relativeTime=1w');
		expect(mockSelectorMount).toHaveBeenCalled();
		expect(mockPanelMount).toHaveBeenCalled();
		expect(
			mockSelectorMount.mock.calls.every(
				([search]) => new URLSearchParams(search).get('relativeTime') === '1w',
			),
		).toBe(true);
		expect(
			mockPanelMount.mock.calls.every(
				([search]) => new URLSearchParams(search).get('relativeTime') === '1w',
			),
		).toBe(true);
	});
});
