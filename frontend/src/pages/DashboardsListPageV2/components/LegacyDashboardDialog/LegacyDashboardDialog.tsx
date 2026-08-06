import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';
import { ArrowUpRight, Copy, RotateCw } from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import { handleContactSupport } from 'container/Integrations/utils';
import { DASHBOARD_NO_EDIT_PERMISSION_REASON } from 'hooks/dashboards/dashboardPermissionReasons';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';

import { useRetryMigration } from '../../hooks/useRetryMigration';

import styles from './LegacyDashboardDialog.module.scss';

interface LegacyDashboardDialogProps {
	open: boolean;
	dashboardId: string;
	dashboardName: string;
	onClose: () => void;
}

/**
 * Explains why a legacy (pre-v2) dashboard can't be opened in the new experience
 * and offers to re-run the migration. Legacy rows are surfaced by the list API
 * with `legacy: true` but have no v2 spec to render. Retrying runs a migrate
 * call, which the backend gates on dashboard:update.
 */
function LegacyDashboardDialog({
	open,
	dashboardId,
	dashboardName,
	onClose,
}: LegacyDashboardDialogProps): JSX.Element {
	const [, copyToClipboard] = useCopyToClipboard();
	const { isCloudUser } = useGetTenantLicense();
	const { retryMigration, isMigrating } = useRetryMigration(onClose);
	const { canEdit, editChecks } = useDashboardPermissions(dashboardId);

	const onCopyId = (): void => {
		copyToClipboard(dashboardId);
		toast.success('Dashboard ID copied');
		void logEvent(DashboardListEvents.LegacyDialogAction, {
			action: 'copyId',
			dashboardId,
		});
	};

	const onContactSupport = (): void => {
		handleContactSupport(!!isCloudUser);
		void logEvent(DashboardListEvents.LegacyDialogAction, {
			action: 'contactSupport',
			dashboardId,
		});
	};

	const onRetryMigration = (): void => {
		retryMigration(dashboardId);
		void logEvent(DashboardListEvents.LegacyDialogAction, {
			action: 'retryMigration',
			dashboardId,
		});
	};

	return (
		<DialogWrapper
			title="This dashboard isn't available in the new experience"
			open={open}
			width="narrow"
			onOpenChange={(next): void => {
				if (!next) {
					onClose();
				}
			}}
			footer={
				<div className={styles.footer}>
					<Button
						variant="ghost"
						color="secondary"
						size="md"
						disabled={isMigrating}
						onClick={onClose}
						testId="legacy-dashboard-close"
					>
						Close
					</Button>
					<Button
						variant={canEdit ? 'outlined' : 'solid'}
						color={canEdit ? 'secondary' : 'primary'}
						size="md"
						suffix={<ArrowUpRight size={14} />}
						onClick={onContactSupport}
						testId="legacy-dashboard-contact-support"
					>
						Contact Support
					</Button>
					<AuthZButton
						checks={editChecks}
						tooltipMessage={DASHBOARD_NO_EDIT_PERMISSION_REASON}
						withPortal={false}
						variant="solid"
						color="primary"
						size="md"
						prefix={<RotateCw size={14} />}
						disabled={isMigrating}
						loading={isMigrating}
						onClick={onRetryMigration}
						testId="legacy-dashboard-retry-migration"
					>
						Retry migration
					</AuthZButton>
				</div>
			}
		>
			<div className={styles.body}>
				<Typography.Text className={styles.description}>
					<strong>{dashboardName || 'This dashboard'}</strong> hasn&apos;t been
					migrated to the new dashboard experience yet, so it can&apos;t be opened
					here.{' '}
					{canEdit
						? "Retrying the migration often works once we've handled the case that blocked it. If it still fails, share the dashboard ID below with support."
						: "Share the dashboard ID below with support and we'll help you move it over."}
				</Typography.Text>

				<div className={styles.idField}>
					<Typography.Text className={styles.idLabel}>Dashboard ID</Typography.Text>
					<div className={styles.idRow}>
						<Typography.Text
							className={styles.idValue}
							data-testid="legacy-dashboard-id"
						>
							{dashboardId}
						</Typography.Text>
						<Button
							variant="ghost"
							color="secondary"
							size="icon"
							prefix={<Copy size={14} />}
							aria-label="Copy dashboard ID"
							onClick={onCopyId}
							testId="legacy-dashboard-copy-id"
						/>
					</div>
				</div>
			</div>
		</DialogWrapper>
	);
}

export default LegacyDashboardDialog;
