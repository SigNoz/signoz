import { memo } from 'react';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';

import { useDashboardControlGroup } from '../../controls/useDashboardControlGroup';
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
	const headerControls = useDashboardControlGroup('header');
	return (
		<div className={styles.dashboardPageHeader}>
			{headerControls.breadcrumbs && (
				<DashboardPageBreadcrumbs title={title} image={image} />
			)}
			<HeaderRightSection
				enableAnnouncements={false}
				enableShare={headerControls.share}
				enableFeedback={headerControls.feedback}
				shareModalExtraOption={shareVariablesOption}
			/>
		</div>
	);
}

export default memo(DashboardPageHeader);
