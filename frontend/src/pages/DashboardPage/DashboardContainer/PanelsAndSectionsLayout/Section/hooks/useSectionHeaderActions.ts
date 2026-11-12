import { useMemo } from 'react';

import { useDashboardControlGroup } from '../../../controls/useDashboardControlGroup';
import type { DashboardSection } from '../../../utils';
import type { SectionHeaderActions } from '../SectionHeader/SectionHeader';
import { useCloneSection } from './useCloneSection';

/** The section menu's actions, minus the ones the host hides (`sectionActions`). */
export function useSectionHeaderActions({
	section,
	openPicker,
	openRename,
	openDelete,
}: {
	section: DashboardSection;
	openPicker: (layoutIndex: number) => void;
	openRename: () => void;
	openDelete: () => void;
}): SectionHeaderActions {
	const show = useDashboardControlGroup('sectionActions');
	const cloneSection = useCloneSection();

	return useMemo(
		() => ({
			onRename: show.rename ? openRename : undefined,
			onAddPanel: show.addPanel
				? (): void => openPicker(section.layoutIndex)
				: undefined,
			onCloneSection: show.clone
				? (): void => void cloneSection(section)
				: undefined,
			onDeleteSection: show.delete ? openDelete : undefined,
		}),
		[show, openRename, openPicker, section, cloneSection, openDelete],
	);
}
