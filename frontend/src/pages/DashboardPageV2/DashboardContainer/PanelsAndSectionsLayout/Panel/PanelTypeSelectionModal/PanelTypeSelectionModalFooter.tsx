import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import SectionPicker from './SectionPicker';
import type { SectionOption } from './types';
import styles from './PanelTypeSelectionModal.module.scss';

interface PanelTypeSelectionModalFooterProps {
	options: SectionOption[];
	selectedValue: string;
	onSectionChange: (value: string) => void;
	/** Disabled until a panel type is picked. */
	isConfirmDisabled: boolean;
	onConfirm: () => void;
}

/**
 * Footer for the New Panel modal: an "Add panel to" section picker (shown only
 * when the dashboard has more than one section) and the confirm button.
 */
function PanelTypeSelectionModalFooter({
	options,
	selectedValue,
	onSectionChange,
	isConfirmDisabled,
	onConfirm,
}: PanelTypeSelectionModalFooterProps): JSX.Element {
	const hasSectionPicker = options.length > 1;

	return (
		<div className={styles.footerActions}>
			{hasSectionPicker && (
				<div className={styles.footerPicker}>
					<span className={styles.pickerLabel}>Add panel to</span>
					<SectionPicker
						options={options}
						value={selectedValue}
						onChange={onSectionChange}
					/>
				</div>
			)}
			<Button
				color="primary"
				size="md"
				disabled={isConfirmDisabled}
				prefix={<Plus size={16} />}
				onClick={onConfirm}
				testId="panel-type-confirm"
			>
				Add Panel
			</Button>
		</div>
	);
}

export default PanelTypeSelectionModalFooter;
