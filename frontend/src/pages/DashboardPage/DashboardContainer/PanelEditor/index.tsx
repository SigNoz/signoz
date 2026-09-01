import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';

import QueryEditorBody from './QueryEditorBody';
import StaticEditorBody from './StaticEditorBody';
import { usePanelEditorDraft } from './hooks/usePanelEditorDraft';
import { usePanelTypeSwitch } from './hooks/usePanelTypeSwitch';

export interface PanelEditorContainerProps {
	dashboardId: string;
	panelId: string;
	panel: DashboardtypesPanelDTO;
	/**
	 * The persisted panel the dirty check compares against. Distinct from `panel` (the
	 * seed), which may carry unsaved edits handed off from View mode. Omit for a new panel.
	 */
	savedPanel?: DashboardtypesPanelDTO;
	/** Creating a new panel (seeded default) vs editing an existing one. */
	isNew?: boolean;
	/** Target section for a new panel; falls back to the last/new section. */
	layoutIndex?: number;
	/** The dashboard can be edited (unlocked + permission); gates Save. */
	isEditable: boolean;
	/** Why Save is disabled (locked / no permission); '' when editable. */
	editDisabledReason: string;
	/** Leave the editor (navigate back to the dashboard) without saving. */
	onClose: () => void;
	/** Called after a successful save — navigates back to the dashboard. */
	onSaved: () => void;
}

/**
 * V2 panel editor page shell. Owns exactly the state that must survive a switch
 * between authoring modes — the draft and the kind-switch cache — and forks on
 * the draft kind's `mode`: query kinds get the session-backed body, static kinds
 * an editor pane over a live preview with no query machinery at all.
 */
function PanelEditorContainer(props: PanelEditorContainerProps): JSX.Element {
	const { panel, savedPanel } = props;
	const draftApi = usePanelEditorDraft(panel, savedPanel);

	const panelKind = draftApi.draft.spec.plugin.kind;
	const panelDefinition = getPanelDefinition(panelKind);

	const { onChangePanelKind } = usePanelTypeSwitch({
		spec: draftApi.draft.spec,
		panelType: PANEL_KIND_TO_PANEL_TYPE[panelKind],
		setSpec: draftApi.setSpec,
	});

	if (panelDefinition.mode === 'static') {
		return (
			<StaticEditorBody
				{...props}
				draftApi={draftApi}
				panelDefinition={panelDefinition}
				onChangePanelKind={onChangePanelKind}
			/>
		);
	}

	return (
		<QueryEditorBody
			{...props}
			draftApi={draftApi}
			panelDefinition={panelDefinition}
			onChangePanelKind={onChangePanelKind}
		/>
	);
}

export default PanelEditorContainer;
