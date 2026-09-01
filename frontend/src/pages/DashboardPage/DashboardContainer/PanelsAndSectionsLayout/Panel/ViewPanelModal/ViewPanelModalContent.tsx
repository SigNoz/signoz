import { useMemo } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryParams } from 'constants/query';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import useUrlQuery from 'hooks/useUrlQuery';
import { usePanelEditorDraft } from 'pages/DashboardPage/DashboardContainer/PanelEditor/hooks/usePanelEditorDraft';
import { usePanelTypeSwitch } from 'pages/DashboardPage/DashboardContainer/PanelEditor/hooks/usePanelTypeSwitch';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { toLegacyPanelType } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelKind';
import { buildViewPanelSpec } from 'pages/DashboardPage/DashboardContainer/Panels/utils/drilldown/buildViewPanelSpec';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

import QueryViewModalBody from './QueryViewModalBody';
import StaticViewModalBody from './StaticViewModalBody';
import { readViewPanelHandoff } from './viewPanelHandoffStore';

interface ViewPanelModalContentProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** Close the modal — wired to the graph manager's Save/Cancel. */
	onClose: () => void;
}

/**
 * View-modal shell. Owns the draft and the kind-switch cache — the state that
 * must survive a switch between authoring modes — and forks on the draft kind's
 * `mode`, so a static kind mounts no time window, query session or drilldown.
 */
function ViewPanelModalContent({
	panel,
	panelId,
	onClose,
}: ViewPanelModalContentProps): JSX.Element {
	// Config edits from the editor's "Switch to View Mode" arrive via the handoff; the
	// query still comes from the URL. Falls back to the saved panel for a plain "View".
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const baseSpec = useMemo<DashboardtypesPanelSpecDTO>(
		() => readViewPanelHandoff(dashboardId, panelId) ?? panel.spec,
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only seed
		[],
	);

	// Mount-only so a refresh re-seeds and in-modal edits survive (V1 parity).
	const compositeQuery = useGetCompositeQueryParam();
	const urlGraphType = useUrlQuery().get(
		QueryParams.graphType,
	) as PANEL_TYPES | null;
	const initialPanel = useMemo<DashboardtypesPanelDTO>(
		() => {
			// A URL query can only seed a kind that takes one.
			const isQuerySeeded =
				compositeQuery && getPanelDefinition(baseSpec.plugin.kind).mode === 'query';
			return isQuerySeeded
				? {
						...panel,
						spec: buildViewPanelSpec({
							spec: baseSpec,
							query: compositeQuery,
							panelType:
								urlGraphType ?? toLegacyPanelType(baseSpec.plugin.kind),
						}),
					}
				: { ...panel, spec: baseSpec };
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only seed from the URL
		[],
	);

	const draftApi = usePanelEditorDraft(initialPanel);
	const draftKind = draftApi.draft.spec.plugin.kind;
	const panelDefinition = getPanelDefinition(draftKind);

	const { onChangePanelKind } = usePanelTypeSwitch({
		spec: draftApi.draft.spec,
		panelType: toLegacyPanelType(draftKind),
		setSpec: draftApi.setSpec,
	});

	if (panelDefinition.mode === 'static') {
		return (
			<StaticViewModalBody
				panelId={panelId}
				draftApi={draftApi}
				panelDefinition={panelDefinition}
				onChangePanelKind={onChangePanelKind}
			/>
		);
	}

	return (
		<QueryViewModalBody
			panel={panel}
			panelId={panelId}
			onClose={onClose}
			draftApi={draftApi}
			onChangePanelKind={onChangePanelKind}
		/>
	);
}

export default ViewPanelModalContent;
