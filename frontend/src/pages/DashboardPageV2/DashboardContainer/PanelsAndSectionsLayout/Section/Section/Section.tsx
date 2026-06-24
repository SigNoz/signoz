import { useCallback, useRef, useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import { useIntersectionObserver } from 'hooks/useIntersectionObserver';
import { usePanelTypeSelectionModalStore } from 'providers/Dashboard/helpers/panelTypeSelectionModalHelper';

import ConfirmDeleteDialog from '../../../components/ConfirmDeleteDialog/ConfirmDeleteDialog';
import type { DashboardSection } from '../../../utils';
import type { AddPanelArgs } from '../../Panel/hooks/useAddPanelToSection';
import PanelTypeSelectionModal from '../../Panel/PanelTypeSelectionModal/PanelTypeSelectionModal';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { useDeleteSection } from '../hooks/useDeleteSection';
import { useRenameSection } from '../hooks/useRenameSection';
import { useToggleSectionCollapse } from '../hooks/useToggleSectionCollapse';
import RenameSectionModal from '../RenameSectionModal';
import SectionGrid from '../SectionGrid/SectionGrid';
import SectionHeader, {
	type SectionDragHandle,
} from '../SectionHeader/SectionHeader';
import styles from './Section.module.scss';

interface SectionProps {
	section: DashboardSection;
	/** Adds a panel to this section; present only in editable sectioned mode. */
	onAddPanel?: (args: AddPanelArgs) => void;
	/** All sections — layout context for the panel menu's move/delete actions. */
	sections?: DashboardSection[];
	/** Provided by SortableSection in sectioned mode; absent for untitled/free-flow. */
	dragHandle?: SectionDragHandle;
}

function Section({
	section,
	onAddPanel,
	sections,
	dragHandle,
}: SectionProps): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);
	const setIsPanelTypeSelectionModalOpen = usePanelTypeSelectionModalStore(
		(s) => s.setIsPanelTypeSelectionModalOpen,
	);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	// Placeholder signal for lazy panel query-loading (consumed in a later PR):
	// true once the section scrolls into (or near) the viewport.
	const isVisible = useIntersectionObserver(containerRef, {
		rootMargin: '200px',
	});

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

	const [isAddingPanel, setIsAddingPanel] = useState(false);
	const handleSelectPanelType = useCallback(
		(pluginKind: string): void => {
			onAddPanel?.({ layoutIndex: section.layoutIndex, pluginKind });
			setIsAddingPanel(false);
		},
		[onAddPanel, section.layoutIndex],
	);

	const { deleteSection } = useDeleteSection({ section });
	const handleDeleteSection = useCallback((): void => {
		void deleteSection();
		setIsDeleteOpen(false);
	}, [deleteSection]);

	const grid = (
		<SectionGrid
			items={section.items}
			layoutIndex={section.layoutIndex}
			isVisible={isVisible}
			sections={sections}
		/>
	);

	if (!section.title) {
		// Untitled section — just the grid (no header chrome), but still observed
		// for the viewport signal.
		return (
			<div
				ref={containerRef}
				data-testid={`dashboard-section-${section.id}`}
				data-section-layout-index={section.layoutIndex}
			>
				{grid}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
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
				actions={
					isEditable
						? {
								onRename: (): void => setIsRenaming(true),
								onAddPanel: (): void => setIsAddingPanel(true),
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
						{isEditable && (
							<Button
								type="button"
								variant="dashed"
								color="secondary"
								prefix={<Plus size="md" />}
								onClick={(): void => setIsPanelTypeSelectionModalOpen(true)}
								testId={`section-add-panel-${section.id}`}
							>
								New Panel
							</Button>
						)}
					</div>
				))}
			<RenameSectionModal
				open={isRenaming}
				initialValue={section.title}
				isSaving={isSaving}
				onClose={(): void => setIsRenaming(false)}
				onSubmit={handleRenameSubmit}
			/>
			<PanelTypeSelectionModal
				open={isAddingPanel}
				onClose={(): void => setIsAddingPanel(false)}
				onSelect={handleSelectPanelType}
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
