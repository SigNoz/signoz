import { useCallback, useState } from 'react';
import { generatePath } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import { newPanelSearch, NEW_PANEL_ID } from '../PanelEditor/newPanelRoute';
import type { PanelKind } from '../Panels/types/panelKind';
import { useDashboardStore } from '../store/useDashboardStore';

interface UseCreatePanelResult {
	isPickerOpen: boolean;
	/** Pass the target section's layout index; omit → last/new section. */
	openPicker: (layoutIndex?: number) => void;
	closePicker: () => void;
	createPanel: (panelKind: PanelKind) => void;
}

/**
 * Drives new-panel creation from any "Add panel" trigger: owns the panel-type
 * picker state and navigates to the editor on a draft panel. Nothing is persisted
 * until save.
 */
export function useCreatePanel(): UseCreatePanelResult {
	const { safeNavigate } = useSafeNavigate();
	const dashboardId = useDashboardStore((s) => s.dashboardId);

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
		(panelKind: PanelKind): void => {
			setIsPickerOpen(false);
			const path = generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
				dashboardId,
				panelId: NEW_PANEL_ID,
			});
			safeNavigate(`${path}${newPanelSearch(panelKind, layoutIndex)}`);
		},
		[safeNavigate, dashboardId, layoutIndex],
	);

	return { isPickerOpen, openPicker, closePicker, createPanel };
}
