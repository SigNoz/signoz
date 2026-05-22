import { useState } from 'react';
import { AnnouncementBanner } from '@signozhq/ui/announcement-banner';
import { Typography } from '@signozhq/ui/typography';
import { LayoutGrid } from '@signozhq/icons';

import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import DashboardsList from './components/DashboardsList';

import styles from './DashboardsListPageV2.module.scss';

function DashboardsListPageV2(): JSX.Element {
	const [showBanner, setShowBanner] = useState(true);

	return (
		<div className={styles.page}>
			{showBanner && (
				<AnnouncementBanner
					type="warning"
					onClose={(): void => setShowBanner(false)}
				>
					You&apos;re on the V2 dashboards page. If you landed here unintentionally,
					please reach out to Ashwin.
				</AnnouncementBanner>
			)}
			<div className={styles.header}>
				<div className={styles.headerLeft}>
					<LayoutGrid size={14} className={styles.icon} />
					<Typography.Text className={styles.text}>Dashboards</Typography.Text>
				</div>
				<HeaderRightSection
					enableAnnouncements={false}
					enableShare
					enableFeedback
				/>
			</div>
			<DashboardsList />
		</div>
	);
}

export default DashboardsListPageV2;
