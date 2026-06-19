import { Globe, RefreshCw, Trash } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import styles from './PublicDashboardActions.module.scss';

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
		<div className={styles.footer}>
			{isPublic ? (
				<>
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
				</>
			) : (
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
			)}
		</div>
	);
}

export default PublicDashboardActions;
