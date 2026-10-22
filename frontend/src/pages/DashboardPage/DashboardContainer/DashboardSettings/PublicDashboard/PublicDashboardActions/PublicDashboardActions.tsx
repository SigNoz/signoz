import { Globe, RefreshCw, Trash } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import styles from './PublicDashboardActions.module.scss';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

interface PublicDashboardActionsProps {
	isPublic: boolean;
	/**
	 * Why publishing is unavailable. Non-empty both disables the buttons and
	 * explains them, so they cannot be disabled silently.
	 */
	checks: BrandedPermission[];
	/** In-flight config read — transient, and a spinner explains itself. */
	isLoading?: boolean;
	isPublishing: boolean;
	isUpdating: boolean;
	isUnpublishing: boolean;
	onPublish: () => void;
	onUpdate: () => void;
	onUnpublish: () => void;
}

function PublicDashboardActions({
	isPublic,
	checks,
	isLoading = false,
	isPublishing,
	isUpdating,
	isUnpublishing,
	onPublish,
	onUpdate,
	onUnpublish,
}: PublicDashboardActionsProps): JSX.Element {
	return (
		<div className={styles.footer}>
			{isPublic ? (
				<>
					<AuthZTooltip checks={checks}>
						<Button
							size="md"
							variant="solid"
							color="danger"
							loading={isLoading || isUnpublishing}
							prefix={<Trash size={15} />}
							testId="public-dashboard-unpublish"
							onClick={onUnpublish}
						>
							Unpublish Dashboard
						</Button>
					</AuthZTooltip>
					<AuthZTooltip checks={checks}>
						<Button
							size="md"
							variant="solid"
							color="primary"
							loading={isLoading || isUpdating}
							prefix={<RefreshCw size={15} />}
							testId="public-dashboard-update"
							onClick={onUpdate}
						>
							Update Dashboard
						</Button>
					</AuthZTooltip>
				</>
			) : (
				<AuthZTooltip checks={checks}>
					<Button
						size="md"
						variant="solid"
						color="primary"
						loading={isLoading || isPublishing}
						prefix={<Globe size={15} />}
						testId="public-dashboard-publish"
						onClick={onPublish}
					>
						Publish Dashboard
					</Button>
				</AuthZTooltip>
			)}
		</div>
	);
}

export default PublicDashboardActions;
