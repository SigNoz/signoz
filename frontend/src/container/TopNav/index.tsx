import { useMemo } from 'react';
import { matchPath, useHistory } from 'react-router-dom';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';

import NewExplorerCTA from '../NewExplorerCTA';
import DateTimeSelector from './DateTimeSelectionV2';
import { routesToDisable } from './DateTimeSelectionV2/constants';

import './TopNav.styles.scss';

const routesToShowTopNav = [
	ROUTES.SERVICE_MAP,
	ROUTES.TRACE,
	ROUTES.APPLICATION,
	ROUTES.SERVICE_METRICS,
	ROUTES.ALL_DASHBOARD,
	ROUTES.DASHBOARD,
	ROUTES.ALL_ERROR,
	ROUTES.TRACE_EXPLORER,
	ROUTES.LOGS,
	ROUTES.LIVE_LOGS,
	ROUTES.MESSAGING_QUEUES_KAFKA,
	ROUTES.MESSAGING_QUEUES_CELERY_TASK,
	ROUTES.MESSAGING_QUEUES_OVERVIEW,
	ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL,
	ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
];

function TopNav(): JSX.Element | null {
	const { location } = useHistory();

	const shouldShowTopNav = useMemo(
		() =>
			routesToShowTopNav.some((route) =>
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

	const isAlertCreationPage = useMemo(
		() => matchPath(location.pathname, { path: ROUTES.ALERTS_NEW, exact: true }),
		[location.pathname],
	);

	if (isSignUpPage || isDisabled || !shouldShowTopNav || isAlertCreationPage) {
		return null;
	}

	return (
		<div className="top-nav-container">
			<NewExplorerCTA />
			<DateTimeSelector showAutoRefresh />
			<HeaderRightSection enableShare enableFeedback enableAnnouncements={false} />
		</div>
	);
}

export default TopNav;
