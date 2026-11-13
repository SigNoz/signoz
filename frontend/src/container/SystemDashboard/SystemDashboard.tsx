import { Typography } from '@signozhq/ui/typography';
import Spinner from 'components/Spinner';
import DashboardContainer from 'pages/DashboardPage/DashboardContainer';
import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';

import type { SystemDashboardHost } from './systemDashboardHost';
import { useSystemDashboard } from './useSystemDashboard';
import styles from './SystemDashboard.module.scss';

interface SystemDashboardProps {
	host: SystemDashboardHost;
	controls?: DashboardControlsInput;
}

/** A shipped, read-only system dashboard, embedded in a feature page. */
function SystemDashboard({
	host,
	controls,
}: SystemDashboardProps): JSX.Element {
	const { dashboard, isLoading, isError, error, refetch } =
		useSystemDashboard(host);

	if (isLoading) {
		return <Spinner tip="Loading dashboard..." />;
	}

	if (isError || !dashboard) {
		return (
			<div className={styles.errorState} data-testid="system-dashboard-error">
				<Typography.Title>Failed to load dashboard</Typography.Title>
				<Typography.Text>
					{error?.response?.data?.error?.message ?? error?.message}
				</Typography.Text>
			</div>
		);
	}

	return (
		<DashboardContainer
			dashboard={dashboard}
			refetch={refetch}
			source={host.source}
			readOnly
			controls={controls}
		/>
	);
}

export default SystemDashboard;
