import { memo } from 'react';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';

import DashboardPageBreadcrumbs from './DashboardPageBreadcrumbs';
import { useShareVariablesOption } from './useShareVariablesOption';

import styles from './DashboardPageHeader.module.scss';

interface DashboardPageHeaderProps {
	title: string;
	image: string;
}

function DashboardPageHeader({
	title,
	image,
}: DashboardPageHeaderProps): JSX.Element {
	const shareVariablesOption = useShareVariablesOption();
	return (
		<div className={styles.dashboardPageHeader}>
			<DashboardPageBreadcrumbs title={title} image={image} />
			<HeaderRightSection
				enableAnnouncements={false}
				enableShare
				enableFeedback
				shareModalExtraOption={shareVariablesOption}
			/>
		</div>
	);
}

export default memo(DashboardPageHeader);
