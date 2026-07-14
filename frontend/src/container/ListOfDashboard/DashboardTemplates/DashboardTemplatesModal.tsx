import { Modal } from 'antd';

import DashboardTemplatesContent from './DashboardTemplatesContent';

import './DashboardTemplatesModal.styles.scss';

interface DashboardTemplatesModalProps {
	showNewDashboardTemplatesModal: boolean;
	onCreateNewDashboard: () => void;
	onCancel: () => void;
}

export default function DashboardTemplatesModal({
	showNewDashboardTemplatesModal,
	onCreateNewDashboard,
	onCancel,
}: DashboardTemplatesModalProps): JSX.Element {
	return (
		<Modal
			wrapClassName="new-dashboard-templates-modal"
			open={showNewDashboardTemplatesModal}
			centered
			closable={false}
			footer={null}
			destroyOnClose
			width="60vw"
		>
			<DashboardTemplatesContent
				onCreateNewDashboard={onCreateNewDashboard}
				onCancel={onCancel}
			/>
		</Modal>
	);
}
