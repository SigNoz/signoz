import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { toPanelType } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';

import type { NewPanelTarget } from '../patchOps';
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
	target?: NewPanelTarget;
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
	const originalPanelKind = (savedPanel ?? panel).spec.plugin.kind;

	const { onChangePanelKind } = usePanelTypeSwitch({
		spec: draftApi.draft.spec,
		panelType: toPanelType(panelKind),
		setSpec: draftApi.setSpec,
	});

	if (panelDefinition.mode === 'static') {
		return (
			<StaticEditorBody
				{...props}
				draftApi={draftApi}
				panelDefinition={panelDefinition}
				onChangePanelKind={onChangePanelKind}
				originalPanelKind={originalPanelKind}
			/>
		);
	}

	return (
		<QueryEditorBody
			{...props}
			draftApi={draftApi}
			panelDefinition={panelDefinition}
			onChangePanelKind={onChangePanelKind}
			originalPanelKind={originalPanelKind}
		/>
	);
}

export default PanelEditorContainer;
