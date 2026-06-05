import { memo } from 'react';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';

import DashboardBreadcrumbs from './DashboardBreadcrumbs';

import styles from './DashboardHeader.module.scss';

interface Props {
	title: string;
	image: string;
}

function DashboardHeader({ title, image }: Props): JSX.Element {
	return (
		<div className={styles.dashboardHeader}>
			<DashboardBreadcrumbs title={title} image={image} />
			<HeaderRightSection enableAnnouncements={false} enableShare enableFeedback />
		</div>
	);
}

export default memo(DashboardHeader);
