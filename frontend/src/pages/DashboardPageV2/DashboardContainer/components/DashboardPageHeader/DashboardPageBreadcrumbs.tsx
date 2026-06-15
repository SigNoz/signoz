import { useMemo } from 'react';
import { LayoutGrid } from '@signozhq/icons';
import getSessionStorageApi from 'api/browser/sessionstorage/get';
import ROUTES from 'constants/routes';
import { DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY } from 'hooks/dashboard/useDashboardsListQueryParams';

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '@signozhq/ui/breadcrumb';

interface DashboardPageBreadcrumbsProps {
	title: string;
	image: string;
}

function DashboardPageBreadcrumbs({
	title,
	image,
}: DashboardPageBreadcrumbsProps): JSX.Element {
	const dashboardPageLink = useMemo(() => {
		const dashboardsListQueryParamsString = getSessionStorageApi(
			DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY,
		);

		return dashboardsListQueryParamsString
			? `${ROUTES.ALL_DASHBOARD}?${dashboardsListQueryParamsString}`
			: ROUTES.ALL_DASHBOARD;
	}, []);

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink icon={<LayoutGrid size={14} />} href={dashboardPageLink}>
						Dashboard
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator>/</BreadcrumbSeparator>
				<BreadcrumbItem>
					<BreadcrumbLink icon={<img src={image} alt="dashboard-icon" />}>
						{title}
					</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

export default DashboardPageBreadcrumbs;
