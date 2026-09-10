import { useEffect, useMemo, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { DialogWrapper } from '@signozhq/ui/dialog';
import cx from 'classnames';

import { useDashboardSections } from '../../../hooks/useDashboardSections';
import type { PanelKind } from '../../../Panels/types/panelKind';
import { PANEL_TYPES } from './constants';
import PanelTypeSelectionModalFooter from './PanelTypeSelectionModalFooter';
import { buildSectionOptions, resolveDefaultSectionValue } from './utils';
import styles from './PanelTypeSelectionModal.module.scss';

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

	// With more than one section the user must pick a target section, so we keep
	// the select-then-confirm flow. Otherwise there's nothing to choose: hide the
	// footer and let a tile click create the panel outright.
	const hasSectionPicker = options.length > 1;

	const [selectedValue, setSelectedValue] = useState('');
	const [selectedPanelKind, setSelectedPanelKind] = useState<PanelKind | null>(
		null,
	);

	// Seed the target section on open.
	useEffect(() => {
		if (open) {
			setSelectedValue(resolveDefaultSectionValue(options, defaultLayoutIndex));
			setSelectedPanelKind(null);
		}
	}, [open, options, defaultLayoutIndex]);

	const createPanel = (panelKind: PanelKind): void => {
		const layoutIndex = selectedValue === '' ? undefined : Number(selectedValue);
		onSelect(panelKind, layoutIndex);
	};

	const handleTileClick = (panelKind: PanelKind): void => {
		if (hasSectionPicker) {
			setSelectedPanelKind(panelKind);
			return;
		}
		createPanel(panelKind);
	};

	const handleConfirm = (): void => {
		if (selectedPanelKind === null) {
			return;
		}
		createPanel(selectedPanelKind);
	};

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title="New Panel"
			footer={
				hasSectionPicker ? (
					<PanelTypeSelectionModalFooter
						options={options}
						selectedValue={selectedValue}
						onSectionChange={setSelectedValue}
						isConfirmDisabled={selectedPanelKind === null}
						onConfirm={handleConfirm}
					/>
				) : undefined
			}
		>
			<div className={styles.panelTypeSection}>
				{hasSectionPicker && (
					<span className={styles.pickerLabel}>Select panel type</span>
				)}
				<div className={styles.grid}>
					{PANEL_TYPES.map(({ panelKind, label, Icon }) => (
						<button
							key={panelKind}
							type="button"
							className={cx(styles.panelTypeCard, {
								[styles.panelTypeCardSelected]: panelKind === selectedPanelKind,
							})}
							data-testid={`panel-type-${panelKind}`}
							aria-pressed={panelKind === selectedPanelKind}
							onClick={(): void => handleTileClick(panelKind)}
						>
							<Icon size={24} color={Color.BG_ROBIN_400} />
							{label}
						</button>
					))}
				</div>
			</div>
		</DialogWrapper>
	);
}

export default PanelTypeSelectionModal;
