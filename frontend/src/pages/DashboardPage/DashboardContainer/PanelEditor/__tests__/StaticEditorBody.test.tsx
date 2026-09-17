import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';

import StaticEditorBody from '../StaticEditorBody';
import type { PanelEditorDraftApi } from '../types';
import { usePanelEditorSave } from '../hooks/usePanelEditorSave';
import type { Mock } from 'vitest';

vi.mock('../hooks/usePanelEditorSave', () => ({
	usePanelEditorSave: vi.fn(),
}));
// Chrome + collaborators stubbed: this suite asserts the static body's wiring —
// the save shape above all — not their internals.
vi.mock('../Header/Header', () => ({
	__esModule: true,
	default: ({ onSave }: { onSave: () => void }): JSX.Element => (
		<button type="button" data-testid="header-save" onClick={onSave}>
			Save
		</button>
	),
}));
vi.mock('../ConfigPane/ConfigPane', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="config-pane" />,
}));
vi.mock(
	'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader',
	() => ({ __esModule: true, default: (): null => null }),
);
vi.mock(
	'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody',
	() => ({
		__esModule: true,
		default: (): JSX.Element => <div data-testid="static-preview-body" />,
	}),
);
vi.mock('@signozhq/ui/sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('providers/ErrorModalProvider', () => ({
	useErrorModal: (): unknown => ({ showErrorModal: vi.fn() }),
}));
// The derivation has its own suite (useDashboardEditContext.authz); these cases are
// about what the static body does with a given edit context, so control it directly.
let editContext = { isEditable: true, editChecks: [], editDisabledTooltip: '' };
vi.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): typeof editContext => editContext,
	}),
);

const mockUseSave = usePanelEditorSave as Mock;

// The draft deliberately carries a stray query: Save must strip it — the API
// rejects anything but [] for a static kind.
const draft = {
	kind: 'Panel',
	spec: {
		display: { name: 'Runbook' },
		plugin: { kind: 'signoz/TextPanel', spec: { text: '# hi' } },
		queries: [{ spec: {} }],
	},
} as unknown as DashboardtypesPanelDTO;

const draftApi: PanelEditorDraftApi = {
	draft,
	spec: draft.spec,
	setSpec: vi.fn(),
	isSpecDirty: false,
	reset: vi.fn(),
};

const definition = {
	kind: 'signoz/TextPanel',
	displayName: 'Text',
	sections: [],
	actions: {},
	mode: 'static',
	Renderer: (): null => null,
	EditorPane: (): JSX.Element => <div data-testid="editor-pane" />,
} as unknown as RenderableStaticPanelDefinition;

function renderBody(): void {
	render(
		<StaticEditorBody
			dashboardId="d1"
			panelId="p1"
			panel={draft}
			onClose={vi.fn()}
			onSaved={vi.fn()}
			draftApi={draftApi}
			panelDefinition={definition}
			onChangePanelKind={vi.fn()}
		/>,
	);
}

describe('StaticEditorBody', () => {
	beforeEach(() => {
		mockUseSave.mockReset();
		editContext = { isEditable: true, editChecks: [], editDisabledTooltip: '' };
		mockUseSave.mockReturnValue({
			save: vi.fn().mockResolvedValue('p1'),
			isSaving: false,
		});
	});

	it('renders the editor pane and the live preview, no query builder', () => {
		renderBody();

		expect(screen.getByTestId('editor-pane')).toBeInTheDocument();
		expect(screen.getByTestId('static-preview-body')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-query-builder'),
		).not.toBeInTheDocument();
	});

	it('saves the spec with queries forced to [] — the only shape the API accepts', async () => {
		const save = vi.fn().mockResolvedValue('p1');
		mockUseSave.mockReturnValue({ save, isSaving: false });
		renderBody();

		fireEvent.click(screen.getByTestId('header-save'));

		await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		expect(save).toHaveBeenCalledWith({ ...draft.spec, queries: [] });
	});

	it('does not save when the dashboard is not editable', () => {
		const save = vi.fn();
		mockUseSave.mockReturnValue({ save, isSaving: false });
		editContext = {
			isEditable: false,
			editChecks: [],
			editDisabledTooltip: 'Dashboard is locked',
		};
		renderBody();

		fireEvent.click(screen.getByTestId('header-save'));

		expect(save).not.toHaveBeenCalled();
	});
});
