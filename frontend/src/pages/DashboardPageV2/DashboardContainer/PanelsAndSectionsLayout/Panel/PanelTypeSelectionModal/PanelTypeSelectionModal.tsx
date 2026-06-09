import { Modal } from 'antd';
import { Button } from '@signozhq/ui/button';

import { PANEL_TYPES } from './constants';
import styles from './PanelTypeSelectionModal.module.scss';

interface PanelTypeSelectionModalProps {
	open: boolean;
	onClose: () => void;
	onSelect: (pluginKind: string) => void;
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
				{PANEL_TYPES.map((type) => (
					<Button
						key={type.pluginKind}
						type="button"
						variant="ghost"
						className={styles.typeButton}
						data-testid={`panel-type-${type.pluginKind}`}
						onClick={(): void => onSelect(type.pluginKind)}
					>
						{type.icon}
						{type.label}
					</Button>
				))}
			</div>
		</Modal>
	);
}

export default PanelTypeSelectionModal;
