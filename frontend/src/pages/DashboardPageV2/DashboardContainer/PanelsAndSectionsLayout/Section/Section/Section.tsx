import { useCallback, useRef, useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import ConfirmDeleteDialog from '../../../components/ConfirmDeleteDialog/ConfirmDeleteDialog';
import DisabledControlTooltip from '../../../components/DisabledControlTooltip/DisabledControlTooltip';
import { DASHBOARD_LOCKED_REASON } from '../../../hooks/useDashboardEditGuard';
import { useCreatePanel } from '../../../hooks/useCreatePanel';
import type { DashboardSection } from '../../../utils';
import PanelTypeSelectionModal from '../../Panel/PanelTypeSelectionModal/PanelTypeSelectionModal';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { useCloneSection } from '../hooks/useCloneSection';
import { useDeleteSection } from '../hooks/useDeleteSection';
import { useRenameSection } from '../hooks/useRenameSection';
import { useScrollIntoView } from '../hooks/useScrollIntoView';
import { useToggleSectionCollapse } from '../hooks/useToggleSectionCollapse';
import SectionTitleModal from '../SectionTitleModal';
import SectionGrid from '../SectionGrid/SectionGrid';
import SectionHeader, {
	type SectionDragHandle,
} from '../SectionHeader/SectionHeader';
import styles from './Section.module.scss';

interface SectionProps {
	section: DashboardSection;
	/** All sections — layout context for the panel menu's move/delete actions. */
	sections?: DashboardSection[];
	/** Provided by SortableSection in sectioned mode; absent for untitled/free-flow. */
	dragHandle?: SectionDragHandle;
}

function Section({ section, sections, dragHandle }: SectionProps): JSX.Element {
	const canEditDashboard = useDashboardStore((s) => s.canEditDashboard);
	const isLocked = useDashboardStore((s) => s.isLocked);
	const {
		isPickerOpen,
		openPicker,
		closePicker,
		createPanel,
		targetLayoutIndex,
	} = useCreatePanel();
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	const { open, toggle } = useToggleSectionCollapse({ sectionId: section.id });

	const [isRenaming, setIsRenaming] = useState(false);
	const { rename, isSaving } = useRenameSection({
		layoutIndex: section.layoutIndex,
	});

	const handleRenameSubmit = useCallback(
		async (title: string): Promise<void> => {
			const ok = await rename(title);
			if (ok) {
				setIsRenaming(false);
			}
		},
		[rename],
	);

	const { deleteSection } = useDeleteSection({ section });
	const handleDeleteSection = useCallback((): void => {
		void deleteSection();
		setIsDeleteOpen(false);
	}, [deleteSection]);

	const cloneSection = useCloneSection();

	const sectionRef = useRef<HTMLDivElement>(null);
	useScrollIntoView(section.id, sectionRef);

	const grid = (
		<SectionGrid
			items={section.items}
			layoutIndex={section.layoutIndex}
			sections={sections}
		/>
	);

	if (!section.title) {
		// Untitled section — just the grid, no header chrome.
		return (
			<div
				ref={sectionRef}
				data-testid={`dashboard-section-${section.id}`}
				data-section-layout-index={section.layoutIndex}
			>
				{grid}
			</div>
		);
	}

	return (
		<div
			ref={sectionRef}
			className={styles.section}
			data-testid={`dashboard-section-${section.id}`}
			data-section-layout-index={section.layoutIndex}
		>
			<SectionHeader
				sectionId={section.id}
				title={section.title}
				open={open}
				onToggle={toggle}
				repeatVariable={section.repeatVariable}
				dragHandle={dragHandle}
				disabledReason={isLocked ? DASHBOARD_LOCKED_REASON : ''}
				actions={
					canEditDashboard
						? {
								onRename: (): void => setIsRenaming(true),
								onAddPanel: (): void => openPicker(section.layoutIndex),
								onCloneSection: (): void => void cloneSection(section),
								onDeleteSection: (): void => setIsDeleteOpen(true),
							}
						: undefined
				}
			/>
			{open &&
				(section.items.length > 0 ? (
					grid
				) : (
					<div className={styles.emptySection}>
						{canEditDashboard && (
							<DisabledControlTooltip
								reason={DASHBOARD_LOCKED_REASON}
								disabled={isLocked}
							>
								<Button
									type="button"
									variant="dashed"
									color="secondary"
									prefix={<Plus size="md" />}
									disabled={isLocked}
									onClick={
										isLocked ? undefined : (): void => openPicker(section.layoutIndex)
									}
									testId={`section-add-panel-${section.id}`}
								>
									New Panel
								</Button>
							</DisabledControlTooltip>
						)}
					</div>
				))}
			<SectionTitleModal
				open={isRenaming}
				heading="Rename section"
				okText="Rename"
				initialValue={section.title}
				isSaving={isSaving}
				onClose={(): void => setIsRenaming(false)}
				onSubmit={handleRenameSubmit}
			/>
			<PanelTypeSelectionModal
				open={isPickerOpen}
				onClose={closePicker}
				onSelect={createPanel}
				defaultLayoutIndex={targetLayoutIndex}
			/>
			<ConfirmDeleteDialog
				open={isDeleteOpen}
				title={`Delete section "${section.title ?? ''}"?`}
				description="Panels in this section will be removed."
				onConfirm={handleDeleteSection}
				onClose={(): void => setIsDeleteOpen(false)}
			/>
		</div>
	);
}

export default Section;
