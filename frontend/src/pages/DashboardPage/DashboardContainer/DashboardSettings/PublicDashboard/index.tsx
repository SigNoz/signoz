import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import PublicDashboardActions from './PublicDashboardActions/PublicDashboardActions';
import PublicDashboardHint from './PublicDashboardHint/PublicDashboardHint';
import PublicDashboardSettingsForm from './PublicDashboardSettingsForm/PublicDashboardSettingsForm';
import PublicDashboardStatus from './PublicDashboardStatus/PublicDashboardStatus';
import PublicDashboardUrl from './PublicDashboardUrl/PublicDashboardUrl';
import { usePublicDashboard } from './usePublicDashboard';
import styles from './PublicDashboard.module.scss';

interface PublicDashboardSettingsProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

function PublicDashboardSettings({
	dashboard,
}: PublicDashboardSettingsProps): JSX.Element {
	const {
		isPublic,
		isAdmin,
		isLoading,
		isPublishing,
		isUpdating,
		isUnpublishing,
		timeRangeEnabled,
		defaultTimeRange,
		publicUrl,
		setTimeRangeEnabled,
		setDefaultTimeRange,
		onPublish,
		onUpdate,
		onUnpublish,
		onCopyUrl,
		onOpenUrl,
	} = usePublicDashboard(dashboard.id);

	const controlsDisabled = isLoading || !isAdmin;

	return (
		<div className={styles.publishTab}>
			<div className={styles.content}>
				<PublicDashboardStatus isPublic={isPublic} />

				<PublicDashboardUrl
					isPublic={isPublic}
					url={publicUrl}
					onCopy={onCopyUrl}
					onOpen={onOpenUrl}
				/>

				<PublicDashboardSettingsForm
					timeRangeEnabled={timeRangeEnabled}
					defaultTimeRange={defaultTimeRange}
					disabled={controlsDisabled}
					onTimeRangeEnabledChange={setTimeRangeEnabled}
					onDefaultTimeRangeChange={setDefaultTimeRange}
				/>
			</div>

			<PublicDashboardHint />

			<PublicDashboardActions
				isPublic={isPublic}
				disabled={controlsDisabled}
				isPublishing={isPublishing}
				isUpdating={isUpdating}
				isUnpublishing={isUnpublishing}
				onPublish={onPublish}
				onUpdate={onUpdate}
				onUnpublish={onUnpublish}
			/>
		</div>
	);
}

export default PublicDashboardSettings;
