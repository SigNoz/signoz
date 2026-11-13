import { useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesGettablePublicDashboardDataV2DTO } from 'api/generated/services/sigNoz.schemas';
import { PublicDashboardSchema } from 'hooks/dashboard/useGetResolvedPublicDashboard';
import { noop } from 'lodash-es';
import DashboardContainer from 'pages/DashboardPage/DashboardContainer';

import signozBrandLogoUrl from '@/assets/Logos/signoz-brand-logo.svg';

import { usePublicDashboardTime } from '../hooks/usePublicDashboardTime';
import { createPublicDashboardHost } from '../publicDashboardHost';
import styles from './PublicDashboardView.module.scss';

interface PublicDashboardViewProps {
	publicDashboardId: string;
	data: DashboardtypesGettablePublicDashboardDataV2DTO;
}

/** A shared link: the SigNoz header, then the dashboard read-only on the public endpoint. */
function PublicDashboardView({
	publicDashboardId,
	data,
}: PublicDashboardViewProps): JSX.Element {
	const timeRangeEnabled = data.publicDashboard?.timeRangeEnabled ?? false;
	const host = useMemo(
		() => createPublicDashboardHost(publicDashboardId, { timeRangeEnabled }),
		[publicDashboardId, timeRangeEnabled],
	);
	const dashboard = useMemo(
		() => host.select({ schema: PublicDashboardSchema.V2, data }),
		[host, data],
	);
	const isTimeReady = usePublicDashboardTime({
		defaultTimeRange: data.publicDashboard?.defaultTimeRange,
		timeRangeEnabled,
	});

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.headerLeft}>
					<div className={styles.brand}>
						<img src={signozBrandLogoUrl} alt="SigNoz" className={styles.brandLogo} />
						<Typography className={styles.brandName}>SigNoz</Typography>
					</div>
					<Typography.Text className={styles.title}>
						{dashboard?.spec?.display?.name}
					</Typography.Text>
				</div>
			</div>
			{isTimeReady && dashboard && (
				<div className={styles.content}>
					<DashboardContainer
						dashboard={dashboard}
						// A public link is a fixed snapshot of the shared spec.
						refetch={noop}
						source={host.source}
						readOnly={host.readOnly}
						controls={host.controls}
						queryRunner={host.queryRunner}
					/>
				</div>
			)}
		</div>
	);
}

export default PublicDashboardView;
