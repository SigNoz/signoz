import ROUTES from 'constants/routes';
import AllErrorsContainer from 'container/AllError';
import { t } from 'i18next';

export const routes = [
	{
		Component: AllErrorsContainer,
		name: t('routes.all_errors'),
		route: ROUTES.ALL_ERROR,
		key: ROUTES.ALL_ERROR,
	},
];
