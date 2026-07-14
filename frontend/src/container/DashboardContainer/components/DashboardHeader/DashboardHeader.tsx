import { memo } from 'react';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';

import DashboardBreadcrumbs from './DashboardBreadcrumbs';

import './DashboardHeader.styles.scss';

function DashboardHeader(): JSX.Element {
	return (
		<div className="dashboard-header">
			<DashboardBreadcrumbs />
			<HeaderRightSection enableAnnouncements={false} enableShare enableFeedback />
		</div>
	);
}

export default memo(DashboardHeader);
