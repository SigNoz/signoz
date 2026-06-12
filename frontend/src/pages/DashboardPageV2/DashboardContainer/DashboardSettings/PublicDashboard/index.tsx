import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import PublicDashboardActions from './PublicDashboardActions';
import PublicDashboardCallout from './PublicDashboardCallout';
import PublicDashboardSettingsForm from './PublicDashboardSettingsForm';
import PublicDashboardStatus from './PublicDashboardStatus';
import PublicDashboardUrl from './PublicDashboardUrl';
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
		<div className={styles.publicDashboardCard}>
			<PublicDashboardStatus isPublic={isPublic} />

			<PublicDashboardSettingsForm
				timeRangeEnabled={timeRangeEnabled}
				defaultTimeRange={defaultTimeRange}
				disabled={controlsDisabled}
				onTimeRangeEnabledChange={setTimeRangeEnabled}
				onDefaultTimeRangeChange={setDefaultTimeRange}
			/>

			{isPublic && (
				<PublicDashboardUrl
					url={publicUrl}
					onCopy={onCopyUrl}
					onOpen={onOpenUrl}
				/>
			)}

			<PublicDashboardCallout />

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
