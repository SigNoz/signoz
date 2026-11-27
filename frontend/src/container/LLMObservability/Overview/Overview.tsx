import { useEffect } from 'react';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import DashboardContainer from 'pages/DashboardPage/DashboardContainer';
import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';

import {
	SYSTEM_DASHBOARD_SOURCE,
	useSystemDashboard,
} from './hooks/useSystemDashboard';
import styles from './Overview.module.scss';

// Embedded under the AI Observability tabs, which own the page header.
const EMBEDDED_CONTROLS: DashboardControlsInput = {
	header: false,
	title: false,
	dashboardActions: false,
};

function Overview(): JSX.Element {
	const { dashboard, isLoading, isError, error, refetch } = useSystemDashboard();

	useEffect(() => {
		void logEvent('AI Observability Overview: Page visited', {});
	}, []);

	const renderContent = (): JSX.Element => {
		if (isLoading) {
			return <Spinner tip="Loading dashboard..." />;
		}

		if (isError || !dashboard) {
			return (
				<div className={styles.errorState}>
					<Typography
						variant="label"
						size="large"
						weight="bold"
						color="inherit"
						as="h1"
						marginY={4}
						textOverflow="wrap"
					>
						Failed to load dashboard
					</Typography>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						{error?.response?.data?.error?.message ?? error?.message}
					</Typography>
				</div>
			);
		}

		return (
			<DashboardContainer
				dashboard={dashboard}
				refetch={refetch}
				source={SYSTEM_DASHBOARD_SOURCE}
				readOnly
				controls={EMBEDDED_CONTROLS}
			/>
		);
	};

	return (
		<div className={styles.overview} data-testid="llm-observability-overview">
			{renderContent()}
		</div>
	);
}

export default Overview;
