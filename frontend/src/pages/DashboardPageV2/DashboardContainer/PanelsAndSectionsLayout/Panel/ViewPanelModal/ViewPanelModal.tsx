import { Modal } from 'antd';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import ViewPanelModalContent from './ViewPanelModalContent';
import styles from './ViewPanelModal.module.scss';
import { TooltipSimple } from '@signozhq/ui/tooltip';

interface ViewPanelModalProps {
	/**
	 * The expanded panel and its id. Absent while the modal is closed — a single
	 * host instance lives at the layout level and only carries a panel when open.
	 */
	panel?: DashboardtypesPanelDTO;
	panelId?: string;
	open: boolean;
	onClose: () => void;
}

function ViewPanelModal({
	panel,
	panelId,
	open,
	onClose,
}: ViewPanelModalProps): JSX.Element {
	const name = panel?.spec.display.name ?? '';

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			centered
			width="85%"
			destroyOnClose
			className={styles.modal}
			title={
				<TooltipSimple title={name} arrow>
					<span className={styles.title}>{name} - (View mode)</span>
				</TooltipSimple>
			}
		>
			{open && panel && panelId && (
				<ViewPanelModalContent panel={panel} panelId={panelId} onClose={onClose} />
			)}
		</Modal>
	);
}

export default ViewPanelModal;
