import { MemoryRouter } from 'react-router-dom-v5-compat';
import * as panelTypesQueryParamHooks from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { fireEvent, render, screen } from 'tests/test-utils';

import LogsExplorer from '../index';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.LOGS_EXPLORER}`,
	}),
}));

jest.mock(
	'container/Toolbar/Toolbar',
	() =>
		function Toolbar({
			showLiveLogs,
			onGoLive,
		}: {
			showLiveLogs?: boolean;
			onGoLive?: () => void;
		}): JSX.Element {
			return (
				<div>
					<button type="button" data-testid="go-live" onClick={onGoLive}>
						Live
					</button>
					<span data-testid="live-state">{showLiveLogs ? 'live' : 'not-live'}</span>
				</div>
			);
		},
);

jest.mock(
	'container/TimeSeriesView/TimeSeriesView',
	() =>
		function TimeSeriesView(): JSX.Element {
			return <div>Time Series Chart</div>;
		},
);

jest.mock(
	'container/LogsExplorerChart',
	() =>
		function LogsExplorerChart(): JSX.Element {
			return <div>Frequency chart content</div>;
		},
);

jest.mock('container/LiveLogs/LiveLogsContainer', () => ({
	__esModule: true,
	default: (): JSX.Element => <div>Live logs</div>,
}));

jest.mock('constants/panelTypes', () => ({
	AVAILABLE_EXPORT_PANEL_TYPES: ['graph', 'table'],
}));

jest.mock('d3-interpolate', () => ({
	interpolate: jest.fn(),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('providers/preferences/sync/usePreferenceSync', () => ({
	usePreferenceSync: (): unknown => ({
		preferences: {
			columns: [],
			formatting: { maxLines: 1, format: 'table', fontSize: 'small', version: 1 },
		},
		loading: false,
		error: null,
		updateColumns: jest.fn(),
		updateFormatting: jest.fn(),
	}),
}));

function page(): JSX.Element {
	return (
		<MemoryRouter initialEntries={[ROUTES.LOGS_EXPLORER]}>
			<PreferenceContextProvider>
				<LogsExplorer />
			</PreferenceContextProvider>
		</MemoryRouter>
	);
}

describe('Logs Explorer live mode', () => {
	// useLocation is mocked without a search string, so the tab is driven
	// through the hook that reads it from the url.
	const panelTypeSpy = jest.spyOn(
		panelTypesQueryParamHooks,
		'useGetPanelTypesQueryParam',
	);

	afterAll(() => {
		panelTypeSpy.mockRestore();
	});

	it('ends when the url moves off the list tab, whatever moved it', () => {
		panelTypeSpy.mockReturnValue(PANEL_TYPES.LIST);
		const { rerender } = render(page());

		fireEvent.click(screen.getByTestId('go-live'));
		expect(screen.getByTestId('live-state')).toHaveTextContent('live');

		panelTypeSpy.mockReturnValue(PANEL_TYPES.TIME_SERIES);
		rerender(page());

		expect(screen.getByTestId('live-state')).toHaveTextContent('not-live');
	});

	it('stays on while the url keeps the list tab', () => {
		panelTypeSpy.mockReturnValue(PANEL_TYPES.LIST);
		const { rerender } = render(page());

		fireEvent.click(screen.getByTestId('go-live'));
		rerender(page());

		expect(screen.getByTestId('live-state')).toHaveTextContent('live');
	});
});
