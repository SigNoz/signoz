import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import ViewPanelModal from '../ViewPanelModal/ViewPanelModal';

// The preview reuses the edit page's PreviewPane (chart + header + heavy render
// path); stub it (capturing props) so this suite asserts the modal shell + what it
// threads down, not the preview internals (PreviewPane/PanelHeader own those).
const mockPreviewPaneRender = jest.fn();
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/PanelEditor/PreviewPane/PreviewPane',
	() =>
		function MockPreviewPane(props: Record<string, unknown>): ReactElement {
			mockPreviewPaneRender(props);
			return <div data-testid="preview-pane" />;
		},
);

// Isolate from the draft/query-builder plumbing (its own suite covers it).
jest.mock('../ViewPanelModal/useViewPanelMode', () => ({
	useViewPanelMode: (args: {
		panel: { spec: { plugin: { kind: string } } };
	}): unknown => {
		const { kind } = args.panel.spec.plugin;
		return {
			draft: args.panel,
			panelDefinition: {
				kind,
				actions: { search: kind === 'signoz/ListPanel' },
				Renderer: (): null => null,
			},
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
			signal: 'logs',
			buildSaveSpec: (spec: unknown): unknown => spec,
			applyDrilldownQuery: jest.fn(),
		};
	},
}));

// Drill-down orchestration (popover, submenus, View-in-X) has its own suite
// (useDrilldown.test.tsx) and pulls in router/redux/react-query; stub it so this
// suite only asserts that the modal arms the preview and renders the menu host.
const mockOnPanelClick = jest.fn();
jest.mock('../hooks/useDrilldown', () => ({
	useDrilldown: (): unknown => ({
		enableDrillDown: true,
		onPanelClick: mockOnPanelClick,
		contextMenuProps: {
			coordinates: null,
			popoverPosition: null,
			items: null,
			onClose: jest.fn(),
		},
	}),
}));

// The View modal reuses the edit page's query builder, which reads the global
// QueryBuilder context and pulls in the ClickHouse/PromQL editors; stub it here.
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/PanelEditorQueryBuilder',
	() =>
		function MockPanelEditorQueryBuilder(): ReactElement {
			return <div data-testid="panel-editor-v2-query-builder" />;
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
		extendWindow: { canExtend: false, actionLabel: null, extend: jest.fn() },
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

	it('renders the header, query builder, and preview when open', () => {
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel', 'CPU usage')}
				panelId="p1"
				open
				onClose={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('view-panel-modal-content')).toBeInTheDocument();
		expect(screen.getByTestId('view-panel-header')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-query-builder'),
		).toBeInTheDocument();
		expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
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
		mockPreviewPaneRender.mockClear();
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open
				onClose={jest.fn()}
			/>,
		);
		const props = mockPreviewPaneRender.mock.calls.at(-1)?.[0] as {
			dashboardPreference?: { syncMode?: unknown };
		};
		expect(props.dashboardPreference?.syncMode).toBe(DashboardCursorSync.None);
	});

	// Parity with the grid: the View modal arms the same drill-down click on the preview.
	it('arms drill-down on the preview', () => {
		mockPreviewPaneRender.mockClear();
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open
				onClose={jest.fn()}
			/>,
		);
		const props = mockPreviewPaneRender.mock.calls.at(-1)?.[0] as {
			onClick?: unknown;
			enableDrillDown?: boolean;
		};
		expect(props.enableDrillDown).toBe(true);
		expect(props.onClick).toBe(mockOnPanelClick);
	});
});
