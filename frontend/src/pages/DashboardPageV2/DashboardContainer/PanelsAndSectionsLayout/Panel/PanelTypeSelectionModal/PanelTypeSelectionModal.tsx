import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import cx from 'classnames';

import { useDashboardSections } from '../../../hooks/useDashboardSections';
import type { PanelKind } from '../../../Panels/types/panelKind';
import { PANEL_TYPES } from './constants';
import SectionPicker from './SectionPicker';
import { buildSectionOptions, resolveDefaultSectionValue } from './utils';
import styles from './PanelTypeSelectionModal.module.scss';
import { Plus } from '@signozhq/icons';

interface PanelTypeSelectionModalProps {
	open: boolean;
	onClose: () => void;
	onSelect: (panelKind: PanelKind, layoutIndex?: number) => void;
	/** Section the picker opens on; omit → the untitled root / first section. */
	defaultLayoutIndex?: number;
}

/** Fake loader shown on the confirm button before navigating to the editor. */
const CONFIRM_LOADER_MS = 500;

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
	const [selectedPanelKind, setSelectedPanelKind] = useState<PanelKind | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimer = useCallback((): void => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	// Seed the target section on open; cancel a pending navigation on close.
	useEffect(() => {
		if (open) {
			setSelectedValue(resolveDefaultSectionValue(options, defaultLayoutIndex));
			setSelectedPanelKind(null);
			setIsSubmitting(false);
		} else {
			clearTimer();
		}
	}, [open, options, defaultLayoutIndex, clearTimer]);

	useEffect(() => clearTimer, [clearTimer]);

	const handleConfirm = (): void => {
		if (selectedPanelKind === null || isSubmitting) {
			return;
		}
		setIsSubmitting(true);
		const layoutIndex = selectedValue === '' ? undefined : Number(selectedValue);
		timerRef.current = setTimeout(() => {
			onSelect(selectedPanelKind, layoutIndex);
		}, CONFIRM_LOADER_MS);
	};

	// Footer is always shown; the confirm button is disabled until a panel type is picked.
	const footer = (
		<div className={styles.footerActions}>
			{hasSectionPicker && (
				<div className={styles.footerPicker}>
					<span className={styles.pickerLabel}>Add panel to</span>
					<SectionPicker
						options={options}
						value={selectedValue}
						onChange={setSelectedValue}
					/>
				</div>
			)}
			<Button
				color="primary"
				size="md"
				disabled={selectedPanelKind === null}
				loading={isSubmitting}
				prefix={<Plus size={16} />}
				onClick={handleConfirm}
				testId="panel-type-confirm"
			>
				Add Panel
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title="New Panel"
			footer={footer}
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
