import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import AllErrorsContainer from 'container/AllError';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import history from 'lib/history';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function AllErrors(): JSX.Element {
	const { t } = useTranslation();

	const routes = useMemo(
		() => [
			{
				Component: AllErrorsContainer,
				name: t('routes.all_errors'),
				route: ROUTES.ALL_ERROR,
			},
		],
		[t],
	);

	return (
		<>
			<ResourceAttributesFilter />
			<RouteTab
				routes={routes}
				activeKey={t('routes.all_errors')}
				history={history}
			/>
		</>
	);
}

export default AllErrors;
