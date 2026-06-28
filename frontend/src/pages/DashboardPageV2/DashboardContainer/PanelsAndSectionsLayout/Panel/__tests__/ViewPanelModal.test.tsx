import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import ViewPanelModal from '../ViewPanelModal/ViewPanelModal';

// PanelBody pulls in the full render path; stub it (capturing props) so this suite
// asserts the modal shell + the props it threads down, not the chart.
const mockPanelBodyRender = jest.fn();
jest.mock(
	'../PanelBody/PanelBody',
	() =>
		function MockPanelBody(props: Record<string, unknown>): ReactElement {
			mockPanelBodyRender(props);
			return <div data-testid="panel-body" />;
		},
);

// Isolate from the draft/query-builder plumbing (its own suite covers it). Derive
// `actions.search` from the panel kind so the search-box assertions still hold.
jest.mock('../ViewPanelModal/useViewPanelEditor', () => ({
	useViewPanelEditor: (args: {
		panel: { spec: { plugin: { kind: string } } };
	}): unknown => {
		const { kind } = args.panel.spec.plugin;
		return {
			draft: args.panel,
			panelDefinition: {
				kind,
				actions: {
					search: kind === 'signoz/ListPanel' || kind === 'signoz/TablePanel',
				},
				Renderer: (): null => null,
			},
			panelType: 'graph',
			query: {
				data: { response: undefined, requestPayload: undefined, legendMap: {} },
				isLoading: false,
				isFetching: false,
				error: null,
				refetch: jest.fn(),
				cancelQuery: jest.fn(),
				pagination: undefined,
			},
			runQuery: jest.fn(),
			onChangePanelKind: jest.fn(),
			resetQuery: jest.fn(),
			signal: undefined,
			buildSaveSpec: (spec: unknown): unknown => spec,
		};
	},
}));

// The query builder reads the global QueryBuilder context; stub it here.
jest.mock(
	'../ViewPanelModal/ViewPanelQueryBuilder',
	() =>
		function MockViewPanelQueryBuilder(): ReactElement {
			return <div data-testid="view-panel-query-builder" />;
		},
);

jest.mock('../hooks/usePanelInteractions', () => ({
	usePanelInteractions: (): unknown => ({
		onDragSelect: jest.fn(),
		dashboardPreference: { syncMode: 0 },
	}),
}));

// The header mounts DateTimeSelectionV2 (redux + router + heavy deps); stub it so
// this suite asserts the modal body, not the toolbar internals.
jest.mock(
	'../ViewPanelModal/ViewPanelModalHeader',
	() =>
		function MockViewPanelModalHeader(): ReactElement {
			return <div data-testid="view-panel-header" />;
		},
);

jest.mock('../ViewPanelModal/useViewPanelTimeWindow', () => ({
	useViewPanelTimeWindow: (): unknown => ({
		timeOverride: { startMs: 0, endMs: 0 },
		selectedInterval: '5m',
		onTimeChange: jest.fn(),
		refreshWindow: jest.fn(),
		onDragSelect: jest.fn(),
	}),
}));

const mockOpenEditor = jest.fn();
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/hooks/useOpenPanelEditor',
	() => ({
		useOpenPanelEditor: (): jest.Mock => mockOpenEditor,
	}),
);

const renderWithProvider = (ui: ReactElement): ReturnType<typeof render> =>
	render(<TooltipProvider>{ui}</TooltipProvider>);

function makePanel(kind: string, name = 'My panel'): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name },
			plugin: { kind, spec: {} },
			queries: [],
		},
	} as unknown as DashboardtypesPanelDTO;
}

describe('ViewPanelModal', () => {
	it('renders nothing until opened', () => {
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open={false}
				onClose={jest.fn()}
			/>,
		);
		expect(
			screen.queryByTestId('view-panel-modal-content'),
		).not.toBeInTheDocument();
	});

	it('renders the panel name and body when open', () => {
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel', 'CPU usage')}
				panelId="p1"
				open
				onClose={jest.fn()}
			/>,
		);
		expect(screen.getByText('CPU usage')).toBeInTheDocument();
		expect(screen.getByTestId('view-panel-modal-content')).toBeInTheDocument();
		expect(screen.getByTestId('view-panel-header')).toBeInTheDocument();
		expect(screen.getByTestId('view-panel-query-builder')).toBeInTheDocument();
		expect(screen.getByTestId('panel-body')).toBeInTheDocument();
	});

	it('omits the search box for non-tabular kinds', () => {
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open
				onClose={jest.fn()}
			/>,
		);
		expect(
			screen.queryByTestId('panel-header-search-trigger'),
		).not.toBeInTheDocument();
	});

	it('renders the search box for list/table kinds', () => {
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/ListPanel')}
				panelId="p1"
				open
				onClose={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('panel-header-search-trigger')).toBeInTheDocument();
	});

	it('invokes onClose when the modal is dismissed', async () => {
		const user = userEvent.setup();
		const onClose = jest.fn();
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open
				onClose={onClose}
			/>,
		);
		await user.click(screen.getByLabelText('Close'));
		expect(onClose).toHaveBeenCalled();
	});

	// Charts share one global cursor-sync key and uPlot replays drag across the
	// group; the modal must opt out so a drag here can't move the dashboard's time.
	it('opts the chart out of the dashboard cursor-sync group', () => {
		mockPanelBodyRender.mockClear();
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open
				onClose={jest.fn()}
			/>,
		);
		const props = mockPanelBodyRender.mock.calls.at(-1)?.[0] as {
			dashboardPreference?: { syncMode?: unknown };
		};
		expect(props.dashboardPreference?.syncMode).toBe(DashboardCursorSync.None);
	});
});
