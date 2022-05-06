import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import AllErrorsContainer from 'container/AllError';
import React from 'react';
import { useTranslation } from 'react-i18next';

function AllErrors(): JSX.Element {
	const { t } = useTranslation();

	return (
		<RouteTab
			{...{
				routes: [
					{
						Component: AllErrorsContainer,
						name: t('routes.all_errors'),
						route: ROUTES.ALL_ERROR,
					},
				],
				activeKey: t('routes.all_errors'),
			}}
		/>
	);
}

export default AllErrors;
