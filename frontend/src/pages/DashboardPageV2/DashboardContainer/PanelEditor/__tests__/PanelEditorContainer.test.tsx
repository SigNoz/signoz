import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';

import PanelEditorContainer from '../index';
import { useScrollIntoViewStore } from '../../store/useScrollIntoViewStore';

/**
 * Characterization test for the editor's composition: which derived values and
 * options it forwards to the draft/query/query-sync/type-switch hooks and to its
 * children. The leaf hooks are mocked as arg-capturing spies so this pins the
 * wiring; it stays valid (and guards behavior) after that wiring is pulled into a
 * shared edit-session hook, since the mocks intercept the leaf hooks either way.
 */

const mockSetSpec = jest.fn();
const mockRefetch = jest.fn();
const mockCancelQuery = jest.fn();
const mockBuildSaveSpec = jest.fn((spec: unknown) => spec);
const mockOnChangePanelKind = jest.fn();
const mockSave = jest.fn().mockResolvedValue('panel-1');

const mockUseDraft = jest.fn();
jest.mock('../hooks/usePanelEditorDraft', () => ({
	usePanelEditorDraft: (panel: unknown): unknown => mockUseDraft(panel),
}));

const mockUseQuery = jest.fn();
jest.mock('../../hooks/usePanelQuery', () => ({
	usePanelQuery: (args: unknown): unknown => mockUseQuery(args),
}));

const mockUseQuerySync = jest.fn();
jest.mock('../hooks/usePanelEditorQuerySync', () => ({
	usePanelEditorQuerySync: (args: unknown): unknown => mockUseQuerySync(args),
}));

const mockUseTypeSwitch = jest.fn();
jest.mock('../hooks/usePanelTypeSwitch', () => ({
	usePanelTypeSwitch: (args: unknown): unknown => mockUseTypeSwitch(args),
}));

jest.mock('../hooks/usePanelEditorSave', () => ({
	usePanelEditorSave: (): unknown => ({ save: mockSave, isSaving: false }),
}));

jest.mock('../hooks/useSwitchColumnsOnSignalChange', () => ({
	useSwitchColumnsOnSignalChange: jest.fn(),
}));
const mockOnSwitchToView = jest.fn();
jest.mock('../hooks/useSwitchToViewMode', () => ({
	useSwitchToViewMode: (): (() => void) => mockOnSwitchToView,
}));
jest.mock('../hooks/useSeedNewListColumns', () => ({
	useSeedNewListColumns: jest.fn(),
}));
jest.mock('../hooks/useLegendSeries', () => ({
	useLegendSeries: (): [] => [],
}));
jest.mock('../hooks/useTableColumns', () => ({
	useTableColumns: (): [] => [],
}));
jest.mock('../hooks/useSeedMetricUnit', () => ({
	useSeedMetricUnit: (): unknown => ({
		metricUnit: undefined,
		isLoading: false,
	}),
}));
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({ currentQuery: { queryType: 'builder' } }),
}));
jest.mock(
	'../../PanelsAndSectionsLayout/Panel/hooks/usePanelInteractions',
	() => ({
		usePanelInteractions: (): unknown => ({
			onDragSelect: jest.fn(),
			dashboardPreference: {},
		}),
	}),
);

