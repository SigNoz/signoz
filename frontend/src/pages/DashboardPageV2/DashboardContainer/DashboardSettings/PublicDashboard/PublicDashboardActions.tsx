import { Globe, Trash } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import styles from './PublicDashboard.module.scss';

interface PublicDashboardActionsProps {
	isPublic: boolean;
	disabled: boolean;
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
	isPublishing,
	isUpdating,
	isUnpublishing,
	onPublish,
	onUpdate,
	onUnpublish,
}: PublicDashboardActionsProps): JSX.Element {
	return (
		<div className={styles.actions}>
			{isPublic ? (
				<>
					<Button
						variant="outlined"
						color="destructive"
						disabled={disabled}
						loading={isUnpublishing}
						prefix={<Trash size={14} />}
						testId="public-dashboard-unpublish"
						onClick={onUnpublish}
					>
						Unpublish dashboard
					</Button>
					<Button
						variant="solid"
						color="primary"
						disabled={disabled}
						loading={isUpdating}
						prefix={<Globe size={14} />}
						testId="public-dashboard-update"
						onClick={onUpdate}
					>
						Update published dashboard
					</Button>
				</>
			) : (
				<Button
					variant="solid"
					color="primary"
					disabled={disabled}
					loading={isPublishing}
					prefix={<Globe size={14} />}
					testId="public-dashboard-publish"
					onClick={onPublish}
				>
					Publish dashboard
				</Button>
			)}
		</div>
	);
}

export default PublicDashboardActions;
