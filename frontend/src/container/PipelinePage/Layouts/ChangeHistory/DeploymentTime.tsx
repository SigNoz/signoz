import dayjs from 'dayjs';
import React from 'react';

function DeploymentTime(deployTime: string): JSX.Element {
	return (
		<span>{dayjs(deployTime).locale('en').format('MMMM DD, YYYY hh:mm A')}</span>
	);
}

export default DeploymentTime;
