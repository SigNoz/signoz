import { Modal } from 'antd';
import { Button } from '@signozhq/ui/button';

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
		<Modal
			open={open}
			title="Select a panel type"
			onCancel={onClose}
			footer={null}
			destroyOnClose
		>
			<div className={styles.grid}>
				{PANEL_TYPES.map(({ panelKind, label, Icon }) => (
					<Button
						key={panelKind}
						type="button"
						variant="ghost"
						className={styles.typeButton}
						data-testid={`panel-type-${panelKind}`}
						onClick={(): void => onSelect(panelKind)}
					>
						<Icon size={14} />
						{label}
					</Button>
				))}
			</div>
		</Modal>
	);
}

export default PanelTypeSelectionModal;
