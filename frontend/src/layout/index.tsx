import ROUTES from 'constants/routes';
import routeTitleMap from 'constants/routeTitleMap';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

function Head(): JSX.Element {
	const location = useLocation();
	const { t } = useTranslation();

	function getRouteKey(): string {
		const [routeKey] = Object.entries(ROUTES).find(
			([, value]) => value === location.pathname,
		) || ['DEFAULT'];

		return routeKey;
	}

	const routeKey = getRouteKey();
	const pageTitle = routeTitleMap[routeKey];

	return (
		<Helmet>
			<title>{t(pageTitle)}</title>
		</Helmet>
	);
}

export default Head;
