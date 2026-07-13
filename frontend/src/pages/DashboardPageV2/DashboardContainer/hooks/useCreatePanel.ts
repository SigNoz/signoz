import { useCallback, useState } from 'react';
import { generatePath, useLocation } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import { newPanelSearch, NEW_PANEL_ID } from '../PanelEditor/newPanelRoute';
import type { PanelKind } from '../Panels/types/panelKind';
import { useDashboardStore } from '../store/useDashboardStore';
import { withVariablesSearch } from '../VariablesBar/variablesUrlState';

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
	const { safeNavigate } = useSafeNavigate();
	const { search } = useLocation();
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
		(panelKind: PanelKind, targetIndex?: number): void => {
			setIsPickerOpen(false);
			const path = generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
				dashboardId,
				panelId: NEW_PANEL_ID,
			});
			const target = targetIndex ?? layoutIndex;
			safeNavigate(
				`${path}${withVariablesSearch(newPanelSearch(panelKind, target), search)}`,
			);
		},
		[safeNavigate, dashboardId, layoutIndex, search],
	);

	return {
		isPickerOpen,
		openPicker,
		closePicker,
		targetLayoutIndex: layoutIndex,
		createPanel,
	};
}
