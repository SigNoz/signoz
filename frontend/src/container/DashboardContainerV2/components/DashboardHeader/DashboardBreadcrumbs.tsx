import { useCallback } from 'react';
import { Button } from 'antd';
import getSessionStorageApi from 'api/browser/sessionstorage/get';
import ROUTES from 'constants/routes';
import { DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY } from 'hooks/dashboard/useDashboardsListQueryParams';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { LayoutGrid } from '@signozhq/icons';

import { Base64Icons } from '../../../DashboardContainer/DashboardSettings/General/utils';

import './DashboardBreadcrumbs.styles.scss';

interface Props {
	title: string;
	image?: string;
}

function DashboardBreadcrumbs({ title, image }: Props): JSX.Element {
	const { safeNavigate } = useSafeNavigate();

	const goToListPage = useCallback(() => {
		const dashboardsListQueryParamsString = getSessionStorageApi(
			DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY,
		);

		if (dashboardsListQueryParamsString) {
			safeNavigate({
				pathname: ROUTES.ALL_DASHBOARD,
				search: `?${dashboardsListQueryParamsString}`,
			});
		} else {
			safeNavigate(ROUTES.ALL_DASHBOARD);
		}
	}, [safeNavigate]);

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
				<img
					src={image || Base64Icons[0]}
					alt="dashboard-icon"
					className="dashboard-icon-image"
				/>
				{title}
			</Button>
		</div>
	);
}

export default DashboardBreadcrumbs;
