import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import history from 'lib/history';
import React from 'react';

function AllAlertChannels(): JSX.Element {
	const pathName = history.location.pathname;

	return (
		<RouteTab
			{...{
				routes: [
					{
						Component: GeneralSettings,
						name: 'General Settings',
						route: ROUTES.SETTINGS,
					},
					{
						Component: AlertChannels,
						name: 'Alert Channels',
						route: ROUTES.ALL_CHANNELS,
					},
				],
				activeKey:
					pathName === ROUTES.SETTINGS ? 'General Settings' : 'Alert Channels',
			}}
		/>
	);
}

export default AllAlertChannels;
