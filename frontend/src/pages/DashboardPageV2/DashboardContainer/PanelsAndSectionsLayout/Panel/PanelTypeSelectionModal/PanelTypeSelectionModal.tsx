import { Color } from '@signozhq/design-tokens';
import { DialogWrapper } from '@signozhq/ui/dialog';

import type { PanelKind } from '../../../Panels/types/panelKind';
import { PANEL_TYPES } from './constants';
import styles from './PanelTypeSelectionModal.module.scss';

interface PanelTypeSelectionModalProps {
	open: boolean;
	onClose: () => void;
	onSelect: (panelKind: PanelKind) => void;
}

function PanelTypeSelectionModal({
	open,
	onClose,
	onSelect,
}: PanelTypeSelectionModalProps): JSX.Element {
	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title="Select a panel type"
		>
			<div className={styles.grid}>
				{PANEL_TYPES.map(({ panelKind, label, Icon }) => (
					<button
						key={panelKind}
						type="button"
						className={styles.panelTypeCard}
						data-testid={`panel-type-${panelKind}`}
						onClick={(): void => onSelect(panelKind)}
					>
						<Icon size={24} color={Color.BG_ROBIN_400} />
						{label}
					</button>
				))}
			</div>
		</DialogWrapper>
	);
}

export default PanelTypeSelectionModal;
