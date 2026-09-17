import { TooltipProvider } from '@signozhq/ui/tooltip';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardCursorSync } from 'lib/uPlotV2/plugins/TooltipPlugin/types';

import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';

import ViewPanelModal from '../ViewPanelModal/ViewPanelModal';
import type { Mock } from 'vitest';

// The preview reuses the edit page's PreviewPane (chart + header + heavy render
// path); stub it (capturing props) so this suite asserts the modal shell + what it
// threads down, not the preview internals (PreviewPane/PanelHeader own those).
const mockPreviewPaneRender = vi.fn();
vi.mock(
	'pages/DashboardPage/DashboardContainer/PanelEditor/PreviewPane/PreviewPane',
	() => ({
		__esModule: true,
		default: function MockPreviewPane(
			props: Record<string, unknown>,
		): ReactElement {
			mockPreviewPaneRender(props);
			return <div data-testid="preview-pane" />;
		},
	}),
);

// Isolate from the draft/query-builder plumbing (its own suite covers it).
// Real registry by default; the static-fork test overrides one kind.
vi.mock('pages/DashboardPage/DashboardContainer/Panels/registry', async () => {
	const actual = await vi.importActual<
		typeof import('pages/DashboardPage/DashboardContainer/Panels/registry')
	>('pages/DashboardPage/DashboardContainer/Panels/registry');
	return { ...actual, getPanelDefinition: vi.fn(actual.getPanelDefinition) };
});

// The shell reads the URL seed + kind switch itself; stub its collaborators so
// the suite needs no router and keeps asserting through the mocked mode hook.
vi.mock('hooks/queryBuilder/useGetCompositeQueryParam', () => ({
	useGetCompositeQueryParam: (): null => null,
}));
vi.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): URLSearchParams => new URLSearchParams(),
}));
vi.mock(
	'pages/DashboardPage/DashboardContainer/PanelEditor/hooks/usePanelTypeSwitch',
	() => ({
		usePanelTypeSwitch: (): unknown => ({ onChangePanelKind: vi.fn() }),
	}),
);

vi.mock('../ViewPanelModal/useViewPanelMode', () => ({
	useViewPanelMode: (args: {
		panel: { spec: { plugin: { kind: string } } };
	}): unknown => {
		const { kind } = args.panel.spec.plugin;
		return {
			draft: args.panel,
			panelDefinition: {
				kind,
				mode: 'query',
				actions: { search: kind === 'signoz/ListPanel' },
				Renderer: (): null => null,
				// Same testid as the real pane: the suite asserts the modal fills its
				// query-builder slot from the definition.
				EditorPane: (): JSX.Element => (
					<div data-testid="panel-editor-v2-query-builder" />
				),
			},
			query: {
				data: { response: undefined, requestPayload: undefined, legendMap: {} },
				isLoading: false,
				isFetching: false,
				error: null,
				refetch: vi.fn(),
				cancelQuery: vi.fn(),
				pagination: undefined,
			},
			runQuery: vi.fn(),
			onChangePanelKind: vi.fn(),
			resetQuery: vi.fn(),
			signal: 'logs',
			buildSaveSpec: (spec: unknown): unknown => spec,
			applyDrilldownQuery: vi.fn(),
		};
	},
}));

// Drill-down orchestration (popover, submenus, View-in-X) has its own suite
// (useDrilldown.test.tsx) and pulls in router/redux/react-query; stub it so this
// suite only asserts that the modal arms the preview and renders the menu host.
const mockOnPanelClick = vi.fn();
vi.mock('../hooks/useDrilldown', () => ({
	useDrilldown: (): unknown => ({
		enableDrillDown: true,
		onPanelClick: mockOnPanelClick,
		contextMenuProps: {
			coordinates: null,
			popoverPosition: null,
			items: null,
			onClose: vi.fn(),
		},
	}),
}));

