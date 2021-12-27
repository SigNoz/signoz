import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import React from 'react';
import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import history from 'lib/history';

const AllAlertChannels = (): JSX.Element => {
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
};

export default AllAlertChannels;
