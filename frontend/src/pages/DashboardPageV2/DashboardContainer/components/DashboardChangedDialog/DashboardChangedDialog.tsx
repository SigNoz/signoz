import { RotateCcw } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';

import styles from './DashboardChangedDialog.module.scss';

interface DashboardChangedDialogProps {
	open: boolean;
	onReload: () => void;
	onDismiss: () => void;
}

function DashboardChangedDialog({
	open,
	onReload,
	onDismiss,
}: DashboardChangedDialogProps): JSX.Element {
	const footer = (
		<div className={styles.footer}>
			<Button
				variant="solid"
				color="secondary"
				onClick={onDismiss}
				testId="dashboard-changed-dismiss"
			>
				Dismiss
			</Button>
			<Button
				variant="solid"
				color="primary"
				prefix={<RotateCcw size={12} />}
				onClick={onReload}
				testId="dashboard-changed-reload"
			>
				Reload
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onDismiss();
				}
			}}
			title="Dashboard updated elsewhere"
			width="narrow"
			showCloseButton={false}
			footer={footer}
		>
			<div className={styles.body}>
				This dashboard was changed in another tab or by another user. Reload to see
				the latest version.
			</div>
		</DialogWrapper>
	);
}

export default DashboardChangedDialog;
