import { LayoutGrid } from '@signozhq/icons';

import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import DashboardsList from './components/DashboardsList/DashboardsList';

import styles from './DashboardsListPage.module.scss';
import { BreadcrumbLink } from '@signozhq/ui/breadcrumb';

function DashboardsListPage(): JSX.Element {
	return (
		<div className={styles.page}>
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

export default DashboardsListPage;
