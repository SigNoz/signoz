import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';

import StaticEditorBody from '../StaticEditorBody';
import type { PanelEditorDraftApi } from '../types';
import { usePanelEditorSave } from '../hooks/usePanelEditorSave';

jest.mock('../hooks/usePanelEditorSave', () => ({
	usePanelEditorSave: jest.fn(),
}));
// Chrome + collaborators stubbed: this suite asserts the static body's wiring —
// the save shape above all — not their internals.
jest.mock('../Header/Header', () => ({
	__esModule: true,
	default: ({ onSave }: { onSave: () => void }): JSX.Element => (
		<button type="button" data-testid="header-save" onClick={onSave}>
			Save
		</button>
	),
}));
jest.mock('../ConfigPane/ConfigPane', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="config-pane" />,
}));
jest.mock(
	'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader',
	() => ({ __esModule: true, default: (): null => null }),
);
jest.mock(
	'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody',
	() => ({
		__esModule: true,
		default: (): JSX.Element => <div data-testid="static-preview-body" />,
	}),
);
jest.mock('@signozhq/ui/sonner', () => ({ toast: { success: jest.fn() } }));
jest.mock('providers/ErrorModalProvider', () => ({
	useErrorModal: (): unknown => ({ showErrorModal: jest.fn() }),
}));

const mockUseSave = usePanelEditorSave as jest.Mock;

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
	setSpec: jest.fn(),
	isSpecDirty: false,
	reset: jest.fn(),
};

const definition = ({
	kind: 'signoz/TextPanel',
	displayName: 'Text',
	sections: [],
	actions: {},
	mode: 'static',
	Renderer: (): null => null,
	EditorPane: (): JSX.Element => <div data-testid="editor-pane" />,
} as unknown) as RenderableStaticPanelDefinition;

function renderBody(isEditable = true): void {
	render(
		<StaticEditorBody
			dashboardId="d1"
			panelId="p1"
			panel={draft}
			isEditable={isEditable}
			editDisabledReason=""
			onClose={jest.fn()}
			onSaved={jest.fn()}
			draftApi={draftApi}
			panelDefinition={definition}
			onChangePanelKind={jest.fn()}
		/>,
	);
}

describe('StaticEditorBody', () => {
	beforeEach(() => {
		mockUseSave.mockReset();
		mockUseSave.mockReturnValue({
			save: jest.fn().mockResolvedValue('p1'),
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
		const save = jest.fn().mockResolvedValue('p1');
		mockUseSave.mockReturnValue({ save, isSaving: false });
		renderBody();

		fireEvent.click(screen.getByTestId('header-save'));

		await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		expect(save).toHaveBeenCalledWith({ ...draft.spec, queries: [] });
	});

	it('does not save when the dashboard is not editable', () => {
		const save = jest.fn();
		mockUseSave.mockReturnValue({ save, isSaving: false });
		renderBody(false);

		fireEvent.click(screen.getByTestId('header-save'));

		expect(save).not.toHaveBeenCalled();
	});
});
