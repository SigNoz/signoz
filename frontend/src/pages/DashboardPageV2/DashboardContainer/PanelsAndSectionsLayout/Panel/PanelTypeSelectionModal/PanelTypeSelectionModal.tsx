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

	const handleConfirm = (): void => {
		if (selectedPanelKind === null) {
			return;
		}
		const layoutIndex = selectedValue === '' ? undefined : Number(selectedValue);
		onSelect(selectedPanelKind, layoutIndex);
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
				<PanelTypeSelectionModalFooter
					options={options}
					selectedValue={selectedValue}
					onSectionChange={setSelectedValue}
					isConfirmDisabled={selectedPanelKind === null}
					onConfirm={handleConfirm}
				/>
			}
		>
			<div className={styles.panelTypeSection}>
				<span className={styles.pickerLabel}>Select panel type</span>
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
							onClick={(): void => setSelectedPanelKind(panelKind)}
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
