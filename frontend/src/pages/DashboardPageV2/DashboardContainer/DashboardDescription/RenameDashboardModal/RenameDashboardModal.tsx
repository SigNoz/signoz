import { Input, Modal } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Check, X } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from '../DashboardDescription.module.scss';

interface Props {
	open: boolean;
	value: string;
	isLoading: boolean;
	onChange: (value: string) => void;
	onRename: () => void;
	onClose: () => void;
}

function RenameDashboardModal({
	open,
	value,
	isLoading,
	onChange,
	onRename,
	onClose,
}: Props): JSX.Element {
	return (
		<Modal
			open={open}
			title="Rename Dashboard"
			onOk={onRename}
			onCancel={onClose}
			rootClassName={styles.renameDashboard}
			footer={
				<div className={styles.dashboardRename}>
					<Button
						variant="solid"
						color="primary"
						prefix={<Check size={14} />}
						className={styles.renameBtn}
						onClick={onRename}
						disabled={isLoading}
					>
						Rename Dashboard
					</Button>
					<Button
						variant="ghost"
						prefix={<X size={14} />}
						className={styles.cancelBtn}
						onClick={onClose}
					>
						Cancel
					</Button>
				</div>
			}
		>
			<div className={styles.dashboardContent}>
				<Typography.Text className={styles.nameText}>
					Enter a new name
				</Typography.Text>
				<Input
					data-testid="dashboard-name"
					className={styles.dashboardNameInput}
					value={value}
					onChange={(e): void => onChange(e.target.value)}
				/>
			</div>
		</Modal>
	);
}

export default RenameDashboardModal;
