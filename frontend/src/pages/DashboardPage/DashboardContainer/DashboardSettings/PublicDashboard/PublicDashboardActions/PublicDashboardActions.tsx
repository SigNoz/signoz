import { Globe, RefreshCw, Trash } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import DisabledControlTooltip from '../../../components/DisabledControlTooltip/DisabledControlTooltip';
import styles from './PublicDashboardActions.module.scss';

interface PublicDashboardActionsProps {
	isPublic: boolean;
	/**
	 * Why publishing is unavailable. Non-empty both disables the buttons and
	 * explains them, so they cannot be disabled silently.
	 */
	disabledReason?: string;
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
	disabledReason = '',
	isLoading = false,
	isPublishing,
	isUpdating,
	isUnpublishing,
	onPublish,
	onUpdate,
	onUnpublish,
}: PublicDashboardActionsProps): JSX.Element {
	const disabled = isLoading || !!disabledReason;

	return (
		<div className={styles.footer}>
			{isPublic ? (
				<>
					<DisabledControlTooltip reason={disabledReason}>
						<Button
							variant="outlined"
							color="destructive"
							disabled={disabled}
							loading={isUnpublishing}
							prefix={<Trash size={15} />}
							testId="public-dashboard-unpublish"
							onClick={onUnpublish}
						>
							Unpublish Dashboard
						</Button>
					</DisabledControlTooltip>
					<DisabledControlTooltip reason={disabledReason}>
						<Button
							variant="solid"
							color="primary"
							disabled={disabled}
							loading={isUpdating}
							prefix={<RefreshCw size={15} />}
							testId="public-dashboard-update"
							onClick={onUpdate}
						>
							Update Dashboard
						</Button>
					</DisabledControlTooltip>
				</>
			) : (
				<DisabledControlTooltip reason={disabledReason}>
					<Button
						variant="solid"
						color="primary"
						disabled={disabled}
						loading={isPublishing}
						prefix={<Globe size={15} />}
						testId="public-dashboard-publish"
						onClick={onPublish}
					>
						Publish Dashboard
					</Button>
				</DisabledControlTooltip>
			)}
		</div>
	);
}

export default PublicDashboardActions;
