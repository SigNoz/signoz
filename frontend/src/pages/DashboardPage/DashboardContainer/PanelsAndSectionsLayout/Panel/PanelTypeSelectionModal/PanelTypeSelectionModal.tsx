import { useEffect, useMemo, useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';

import { useDashboardSections } from '../../../hooks/useDashboardSections';
import { releasePanelPickerTarget } from '../../../store/usePanelPickerTargetStore';
import { getPanelDefinition } from '../../../Panels/registry';
import type { PanelKind } from '../../../Panels/types/panelKind';
import PanelTypeBrowser from './PanelTypeBrowser';
import SectionPicker from './SectionPicker';
import { usePanelPickerTarget } from './usePanelPickerTarget';
import { buildSectionOptions, resolveDefaultSectionValue } from './utils';

import styles from './PanelTypeSelectionModal.module.scss';

const DEFAULT_PANEL_KIND: PanelKind = 'signoz/TimeSeriesPanel';

interface PanelTypeSelectionModalProps {
	open: boolean;
	onClose: () => void;
	onSelect: (panelKind: PanelKind, layoutIndex?: number) => void;
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

	useEffect(() => {
		if (open) {
			setSelectedValue(resolveDefaultSectionValue(options, defaultLayoutIndex));
			setSelectedKind(DEFAULT_PANEL_KIND);
		}
	}, [open, options, defaultLayoutIndex]);

	const selectedLayoutIndex =
		selectedValue === '' ? undefined : Number(selectedValue);
	usePanelPickerTarget(selectedLayoutIndex, open && hasSectionPicker);

	const handleClose = (): void => {
		releasePanelPickerTarget(true);
		onClose();
	};

	const handleConfirm = (): void => {
		releasePanelPickerTarget(false);
		onSelect(selectedKind, selectedLayoutIndex);
	};

	const selectedName = getPanelDefinition(selectedKind).displayName;
	const targetLabel = options.find((o) => o.value === selectedValue)?.label;

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
						{selectedName}
						{hasSectionPicker && targetLabel && (
							<>
								{' in '}
								<span className={styles.summaryTarget}>{targetLabel}</span>
							</>
						)}
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
						testId="panel-type-confirm"
					>
						Add panel
					</Button>
				</div>
			}
		>
			{hasSectionPicker && (
				<div className={styles.sectionField}>
					<span className={styles.fieldLabel}>Add to section</span>
					<SectionPicker
						options={options}
						value={selectedValue}
						onChange={setSelectedValue}
					/>
				</div>
			)}
			<PanelTypeBrowser selectedKind={selectedKind} onSelect={setSelectedKind} />
		</DrawerWrapper>
	);
}

export default PanelTypeSelectionModal;
