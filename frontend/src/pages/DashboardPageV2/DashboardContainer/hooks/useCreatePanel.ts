import { useCallback, useState } from 'react';
import { generatePath } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import { newPanelSearch, NEW_PANEL_ID } from '../PanelEditor/newPanelRoute';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from '../Panels/types/panelKind';
import { useDashboardStore } from '../store/useDashboardStore';

interface UseCreatePanelResult {
	isPickerOpen: boolean;
	/** Pass the target section's layout index; omit → last/new section. */
	openPicker: (layoutIndex?: number) => void;
	closePicker: () => void;
	/** The section the picker was opened against — seeds its section dropdown. */
	targetLayoutIndex: number | undefined;
	/** `layoutIndex` overrides the opened-against target (the dropdown's choice). */
	createPanel: (panelKind: PanelKind, layoutIndex?: number) => void;
}

/**
 * Drives new-panel creation from any "Add panel" trigger: owns the panel-type
 * picker state and navigates to the editor on a draft panel. Nothing is persisted
 * until save.
 */
export function useCreatePanel(): UseCreatePanelResult {
	const openPanelEditor = useOpenPanelEditor();

	const [isPickerOpen, setIsPickerOpen] = useState(false);
	// Captured on open, consumed on select.
	const [layoutIndex, setLayoutIndex] = useState<number | undefined>(undefined);

	const openPicker = useCallback((index?: number): void => {
		setLayoutIndex(index);
		setIsPickerOpen(true);
	}, []);

	const closePicker = useCallback((): void => {
		setIsPickerOpen(false);
	}, []);

	const createPanel = useCallback(
		(panelKind: PanelKind, targetIndex?: number): void => {
			setIsPickerOpen(false);
			void logEvent(DashboardDetailEvents.PanelAdded, {
				panelType: PANEL_KIND_TO_PANEL_TYPE[panelKind],
				dashboardId,
			});
			const path = generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
				dashboardId,
				panelId: NEW_PANEL_ID,
			});
			const target = targetIndex ?? layoutIndex;
			openPanelEditor(NEW_PANEL_ID, {
				search: newPanelSearch(panelKind, target),
			});
		},
		[openPanelEditor, layoutIndex],
	);

	return {
		isPickerOpen,
		openPicker,
		closePicker,
		targetLayoutIndex: layoutIndex,
		createPanel,
	};
}