// The View modal reuses the edit page's query builder, which reads the global
// QueryBuilder context and pulls in the ClickHouse/PromQL editors; stub it here.
vi.mock(
	'pages/DashboardPage/DashboardContainer/PanelEditor/PanelEditorQueryBuilder/PanelEditorQueryBuilder',
	() => ({
		__esModule: true,
		default: function MockPanelEditorQueryBuilder(): ReactElement {
			return <div data-testid="panel-editor-v2-query-builder" />;
		},
	}),
);

vi.mock('../hooks/usePanelInteractions', () => ({
	usePanelInteractions: (): unknown => ({
		onDragSelect: vi.fn(),
		dashboardPreference: { syncMode: 0 },
	}),
}));

// The header mounts DateTimeSelectionV2 (redux + router + heavy deps); stub it so
// this suite asserts the modal body, not the toolbar internals.
vi.mock('../ViewPanelModal/ViewPanelModalHeader', () => ({
	__esModule: true,
	default: function MockViewPanelModalHeader(): ReactElement {
		return <div data-testid="view-panel-header" />;
	},
}));

vi.mock('../ViewPanelModal/useViewPanelTimeWindow', () => ({
	useViewPanelTimeWindow: (): unknown => ({
		timeOverride: { startMs: 0, endMs: 0 },
		selectedInterval: '5m',
		onTimeChange: vi.fn(),
		refreshWindow: vi.fn(),
		onDragSelect: vi.fn(),
		extendWindow: { canExtend: false, actionLabel: null, extend: vi.fn() },
	}),
}));

const mockOpenEditor = vi.fn();
vi.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useOpenPanelEditor',
	() => ({
		useOpenPanelEditor: (): Mock => mockOpenEditor,
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
				onClose={vi.fn()}
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
				onClose={vi.fn()}
			/>,
		);
		expect(screen.getByTestId('view-panel-modal-content')).toBeInTheDocument();
		expect(screen.getByTestId('view-panel-header')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-query-builder'),
		).toBeInTheDocument();
		expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
	});

	it('invokes onClose when the modal is dismissed', () => {
		const onClose = vi.fn();
		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open
				onClose={onClose}
			/>,
		);
		// fireEvent: user-event's pointer walk races Radix's layer bookkeeping in
		// jsdom, transiently dropping the dialog's pointer-events and failing the
		// interaction check. The assertion is only that Close wires to onClose.
		fireEvent.click(screen.getByLabelText('Close'));
		expect(onClose).toHaveBeenCalled();
	});

	it('mounts the static body — editor pane, no query builder slot — for a static kind', async () => {
		mockPreviewPaneRender.mockClear();
		const actual = await vi.importActual<
			typeof import('pages/DashboardPage/DashboardContainer/Panels/registry')
		>('pages/DashboardPage/DashboardContainer/Panels/registry');
		const staticDefinition = {
			kind: 'signoz/TimeSeriesPanel',
			displayName: 'Static',
			sections: [],
			actions: {},
			mode: 'static',
			Renderer: (): null => null,
			EditorPane: (): JSX.Element => <div data-testid="static-editor-pane" />,
		};
		(getPanelDefinition as Mock).mockImplementation(
			(kind: Parameters<typeof actual.getPanelDefinition>[0]) =>
				kind === 'signoz/TimeSeriesPanel'
					? staticDefinition
					: actual.getPanelDefinition(kind),
		);

		renderWithProvider(
			<ViewPanelModal
				panel={makePanel('signoz/TimeSeriesPanel')}
				panelId="p1"
				open
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByTestId('view-panel-header')).toBeInTheDocument();
		expect(screen.getByTestId('static-editor-pane')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-query-builder'),
		).not.toBeInTheDocument();
		// One PreviewPane serves both arms; the static body asks it for the static one.
		expect(mockPreviewPaneRender).toHaveBeenLastCalledWith(
			expect.objectContaining({ mode: 'static' }),
		);

		(getPanelDefinition as Mock).mockImplementation(actual.getPanelDefinition);
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
				onClose={vi.fn()}
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
				onClose={vi.fn()}
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
