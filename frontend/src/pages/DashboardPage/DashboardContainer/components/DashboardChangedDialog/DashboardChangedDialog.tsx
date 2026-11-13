import { RotateCcw } from '@signozhq/icons';
import { AlertDialog } from '@signozhq/ui/alert-dialog';
import logEvent from 'api/common/logEvent';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';

import { useDashboardStore } from '../../store/useDashboardStore';

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
	const dashboardId = useDashboardStore((s) => s.dashboardId);

	const handleReload = (): void => {
		void logEvent(DashboardDetailEvents.StaleReloadPrompted, {
			dashboardId,
			action: 'reload',
		});
		onReload();
	};

	const handleDismiss = (): void => {
		void logEvent(DashboardDetailEvents.StaleReloadPrompted, {
			dashboardId,
			action: 'dismiss',
		});
		onDismiss();
	};

	return (
		<AlertDialog
			open={open}
			title="Dashboard updated elsewhere"
			color="primary"
			confirmText="Reload"
			confirmIcon={<RotateCcw size={12} />}
			cancelText="Dismiss"
			onConfirm={handleReload}
			onCancel={handleDismiss}
			testId="dashboard-changed"
		>
			This dashboard was changed in another tab or by another user. Reload to see
			the latest version.
		</AlertDialog>
	);
}

export default DashboardChangedDialog;
