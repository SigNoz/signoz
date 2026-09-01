import { useCallback } from 'react';
import { PenLine } from '@signozhq/icons';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { PanelMode } from 'lib/visualization/panels/types';
import logEvent from 'api/common/logEvent';
import PanelTypeSwitcher from 'pages/DashboardPage/DashboardContainer/PanelEditor/ConfigPane/PanelTypeSwitcher/PanelTypeSwitcher';
import type { PanelEditorDraftApi } from 'pages/DashboardPage/DashboardContainer/PanelEditor/types';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import StaticPanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { isTransparentPanel } from 'pages/DashboardPage/DashboardContainer/Panels/utils/isTransparentPanel';
import { EMPTY_PANEL_QUERY_DATA } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { useOpenPanelEditor } from 'pages/DashboardPage/DashboardContainer/hooks/useOpenPanelEditor';
import { DashboardEvents } from 'pages/DashboardPage/constants/events';
import { EQueryType } from 'types/common/dashboard';

import styles from './ViewPanelModal.module.scss';

interface StaticViewModalBodyProps {
	panelId: string;
	draftApi: PanelEditorDraftApi;
	panelDefinition: RenderableStaticPanelDefinition;
	onChangePanelKind: (kind: PanelKind) => void;
}

/**
 * The static-kind View modal body: the panel rendered live over the kind's
 * editor pane — the same layout idea as the query body, with the time window,
 * query builder and drilldown machinery absent because none of it applies.
 * Edits are temporary; "Edit panel" hands them to the full editor.
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
			<div className={styles.staticToolbar}>
				<PanelTypeSwitcher
					panelKind={draft.spec.plugin.kind}
					queryType={EQueryType.QUERY_BUILDER}
					onChange={onChangePanelKind}
				/>
				<Button
					type="button"
					variant="outlined"
					color="secondary"
					size="sm"
					prefix={<PenLine size={14} />}
					onClick={onSwitchToEdit}
					data-testid="static-view-switch-to-edit"
				>
					Edit panel
				</Button>
			</div>
			<div
				className={cx(styles.staticPreview, {
					[styles.staticPreviewTransparent]: isTransparentPanel(draft.spec),
				})}
			>
				<PanelHeader
					panelId={panelId}
					panel={draft}
					data={EMPTY_PANEL_QUERY_DATA}
					isFetching={false}
					error={null}
					hideActions
				/>
				<StaticPanelBody
					panelDefinition={panelDefinition}
					panel={draft}
					panelId={panelId}
					panelMode={PanelMode.STANDALONE_VIEW}
				/>
			</div>
			<div className={styles.staticEditorPane}>
				<EditorPane spec={spec} onChangeSpec={setSpec} />
			</div>
		</div>
	);
}

export default StaticViewModalBody;
