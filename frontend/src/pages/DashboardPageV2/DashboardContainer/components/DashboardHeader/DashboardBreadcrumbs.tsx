import { useCallback } from 'react';
import { Button } from '@signozhq/ui/button';
import getSessionStorageApi from 'api/browser/sessionstorage/get';
import ROUTES from 'constants/routes';
import { DASHBOARDS_LIST_QUERY_PARAMS_STORAGE_KEY } from 'hooks/dashboard/useDashboardsListQueryParams';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { LayoutGrid } from '@signozhq/icons';

import styles from './DashboardBreadcrumbs.module.scss';

interface Props {
	title: string;
	image: string;
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
		<div className={styles.dashboardBreadcrumbs}>
			<Button
				variant="ghost"
				prefix={<LayoutGrid size={14} />}
				className={styles.dashboardBtn}
				onClick={goToListPage}
			>
				Dashboard /
			</Button>
			<Button variant="ghost" className={styles.idBtn}>
				<img
					src={image}
					alt="dashboard-icon"
					className={styles.dashboardIconImage}
				/>
				{title}
			</Button>
		</div>
	);
}

export default DashboardBreadcrumbs;
