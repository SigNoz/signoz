import './TopNav.styles.scss';

import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { matchPath, useHistory } from 'react-router-dom';

import NewExplorerCTA from '../NewExplorerCTA';
import DateTimeSelector from './DateTimeSelectionV2';
import { routesToDisable, routesToSkip } from './DateTimeSelectionV2/config';

function TopNav(): JSX.Element | null {
	const { location } = useHistory();

	const isRouteToSkip = useMemo(
		() =>
			routesToSkip.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isDisabled = useMemo(
		() =>
			routesToDisable.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath(location.pathname, { path: ROUTES.SIGN_UP, exact: true }),
		[location.pathname],
	);

	const isNewAlertsLandingPage = useMemo(
		() =>
			matchPath(location.pathname, { path: ROUTES.ALERTS_NEW, exact: true }) &&
			!location.search,
		[location.pathname, location.search],
	);

	if (isSignUpPage || isDisabled || isRouteToSkip || isNewAlertsLandingPage) {
		return null;
	}

	return !isRouteToSkip ? (
		<div className="top-nav-container">
			<NewExplorerCTA />
			<DateTimeSelector showAutoRefresh />
			<HeaderRightSection enableShare enableFeedback enableAnnouncements={false} />
		</div>
	) : null;
}

export default TopNav;
