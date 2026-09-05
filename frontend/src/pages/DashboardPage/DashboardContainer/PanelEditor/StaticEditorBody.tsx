import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { PanelMode } from 'lib/visualization/panels/types';
import StaticPanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { EMPTY_PANEL_QUERY_DATA } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { EQueryType } from 'types/common/dashboard';
import { useErrorModal } from 'providers/ErrorModalProvider';

import { useScrollIntoViewStore } from '../store/useScrollIntoViewStore';
import ConfigPane from './ConfigPane/ConfigPane';
import Header from './Header/Header';
import PanelEditorLayout, {
	PANE_SPLIT,
} from './PanelEditorLayout/PanelEditorLayout';
import type { PanelEditorContainerProps } from './index';
import type { PanelEditorDraftApi } from './types';
import { usePanelEditorSave } from './hooks/usePanelEditorSave';

import styles from './PanelEditor.module.scss';

interface StaticEditorBodyProps extends PanelEditorContainerProps {
	draftApi: PanelEditorDraftApi;
	panelDefinition: RenderableStaticPanelDefinition;
	onChangePanelKind: (kind: PanelKind) => void;
}

/**
 * Editor body for a kind that renders from its own plugin spec: the kind's
 * editor pane under a live preview of the draft, the config pane on the right.
 * No query session, no builder seeding, no staged-run — the preview re-renders
 * from the draft spec on every edit.
 */
function StaticEditorBody({
	dashboardId,
	panelId,
	isNew = false,
	layoutIndex,
	isEditable,
	editDisabledReason,
	onClose,
	onSaved,
	draftApi,
	panelDefinition,
	onChangePanelKind,
}: StaticEditorBodyProps): JSX.Element {
	const { draft, spec, setSpec, isSpecDirty } = draftApi;
	const { EditorPane } = panelDefinition;

	const { save, isSaving } = usePanelEditorSave({
		dashboardId,
		panelId,
		isNew,
		layoutIndex,
	});

	const setScrollTargetId = useScrollIntoViewStore((s) => s.setScrollTargetId);
	const { showErrorModal } = useErrorModal();

	const onSave = useCallback(async (): Promise<void> => {
		if (!isEditable) {
			return;
		}
		try {
			// `queries: []` is the only shape the API accepts for a static kind.
			const savedPanelId = await save({ ...draft.spec, queries: [] });
			setScrollTargetId(savedPanelId);
			toast.success('Panel saved', {
				position: 'top-center',
			});
			onSaved();
		} catch (err) {
			showErrorModal(err);
		}
	}, [isEditable, save, draft.spec, setScrollTargetId, onSaved, showErrorModal]);

	const onCloseEditor = useCallback((): void => {
		if (!isNew) {
			setScrollTargetId(panelId);
		}
		onClose();
	}, [isNew, panelId, setScrollTargetId, onClose]);

	return (
		<PanelEditorLayout
			split={PANE_SPLIT.static}
			header={
				<Header
					isDirty={isSpecDirty}
					isSaving={isSaving}
					showSwitchToView={false}
					readOnly={!isEditable}
					readOnlyReason={editDisabledReason}
					onSave={onSave}
					onClose={onCloseEditor}
				/>
			}
			preview={
				<div className={styles.staticPreviewSurface}>
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
						panelMode={PanelMode.DASHBOARD_EDIT}
					/>
				</div>
			}
			editor={<EditorPane spec={spec} onChangeSpec={setSpec} />}
			config={
				<ConfigPane
					panel={draft}
					panelId={panelId}
					spec={spec}
					onChangeSpec={setSpec}
					onChangePanelKind={onChangePanelKind}
					queryType={EQueryType.QUERY_BUILDER}
					legendSeries={[]}
					tableColumns={[]}
				/>
			}
		/>
	);
}

export default StaticEditorBody;
