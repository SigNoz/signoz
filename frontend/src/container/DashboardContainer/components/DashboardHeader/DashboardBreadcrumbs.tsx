import { useCallback } from 'react';
import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { LayoutGrid } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { DashboardData } from 'types/api/dashboard/getAll';

import { Base64Icons } from '../../DashboardSettings/General/utils';

import './DashboardBreadcrumbs.styles.scss';

function DashboardBreadcrumbs(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { selectedDashboard, listSortOrder } = useDashboard();

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.id,
		  }
		: ({} as DashboardData);

	const { title = '', image = Base64Icons[0] } = selectedData || {};

	const goToListPage = useCallback(() => {
		const urlParams = new URLSearchParams();
		urlParams.set('columnKey', listSortOrder.columnKey as string);
		urlParams.set('order', listSortOrder.order as string);
		urlParams.set('page', listSortOrder.pagination as string);
		urlParams.set('search', listSortOrder.search as string);

		const generatedUrl = `${ROUTES.ALL_DASHBOARD}?${urlParams.toString()}`;
		safeNavigate(generatedUrl);
	}, [listSortOrder, safeNavigate]);

	return (
		<div className="dashboard-breadcrumbs">
			<Button
				type="text"
				icon={<LayoutGrid size={14} />}
				className="dashboard-btn"
				onClick={goToListPage}
			>
				Dashboard /
			</Button>
			<Button type="text" className="id-btn dashboard-name-btn">
				<img src={image} alt="dashboard-icon" className="dashboard-icon-image" />
				{title}
			</Button>
		</div>
	);
}

export default DashboardBreadcrumbs;
