import { useMemo } from 'react';
import { useAppLocation } from 'lib/router/useAppLocation';
import { matchRoute } from 'lib/router/matchRoute';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';

import DateTimeSelector from './DateTimeSelectionV2';
import { routesToDisable, routesToSkip } from './DateTimeSelectionV2/constants';

import './TopNav.styles.scss';

function TopNav(): JSX.Element | null {
	const location = useAppLocation();

	const isRouteToSkip = useMemo(
		() =>
			routesToSkip.some((route) =>
				matchRoute(location.pathname, route, { exact: true }),
			),
		[location.pathname],
	);

	const isDisabled = useMemo(
		() =>
			routesToDisable.some((route) =>
				matchRoute(location.pathname, route, { exact: true }),
			),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchRoute(location.pathname, ROUTES.SIGN_UP, { exact: true }),
		[location.pathname],
	);

	const isAlertCreationPage = useMemo(
		() => matchRoute(location.pathname, ROUTES.ALERTS_NEW, { exact: true }),
		[location.pathname],
	);

	if (isSignUpPage || isDisabled || isRouteToSkip || isAlertCreationPage) {
		return null;
	}

	return !isRouteToSkip ? (
		<div className="top-nav-container">
			<DateTimeSelector showAutoRefresh />
			<HeaderRightSection enableShare enableFeedback enableAnnouncements={false} />
		</div>
	) : null;
}

export default TopNav;
