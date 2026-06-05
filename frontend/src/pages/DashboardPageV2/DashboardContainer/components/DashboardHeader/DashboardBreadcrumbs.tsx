import { useCallback } from 'react';
import { LayoutGrid } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import getSessionStorageApi from 'api/browser/sessionstorage/get';
import ROUTES from 'constants/routes';
import { DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY } from 'hooks/dashboard/useDashboardsListQueryParams';
import { useSafeNavigate } from 'hooks/useSafeNavigate';

import styles from './DashboardBreadcrumbs.module.scss';

interface DashboardBreadcrumbsProps {
	title: string;
	image: string;
}

function DashboardBreadcrumbs({
	title,
	image,
}: DashboardBreadcrumbsProps): JSX.Element {
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
		<div className={styles.dashboardBreadcrumbs}>
			<Button
				variant="ghost"
				color="secondary"
				prefix={<LayoutGrid size={14} />}
				onClick={goToListPage}
				className={styles.linkToPreviousPage}
				testId="dashboard-breadcrumb-list"
			>
				Dashboard
			</Button>
			<div>/</div>
			<div className={styles.currentPage}>
				<img
					src={image}
					alt="dashboard-icon"
					className={styles.dashboardIconImage}
				/>
				<Typography.Text>{title}</Typography.Text>
			</div>
		</div>
	);
}

export default DashboardBreadcrumbs;
