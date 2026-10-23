import { useCallback, useMemo } from 'react';
import {
	Bell,
	Copy,
	FolderInput,
	Fullscreen,
	PenLine,
	Trash2,
} from '@signozhq/icons';
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
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import { blockedBy } from 'lib/authz/components/AuthZDropdown/utils';
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
	items: AuthZDropdownItemType[];
	/** Two-step confirm flow for the destructive Delete action. */
	deleteConfirm: ConfirmableAction;
}

/**
 * Resolves the panel actions menu items. Panels live in the dashboard spec and
 * have no authz kind, so every mutating action maps to the dashboard's edit
 * rights, while PanelDefinition.actions still decides which make sense at all.
 * View, Download and Create Alerts never mutate, so they are always available.
 */
export function usePanelActionItems({
	panelId,
	panel,
	data,
	panelActions,
}: UsePanelActionItemsArgs): PanelActionItems {
	const panelKind = panel.spec.plugin.kind;
	const { isEditable, editChecks, editDisabledTooltip } =
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

	const items = useMemo<AuthZDropdownItemType[]>(() => {
		const editGate = { checks: editChecks, ...blockedBy(editDisabledTooltip) };

		const panelGroup: AuthZDropdownItemType[] = [];
		if (panelCapabilities.view) {
			panelGroup.push({
				type: 'item',
				value: 'view-panel',
				label: 'View',
				prefix: <Fullscreen size={14} />,
				onClick: (): void => openView(panelId, panel),
			});
		}
		if (panelCapabilities.edit) {
			panelGroup.push({
				type: 'item',
				value: 'edit-panel',
				label: 'Edit panel',
				prefix: <PenLine size={14} />,
				...editGate,
				onClick: (): void => openPanelEditor(panelId, { panel }),
			});
		}
		if (panelCapabilities.clone) {
			// Needs section context to place the copy; disabled without it.
			panelGroup.push({
				type: 'item',
				value: 'clone-panel',
				label: 'Clone',
				prefix: <Copy size={14} />,
				...editGate,
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

		const dataGroup: AuthZDropdownItemType[] = [];
		if (downloadItem) {
			dataGroup.push(downloadItem);
		}

		// Create Alerts opens a new tab and never mutates the dashboard, so —
		// unlike edit/clone — it isn't gated on editability (V1 parity).
		if (panelCapabilities.createAlert) {
			dataGroup.push({
				type: 'item',
				value: 'create-alert',
				label: 'Create Alerts',
				prefix: <Bell size={14} />,
				onClick: (): void => createAlert(panel, panelId),
			});
		}

		const moveGroup: AuthZDropdownItemType[] =
			isEditable && panelActions
				? buildMoveItems({
						sections,
						currentLayoutIndex: panelActions.currentLayoutIndex,
						panelId,
						movePanel,
					})
				: [
						{
							type: 'item',
							value: 'move',
							label: 'Move to section',
							prefix: <FolderInput size={14} />,
							...editGate,
						},
					];

		const deleteGroup: AuthZDropdownItemType[] = [
			{
				type: 'item',
				value: 'delete-panel',
				label: 'Delete panel',
				prefix: <Trash2 size={14} />,
				danger: true,
				...editGate,
				onClick: (): void => requestDelete(),
			},
		];

		return [panelGroup, dataGroup, moveGroup, deleteGroup]
			.filter((group) => group.length > 0)
			.flatMap<AuthZDropdownItemType>((group, index) =>
				index === 0
					? group
					: [{ type: 'separator', value: `separator-${index}` }, ...group],
			);
	}, [
		isEditable,
		editChecks,
		editDisabledTooltip,
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
