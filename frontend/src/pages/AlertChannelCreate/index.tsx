import CreateAlertChannels from 'container/CreateAlertChannels';
import GeneralSettings from 'container/GeneralSettings';
import SettingsWrapper from 'container/SettingsWrapper';
import React from 'react';

const SettingsPage = (): JSX.Element => {
	const AlertChannels = (): JSX.Element => {
		return <CreateAlertChannels />;
	};

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
