import { useMemo } from 'react';

import { useDashboardControlGroup } from '../../../controls/useDashboardControlGroup';
import type { DashboardSection } from '../../../utils';
import type { SectionHeaderActions } from '../SectionHeader/SectionHeader';
import { useCloneSection } from './useCloneSection';

interface UseSectionHeaderActionsArgs {
	section: DashboardSection;
	openPicker: (layoutIndex: number) => void;
	openRename: () => void;
	openDelete: () => void;
}

/** The section menu's actions, minus the ones the host hides (`sectionActions`). */
export function useSectionHeaderActions({
	section,
	openPicker,
	openRename,
	openDelete,
}: UseSectionHeaderActionsArgs): SectionHeaderActions {
	const sectionControls = useDashboardControlGroup('sectionActions');
	const cloneSection = useCloneSection();

	return useMemo(
		() => ({
			onRename: sectionControls.rename ? openRename : undefined,
			onAddPanel: sectionControls.addPanel
				? (): void => openPicker(section.layoutIndex)
				: undefined,
			onCloneSection: sectionControls.clone
				? (): void => void cloneSection(section)
				: undefined,
			onDeleteSection: sectionControls.delete ? openDelete : undefined,
		}),
		[sectionControls, openRename, openPicker, section, cloneSection, openDelete],
	);
}
