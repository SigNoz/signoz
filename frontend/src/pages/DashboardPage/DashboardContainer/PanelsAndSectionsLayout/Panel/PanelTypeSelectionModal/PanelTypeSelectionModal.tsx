import { useEffect, useMemo, useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';

import { useDashboardSections } from '../../../hooks/useDashboardSections';
import { releasePanelPickerTarget } from '../../../store/usePanelPickerTargetStore';
import { getPanelDefinition } from '../../../Panels/registry';
import type { NewPanelTarget } from '../../../patchOps';
import type { PanelKind } from '../../../Panels/types/panelKind';
import PanelTypeBrowser from './PanelTypeBrowser';
import SectionTarget from './SectionTarget';
import { usePanelPickerDraftSection } from './usePanelPickerDraftSection';
import { usePanelPickerTarget } from './usePanelPickerTarget';
import { buildSectionOptions, resolveDefaultSectionValue } from './utils';

import styles from './PanelTypeSelectionModal.module.scss';

const DEFAULT_PANEL_KIND: PanelKind = 'signoz/TimeSeriesPanel';

interface PanelTypeSelectionModalProps {
	open: boolean;
	onClose: () => void;
	onSelect: (panelKind: PanelKind, target?: NewPanelTarget) => void;
	/** Section the picker opens on; omit → the first section. */
	defaultLayoutIndex?: number;
}

function PanelTypeSelectionModal({
	open,
	onClose,
	onSelect,
	defaultLayoutIndex,
}: PanelTypeSelectionModalProps): JSX.Element {
	const sections = useDashboardSections();
	const options = useMemo(() => buildSectionOptions(sections), [sections]);
	const hasSectionPicker = options.length > 1;

	const [selectedValue, setSelectedValue] = useState('');
	const [selectedKind, setSelectedKind] =
		useState<PanelKind>(DEFAULT_PANEL_KIND);
	const [newSectionTitle, setNewSectionTitle] = useState<string | null>(null);
	const isCreatingSection = newSectionTitle !== null;

	useEffect(() => {
		if (open) {
			setSelectedValue(resolveDefaultSectionValue(options, defaultLayoutIndex));
			setSelectedKind(DEFAULT_PANEL_KIND);
			setNewSectionTitle(null);
		}
	}, [open, options, defaultLayoutIndex]);

	const selectedTarget = options.find((o) => o.value === selectedValue)?.target;
	const selectedLayoutIndex =
		selectedTarget?.type === 'section' ? selectedTarget.layoutIndex : undefined;
	usePanelPickerTarget(
		selectedLayoutIndex,
		open && hasSectionPicker && !isCreatingSection,
	);
	usePanelPickerDraftSection(newSectionTitle, open);

	const handleClose = (): void => {
		releasePanelPickerTarget(true);
		onClose();
	};

	const sectionTitle = newSectionTitle?.trim() ?? '';

	const handleConfirm = (): void => {
		if (isCreatingSection && !sectionTitle) {
			return;
		}
		releasePanelPickerTarget(false);
		onSelect(
			selectedKind,
			isCreatingSection
				? { type: 'newSection', title: sectionTitle }
				: selectedTarget,
		);
	};

	const selectedName = getPanelDefinition(selectedKind).displayName;

	return (
		<DrawerWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					handleClose();
				}
			}}
			title="New panel"
			subTitle="Pick a visualization. You can change it later."
			direction="right"
			width="wide"
			testId="panel-type-drawer"
			drawerDescriptionProps={{ className: styles.body }}
			footer={
				<div className={styles.footer}>
					<span className={styles.summary}>
						<span className={styles.summaryKind}>{selectedName}</span>
						<SectionTarget
							options={options}
							value={selectedValue}
							onChange={setSelectedValue}
							newSectionTitle={newSectionTitle}
							onNewSectionTitleChange={setNewSectionTitle}
							onSubmit={handleConfirm}
						/>
					</span>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						onClick={handleClose}
					>
						Cancel
					</Button>
					<Button
						color="primary"
						size="md"
						prefix={<Plus size={16} />}
						onClick={handleConfirm}
						disabled={isCreatingSection && !sectionTitle}
						testId="panel-type-confirm"
					>
						Add panel
					</Button>
				</div>
			}
		>
			<PanelTypeBrowser selectedKind={selectedKind} onSelect={setSelectedKind} />
		</DrawerWrapper>
	);
}

export default PanelTypeSelectionModal;
