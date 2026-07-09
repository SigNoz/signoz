import { MouseEvent, useMemo } from 'react';
import { LayoutGrid } from '@signozhq/icons';
import getSessionStorageApi from 'api/browser/sessionstorage/get';
import ROUTES from 'constants/routes';
import { DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY } from 'hooks/dashboard/useDashboardsListQueryParams';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isModifierKeyPressed } from 'utils/app';

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
	const { safeNavigate } = useSafeNavigate();

	const dashboardPageLink = useMemo(() => {
		const dashboardsListQueryParamsString = getSessionStorageApi(
			DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY,
		);

		return dashboardsListQueryParamsString
			? `${ROUTES.ALL_DASHBOARD}?${dashboardsListQueryParamsString}`
			: ROUTES.ALL_DASHBOARD;
	}, []);

	// Keep the href for middle/modifier-click (open in new tab) but intercept a plain
	// click for instant client-side navigation instead of a full-page reload.
	const onDashboardLinkClick = (event: MouseEvent<HTMLAnchorElement>): void => {
		if (isModifierKeyPressed(event)) {
			return;
		}
		event.preventDefault();
		safeNavigate(dashboardPageLink);
	};

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink
						icon={<LayoutGrid size={14} />}
						href={dashboardPageLink}
						onClick={onDashboardLinkClick}
					>
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
