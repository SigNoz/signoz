import ROUTES from 'constants/routes';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

function Head(): JSX.Element {
	const location = useLocation();
	const { t } = useTranslation('titles');

	function getRouteKey(): keyof typeof ROUTES | 'DEFAULT' {
		const [routeKey] = Object.entries(ROUTES).find(
			([, value]) => value === location.pathname,
		) || ['DEFAULT'];

		return routeKey as keyof typeof ROUTES | 'DEFAULT';
	}

	const routeKey = getRouteKey();
	const pageTitle = t(routeKey);

	return (
		<Helmet>
			<title>{pageTitle}</title>
		</Helmet>
	);
}

export default Head;
