import ROUTES from 'constants/routes';
import CostOpimizer from 'container/CostOptimizer';
import IngestionAnalytics from 'container/IngestionAnalytics';
import history from 'lib/history';
import React from 'react';

function CostOptimizerPage(): JSX.Element {
	const { pathname } = history.location;
	// const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	// const [currentOrgSettings] = useComponentPermission(
	// 	['current_org_settings'],
	// 	role,
	// );

	console.log('pathname:', pathname);

	if (pathname === ROUTES.INGESTION_ANALYTICS) {
		return <IngestionAnalytics />;
	}

	return <CostOpimizer />;
}

export default CostOptimizerPage;
