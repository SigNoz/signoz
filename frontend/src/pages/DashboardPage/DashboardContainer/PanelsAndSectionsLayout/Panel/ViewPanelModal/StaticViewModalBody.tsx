import { useCallback } from 'react';
import cx from 'classnames';
import { PanelMode } from 'lib/visualization/panels/types';
import logEvent from 'api/common/logEvent';
import StaticPreviewPane from 'pages/DashboardPage/DashboardContainer/PanelEditor/StaticPreviewPane/StaticPreviewPane';
import type { PanelEditorDraftApi } from 'pages/DashboardPage/DashboardContainer/PanelEditor/types';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { useOpenPanelEditor } from 'pages/DashboardPage/DashboardContainer/hooks/useOpenPanelEditor';
import { DashboardEvents } from 'pages/DashboardPage/constants/events';

import ViewPanelModalHeader from './ViewPanelModalHeader';
import styles from './ViewPanelModal.module.scss';

interface StaticViewModalBodyProps {
	panelId: string;
	draftApi: PanelEditorDraftApi;
	panelDefinition: RenderableStaticPanelDefinition;
	onChangePanelKind: (kind: PanelKind) => void;
}

/**
 * The static-kind View modal body: the query body's layout with the kind's
 * editor pane in the query-builder slot and the live panel below — the time
 * window, query builder and drilldown machinery absent because none of it
 * applies. Edits are temporary; "Switch to Edit Mode" hands them to the editor.
 */
function StaticViewModalBody({
	panelId,
	draftApi,
	panelDefinition,
	onChangePanelKind,
}: StaticViewModalBodyProps): JSX.Element {
	const { draft, spec, setSpec } = draftApi;
	const { EditorPane } = panelDefinition;
	const openPanelEditor = useOpenPanelEditor();

	const onSwitchToEdit = useCallback((): void => {
		void logEvent(DashboardEvents.SWITCH_TO_EDIT_MODE, { panelId });
		// Carry the in-modal edits so the editor opens on them, not the saved panel.
		openPanelEditor(panelId, {
			handoffState: { editSpec: { ...draft.spec, queries: [] } },
		});
	}, [openPanelEditor, panelId, draft.spec]);

	return (
		<div className={styles.content} data-testid="view-panel-modal-content">
			<ViewPanelModalHeader
				mode="static"
				panelKind={draft.spec.plugin.kind}
				onChangePanelKind={onChangePanelKind}
				onSwitchToEdit={onSwitchToEdit}
			/>
			<div className={cx(styles.queryBuilder, styles.staticEditor)}>
				<EditorPane spec={spec} onChangeSpec={setSpec} />
			</div>
			<div className={styles.body}>
				<StaticPreviewPane
					panelId={panelId}
					panel={draft}
					panelDefinition={panelDefinition}
					panelMode={PanelMode.STANDALONE_VIEW}
				/>
			</div>
		</div>
	);
}

export default StaticViewModalBody;
