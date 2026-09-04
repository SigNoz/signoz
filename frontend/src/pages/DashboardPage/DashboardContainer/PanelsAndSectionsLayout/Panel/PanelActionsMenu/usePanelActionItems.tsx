import { type ReactNode, useCallback, useMemo } from 'react';
import {
	Bell,
	Copy,
	FolderInput,
	Fullscreen,
	PenLine,
	Trash2,
} from '@signozhq/icons';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import {
	type ConfirmableAction,
	useConfirmableAction,
} from 'hooks/useConfirmableAction';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import { useOpenPanelEditor } from 'pages/DashboardPage/DashboardContainer/hooks/useOpenPanelEditor';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { DashboardSection } from '../../../utils';
import type { PanelActionsConfig } from '../Panel';
import { useClonePanel } from '../hooks/useClonePanel';
import { useCreateAlertFromPanel } from '../hooks/useCreateAlertFromPanel';
import { useDeletePanel } from '../hooks/useDeletePanel';
import { useDownloadPanelMenuItem } from '../hooks/useDownloadPanelMenuItem';
import { useMovePanelToSection } from '../hooks/useMovePanelToSection';
import { useViewPanel } from '../hooks/useViewPanel';
import { buildMoveItems } from '../utils/buildMoveItems';
import DisabledMenuItemLabel from '../../../components/DisabledMenuItemLabel/DisabledMenuItemLabel';
import { useDashboardEditContext } from '../../../hooks/useDashboardEditContext';

// Stable fallback so renders without layout context don't churn the mutation
// hooks' deps (a fresh [] each render would re-create their callbacks).
const EMPTY_SECTIONS: DashboardSection[] = [];

interface UsePanelActionItemsArgs {
	panelId: string;
	/** The panel itself — seeds "Create Alerts" and the download filename. */
	panel: DashboardtypesPanelDTO;
	/** The panel's query response — the source for "Download as CSV". */
	data: PanelQueryData;
	/** Layout context for move/delete — absent outside editable mode. */
	panelActions?: PanelActionsConfig;
}

export interface PanelActionItems {
	items: MenuItem[];
	/** Two-step confirm flow for the destructive Delete action. */
	deleteConfirm: ConfirmableAction;
}

/**
 * Resolves the panel actions menu items. Panels are part of the dashboard spec
 * and have no authz kind of their own, so every mutating action maps to the
 * dashboard's edit rights; the kind gate (PanelDefinition.actions) still decides
 * which actions make sense at all. Actions the user can't take stay in the menu,
 * disabled with the reason. View, Download and Create Alerts never mutate the
 * dashboard and are always available.
 */
export function usePanelActionItems({
	panelId,
	panel,
	data,
	panelActions,
}: UsePanelActionItemsArgs): PanelActionItems {
	const panelKind = panel.spec.plugin.kind;
	const { isEditable, editDisabledReason, editDisabledKind } =
		useDashboardEditContext();
	const openPanelEditor = useOpenPanelEditor();
	const createAlert = useCreateAlertFromPanel();
	const { openView } = useViewPanel();

	// Mutations are store-backed; the layout tree only supplies `sections`.
	const sections = panelActions?.sections ?? EMPTY_SECTIONS;
	const movePanel = useMovePanelToSection({ sections });
	const deletePanel = useDeletePanel({ sections });
	const clonePanel = useClonePanel({ sections });

	const panelCapabilities = getPanelDefinition(panelKind).actions;
	const downloadItem = useDownloadPanelMenuItem({
		panelId,
		panel,
		data,
		actions: panelCapabilities,
	});

	// Delete runs on confirm, not on click — the menu item opens a prompt.
	const deleteConfirm = useConfirmableAction(
		useCallback(async (): Promise<void> => {
			if (!panelActions) {
				return;
			}
			await deletePanel({
				panelId,
				layoutIndex: panelActions.currentLayoutIndex,
			});
		}, [deletePanel, panelActions, panelId]),
	);
	// Stable opener so the items memo doesn't rebuild on dialog state changes.
	const { request: requestDelete } = deleteConfirm;

	const items = useMemo<MenuItem[]>(() => {
		const label = (text: string): ReactNode =>
			editDisabledReason ? (
				<DisabledMenuItemLabel reason={editDisabledReason} kind={editDisabledKind}>
					{text}
				</DisabledMenuItemLabel>
			) : (
				text
			);

		const panelGroup: MenuItem[] = [];
		if (panelCapabilities.view) {
			panelGroup.push({
				key: 'view-panel',
				label: 'View',
				icon: <Fullscreen size={14} />,
				onClick: (): void => openView(panelId, panel),
			});
		}
		if (panelCapabilities.edit) {
			panelGroup.push({
				key: 'edit-panel',
				label: label('Edit panel'),
				icon: <PenLine size={14} />,
				disabled: !isEditable,
				onClick: (): void => openPanelEditor(panelId, { panel }),
			});
		}
		if (panelCapabilities.clone) {
			// Needs section context to place the copy; disabled without it.
			panelGroup.push({
				key: 'clone-panel',
				label: label('Clone'),
				icon: <Copy size={14} />,
				disabled: !isEditable || !panelActions,
				onClick: (): void => {
					if (panelActions) {
						void clonePanel({
							panelId,
							layoutIndex: panelActions.currentLayoutIndex,
						});
					}
				},
			});
		}

		const dataGroup: MenuItem[] = [];
		if (downloadItem) {
			dataGroup.push(downloadItem);
		}

		// Create Alerts opens a new tab and never mutates the dashboard, so —
		// unlike edit/clone — it isn't gated on editability (V1 parity).
		if (panelCapabilities.createAlert) {
			dataGroup.push({
				key: 'create-alert',
				label: 'Create Alerts',
				icon: <Bell size={14} />,
				onClick: (): void => createAlert(panel, panelId),
			});
		}

		const moveGroup: MenuItem[] =
			isEditable && panelActions
				? buildMoveItems({
						sections,
						currentLayoutIndex: panelActions.currentLayoutIndex,
						panelId,
						movePanel,
					})
				: [
						{
							key: 'move',
							label: label('Move to section'),
							icon: <FolderInput size={14} />,
							disabled: true,
						},
					];

		const deleteGroup: MenuItem[] = [
			{
				key: 'delete-panel',
				danger: true,
				icon: <Trash2 size={14} />,
				label: label('Delete panel'),
				disabled: !isEditable || !panelActions,
				onClick: (): void => requestDelete(),
			},
		];

		return [panelGroup, dataGroup, moveGroup, deleteGroup]
			.filter((group) => group.length > 0)
			.flatMap((group, index) =>
				index === 0 ? group : [{ type: 'divider' as const }, ...group],
			);
	}, [
		isEditable,
		editDisabledReason,
		panelCapabilities,
		panel,
		panelActions,
		sections,
		panelId,
		downloadItem,
		openView,
		openPanelEditor,
		createAlert,
		movePanel,
		clonePanel,
		requestDelete,
	]);

	return { items, deleteConfirm };
}
