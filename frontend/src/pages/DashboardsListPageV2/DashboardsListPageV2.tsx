import { useState } from 'react';
import { AnnouncementBanner } from '@signozhq/ui/announcement-banner';
import { LayoutGrid } from '@signozhq/icons';

import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import DashboardsList from './components/DashboardsList/DashboardsList';

import styles from './DashboardsListPageV2.module.scss';
import { BreadcrumbLink } from '@signozhq/ui/breadcrumb';

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
					<BreadcrumbLink icon={<LayoutGrid size={14} />}>Dashboard</BreadcrumbLink>
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
