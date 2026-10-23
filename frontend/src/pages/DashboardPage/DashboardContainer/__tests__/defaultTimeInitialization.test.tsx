import { StrictMode, type ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { createMemoryHistory } from 'history';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	__resetSearchParamsGetter,
	__setSearchParamsGetterForTest,
	getUnstableCurrentSearchParams,
} from 'utils/getUnstableCurrentSearchParams';

import DashboardContainer from '../index';

// The repository's default navigation mock is a no-op; these cases need history updates.
jest.mock('hooks/useSafeNavigate', () =>
	jest
		.requireActual('tests/browser-history-safe-navigate')
		.createBrowserHistorySafeNavigateMock(),
);

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

function mountDashboard(search = '', duration = '1h') {
	const history = createMemoryHistory({ initialEntries: [`${PATH}${search}`] });
	__setSearchParamsGetterForTest(
		() => new URLSearchParams(history.location.search),
	);
	const view = (data: DashboardtypesGettableDashboardV2DTO): JSX.Element => (
		<StrictMode>
			<Router history={history}>
				<CompatRouter>
					<DashboardContainer dashboard={data} refetch={refetch} />
				</CompatRouter>
			</Router>
		</StrictMode>
	);
	const result = render(view(dashboard(duration)));
	return {
		history,
		...result,
		update: (data: DashboardtypesGettableDashboardV2DTO): void =>
			result.rerender(view(data)),
	};
}

describe('dashboard default time initialization', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
	});
	afterEach(() => {
		__resetSearchParamsGetter();
	});

	it('writes the default before the selector and panels first mount, replacing history', () => {
		const { history } = mountDashboard('?variables=selected&tab=overview');
		expect(screen.getByTestId('time-selector')).toBeInTheDocument();
		expect(screen.getByTestId('panels')).toBeInTheDocument();
		for (const mounted of [mockSelectorMount, mockPanelMount]) {
			expect(mounted).toHaveBeenCalled();
			for (const [search] of mounted.mock.calls) {
				expect(new URLSearchParams(search).get('relativeTime')).toBe('1h');
			}
		}
		expect(history.location.search).toContain('variables=selected');
		expect(history.location.search).toContain('tab=overview');
		expect(history.entries).toHaveLength(1);
		expect(history.action).toBe('REPLACE');
	});

	it.each([
		'?relativeTime=15m',
		'?startTime=1000&endTime=2000',
		'?startTime=1000',
		'?endTime=2000',
	])('preserves explicit URL time %s', (search) => {
		const { history } = mountDashboard(search);
		expect(history.location.search).toBe(search);
		expect(mockSelectorMount.mock.calls[0][0]).toBe(search.slice(1));
	});

	it.each(['1d', JSON.stringify({ startTime: 1000, endTime: 2000 })])(
		'leaves a saved route preference %s for the shared selector',
		(saved) => {
			localStorage.setItem(
				LOCALSTORAGE.METRICS_TIME_IN_DURATION,
				JSON.stringify({ [PATH]: saved }),
			);
			const { history } = mountDashboard();
			expect(history.location.search).toBe('');
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
		const { history } = mountDashboard();
		expect(history.location.search).toBe('?relativeTime=1h');
	});

	it.each(['', '0m', '1h30m', '15s', 'invalid'])(
		'keeps the normal selector flow for unsupported default %s',
		(duration) => {
			const { history } = mountDashboard('', duration);
			expect(history.location.search).toBe('');
			expect(screen.getByTestId('time-selector')).toBeInTheDocument();
		},
	);

	it('does not reset a current selection when settings refetch', () => {
		const { history, update } = mountDashboard();
		act(() => history.replace(`${PATH}?relativeTime=15m`));
		update(dashboard('1w'));
		expect(history.location.search).toBe('?relativeTime=15m');
	});

	it('initializes a different dashboard before mounting its children', () => {
		const { history, update } = mountDashboard();
		mockSelectorMount.mockClear();
		mockPanelMount.mockClear();
		act(() => {
			history.push('/dashboard/other');
			update(dashboard('1w', 'other'));
		});
		expect(history.location.search).toBe('?relativeTime=1w');
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