jest.mock('@signozhq/ui/resizable', () => ({
	__esModule: true,
	ResizablePanelGroup: ({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element => <div>{children}</div>,
	ResizablePanel: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
	ResizableHandle: (): null => null,
	useDefaultLayout: (): unknown => ({
		defaultLayout: undefined,
		onLayoutChanged: jest.fn(),
	}),
}));
jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

// Children mocked to capture props (and expose a Save trigger / footer slot).
const mockHeaderProps = jest.fn();
jest.mock('../Header/Header', () => ({
	__esModule: true,
	default: (props: { onSave: () => void; onClose: () => void }): JSX.Element => {
		mockHeaderProps(props);
		return (
			<>
				<button type="button" data-testid="editor-save" onClick={props.onSave}>
					save
				</button>
				<button type="button" data-testid="editor-close" onClick={props.onClose}>
					close
				</button>
			</>
		);
	},
}));
const mockPreviewProps = jest.fn();
jest.mock('../PreviewPane/PreviewPane', () => ({
	__esModule: true,
	default: (props: unknown): JSX.Element => {
		mockPreviewProps(props);
		return <div data-testid="preview" />;
	},
}));
const mockQbProps = jest.fn();
jest.mock('../PanelEditorQueryBuilder/PanelEditorQueryBuilder', () => ({
	__esModule: true,
	default: (props: { footer?: React.ReactNode }): JSX.Element => {
		mockQbProps(props);
		return <div data-testid="qb">{props.footer}</div>;
	},
}));
const mockConfigProps = jest.fn();
jest.mock('../ConfigPane/ConfigPane', () => ({
	__esModule: true,
	default: (props: unknown): JSX.Element => {
		mockConfigProps(props);
		return <div data-testid="config" />;
	},
}));
jest.mock('../ListColumnsEditor/ListColumnsEditor', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="list-columns" />,
}));

function makePanel(
	kind: string,
	queries: unknown[] = [],
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'CPU' },
			plugin: { kind, spec: {} },
			queries,
		},
	} as unknown as DashboardtypesPanelDTO;
}

const baseProps = {
	dashboardId: 'dash-1',
	panelId: 'panel-1',
	isEditable: true,
	editDisabledReason: '',
	onClose: jest.fn(),
	onSaved: jest.fn(),
};

function setup(
	panel: DashboardtypesPanelDTO,
	overrides?: Partial<React.ComponentProps<typeof PanelEditorContainer>>,
	draftOverrides?: { isSpecDirty?: boolean },
): void {
	mockUseDraft.mockReturnValue({
		draft: panel,
		spec: panel.spec,
		setSpec: mockSetSpec,
		isSpecDirty: draftOverrides?.isSpecDirty ?? false,
	});
	mockUseQuery.mockReturnValue({
		data: { response: undefined },
		isFetching: false,
		error: null,
		cancelQuery: mockCancelQuery,
		refetch: mockRefetch,
		pagination: undefined,
	});
	mockUseQuerySync.mockReturnValue({
		runQuery: jest.fn(),
		isQueryDirty: false,
		buildSaveSpec: mockBuildSaveSpec,
	});
	mockUseTypeSwitch.mockReturnValue({
		onChangePanelKind: mockOnChangePanelKind,
	});
	render(<PanelEditorContainer {...baseProps} panel={panel} {...overrides} />);
}

