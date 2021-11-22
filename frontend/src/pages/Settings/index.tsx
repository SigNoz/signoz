import AlertChannels from 'container/AllAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import SettingsWrapper from 'container/SettingsWrapper';
import React from 'react';

const SettingsPage = (): JSX.Element => {
	return (
		<SettingsWrapper
			{...{
				AlertChannels,
				General: GeneralSettings,
			}}
		/>
	);
};

export default SettingsPage;
