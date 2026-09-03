import ROUTES from 'constants/routes';
import AllErrorsContainer from 'container/AllError';
import { t } from 'i18next';
import { Bug } from '@signozhq/icons';

export const routes = [
	{
		Component: AllErrorsContainer,
		name: (
			<div className="tab-item">
				<Bug size={16} /> {t('routes.all_errors').toString()}
			</div>
		),
		route: ROUTES.ALL_ERROR,
		key: ROUTES.ALL_ERROR,
	},
];
