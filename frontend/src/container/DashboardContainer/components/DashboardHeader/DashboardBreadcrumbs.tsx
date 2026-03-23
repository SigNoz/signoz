import { useCallback, useRef } from 'react';
import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY } from 'hooks/dashboard/useDashboardsListQueryParams';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { LayoutGrid } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { DashboardData } from 'types/api/dashboard/getAll';

import { Base64Icons } from '../../DashboardSettings/General/utils';

import './DashboardBreadcrumbs.styles.scss';

function DashboardBreadcrumbs(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { selectedDashboard } = useDashboard();
	const updatedAtRef = useRef(selectedDashboard?.updatedAt);

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.id,
		  }
		: ({} as DashboardData);

	const { title = '', image = Base64Icons[0] } = selectedData || {};

	const goToListPage = useCallback(() => {
		const dashboardsListQueryParamsString = sessionStorage.getItem(
			DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY,
		);

		const hasDashboardBeenUpdated =
			selectedDashboard?.updatedAt !== updatedAtRef.current;
		if (!hasDashboardBeenUpdated && dashboardsListQueryParamsString) {
			safeNavigate({
				pathname: ROUTES.ALL_DASHBOARD,
				search: `?${dashboardsListQueryParamsString}`,
			});
		} else {
			safeNavigate(ROUTES.ALL_DASHBOARD);
		}
	}, [safeNavigate, selectedDashboard?.updatedAt]);

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
