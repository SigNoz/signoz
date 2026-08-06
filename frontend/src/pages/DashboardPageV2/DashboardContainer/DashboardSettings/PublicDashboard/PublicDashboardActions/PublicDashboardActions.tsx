import { Globe, RefreshCw, Trash } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import DisabledControlTooltip from '../../../components/DisabledControlTooltip/DisabledControlTooltip';
import styles from './PublicDashboardActions.module.scss';

interface PublicDashboardActionsProps {
	isPublic: boolean;
	disabled: boolean;
	/** Why publishing is unavailable; '' while the check is in flight. */
	disabledReason?: string;
	isPublishing: boolean;
	isUpdating: boolean;
	isUnpublishing: boolean;
	onPublish: () => void;
	onUpdate: () => void;
	onUnpublish: () => void;
}

function PublicDashboardActions({
	isPublic,
	disabled,
	disabledReason = '',
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
					<DisabledControlTooltip reason={disabledReason} disabled={disabled}>
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
					<DisabledControlTooltip reason={disabledReason} disabled={disabled}>
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
				<DisabledControlTooltip reason={disabledReason} disabled={disabled}>
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