describe('PanelEditorContainer composition', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useScrollIntoViewStore.setState({ scrollTargetId: null });
	});

	it('renders the editor shell with preview, query builder, and config pane', () => {
		const panel = makePanel('signoz/TimeSeriesPanel');
		setup(panel);

		expect(screen.getByTestId('panel-editor-v2')).toBeInTheDocument();
		expect(screen.getByTestId('preview')).toBeInTheDocument();
		expect(screen.getByTestId('qb')).toBeInTheDocument();
		expect(screen.getByTestId('config')).toBeInTheDocument();

		expect(mockPreviewProps).toHaveBeenCalledWith(
			expect.objectContaining({
				panel,
				panelDefinition: getPanelDefinition('signoz/TimeSeriesPanel'),
			}),
		);
		expect(mockQbProps).toHaveBeenCalledWith(
			expect.objectContaining({ panelKind: 'signoz/TimeSeriesPanel' }),
		);
		expect(mockConfigProps).toHaveBeenCalledWith(
			expect.objectContaining({
				panel,
				spec: panel.spec,
				onChangePanelKind: mockOnChangePanelKind,
			}),
		);
	});

	it('forwards the derived panel type + query-sync options to the leaf hooks', () => {
		const panel = makePanel('signoz/TimeSeriesPanel');
		setup(panel);

		expect(mockUseQuery).toHaveBeenCalledWith(
			expect.objectContaining({ panel, panelId: 'panel-1', enabled: true }),
		);
		expect(mockUseQuerySync).toHaveBeenCalledWith(
			expect.objectContaining({
				panelType: PANEL_TYPES.TIME_SERIES,
				setSpec: mockSetSpec,
				refetch: mockRefetch,
				alwaysSerializeQuery: false,
				signal: getPanelDefinition('signoz/TimeSeriesPanel').supportedSignals[0],
			}),
		);
		expect(mockUseTypeSwitch).toHaveBeenCalledWith(
			expect.objectContaining({
				panelType: PANEL_TYPES.TIME_SERIES,
				spec: panel.spec,
				setSpec: mockSetSpec,
			}),
		);
	});

	it('keeps a query-less new panel unsaveable but still serializes its seed query', () => {
		setup(makePanel('signoz/TimeSeriesPanel'), { isNew: true });

		expect(mockUseQuerySync).toHaveBeenCalledWith(
			expect.objectContaining({ alwaysSerializeQuery: true }),
		);
		// No query and no edits yet → nothing to save, so Save stays disabled.
		expect(mockHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({ isDirty: false }),
		);
	});

	it('marks a new panel that already has a query saveable (e.g. list auto-runs one)', () => {
		const seededQuery = {
			spec: { plugin: { kind: 'signoz/BuilderQuery', spec: { signal: 'logs' } } },
		};
		setup(makePanel('signoz/ListPanel', [seededQuery]), { isNew: true });

		expect(mockHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({ isDirty: true }),
		);
	});

	it('marks a new panel dirty once the user edits its spec', () => {
		setup(
			makePanel('signoz/TimeSeriesPanel'),
			{ isNew: true },
			{
				isSpecDirty: true,
			},
		);

		expect(mockHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({ isDirty: true }),
		);
	});

	it('bakes the live query into the spec on save, then notifies', async () => {
		const panel = makePanel('signoz/TimeSeriesPanel');
		setup(panel, { onSaved: baseProps.onSaved });

		await userEvent.click(screen.getByTestId('editor-save'));

		await waitFor(() => expect(baseProps.onSaved).toHaveBeenCalled());

		expect(mockBuildSaveSpec).toHaveBeenCalledWith(panel.spec);
		expect(mockSave).toHaveBeenCalledWith(panel.spec);
	});

	it('marks the saved panel to be scrolled into view on the dashboard', async () => {
		setup(makePanel('signoz/TimeSeriesPanel'));

		await userEvent.click(screen.getByTestId('editor-save'));

		await waitFor(() =>
			expect(useScrollIntoViewStore.getState().scrollTargetId).toBe('panel-1'),
		);
	});

	it('marks an existing panel to be revealed when the editor is closed', async () => {
		setup(makePanel('signoz/TimeSeriesPanel'));

		await userEvent.click(screen.getByTestId('editor-close'));

		expect(useScrollIntoViewStore.getState().scrollTargetId).toBe('panel-1');
	});

	it('does not mark a scroll target when a new, unsaved panel is closed', async () => {
		setup(makePanel('signoz/TimeSeriesPanel'), { isNew: true });

		await userEvent.click(screen.getByTestId('editor-close'));

		expect(useScrollIntoViewStore.getState().scrollTargetId).toBeNull();
	});

	it('offers Switch to View Mode for an existing panel', () => {
		setup(makePanel('signoz/TimeSeriesPanel'));

		expect(mockHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				showSwitchToView: true,
				onSwitchToView: expect.any(Function),
			}),
		);
	});

	it('hides Switch to View Mode for a new (unsaved) panel', () => {
		setup(makePanel('signoz/TimeSeriesPanel'), { isNew: true });

		expect(mockHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({ showSwitchToView: false }),
		);
	});

	it('renders the list-columns editor only for list panels', () => {
		setup(makePanel('signoz/ListPanel'));
		expect(screen.getByTestId('list-columns')).toBeInTheDocument();
	});

	it('omits the list-columns editor for non-list panels', () => {
		setup(makePanel('signoz/TimeSeriesPanel'));
		expect(screen.queryByTestId('list-columns')).not.toBeInTheDocument();
	});
});
