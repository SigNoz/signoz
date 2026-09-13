import { useCallback } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { PanelMode } from 'lib/visualization/panels/types';
import type { RenderableStaticPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import type { PanelKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { EQueryType } from 'types/common/dashboard';
import { useErrorModal } from 'providers/ErrorModalProvider';

import { useDashboardEditContext } from '../hooks/useDashboardEditContext';
import { useScrollIntoViewStore } from '../store/useScrollIntoViewStore';
import ConfigPane from './ConfigPane/ConfigPane';
import Header from './Header/Header';
import PanelEditorLayout, {
	PANE_SPLIT,
} from './PanelEditorLayout/PanelEditorLayout';
import PreviewPane from './PreviewPane/PreviewPane';
import type { PanelEditorContainerProps } from './index';
import type { PanelEditorDraftApi } from './types';
import { withPanelText } from '../Panels/utils/withPanelText';
import { usePanelEditorSave } from './hooks/usePanelEditorSave';

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
	onClose,
	onSaved,
	draftApi,
	panelDefinition,
	onChangePanelKind,
}: StaticEditorBodyProps): JSX.Element {
	// Read here rather than taken as props: this renders inside a loaded dashboard
	// subtree, so it resolves the same context every other consumer does.
	const { isEditable, editChecks, editDisabledTooltip } =
		useDashboardEditContext();

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

	const onChangeText = useCallback(
		(text: string): void => setSpec(withPanelText(spec, text)),
		[spec, setSpec],
	);

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
					readOnlyChecks={editChecks}
					readOnlyTooltip={editDisabledTooltip}
					onSave={onSave}
					onClose={onCloseEditor}
				/>
			}
			preview={
				<PreviewPane
					mode="static"
					panelId={panelId}
					panel={draft}
					panelDefinition={panelDefinition}
					panelMode={PanelMode.DASHBOARD_EDIT}
					onChangeText={isEditable ? onChangeText : undefined}
				/>
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
