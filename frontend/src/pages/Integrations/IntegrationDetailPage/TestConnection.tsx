import './IntegrationDetailPage.styles.scss';

import cx from 'classnames';
import { useState } from 'react';

enum ConnectionStates {
	Connected = 'connected',
	TestingConnection = 'testingConnection',
	ConnectionFailed = 'connectionFailed',
	NoDataSinceLong = 'noDataSinceLong',
}

const ConnectionStatesLabelMap = {
	[ConnectionStates.Connected]: 'This integration is working properly',
	[ConnectionStates.TestingConnection]: 'Listening for data...',
	[ConnectionStates.ConnectionFailed]: 'Something went wrong :/',
	[ConnectionStates.NoDataSinceLong]:
		'This integration has not received data in a while :/',
};

function TestConnection(): JSX.Element {
	const [connectionState] = useState<ConnectionStates>(
		ConnectionStates.TestingConnection,
	);
	return (
		<div className={cx('connection-container', connectionState)}>
			<ul className="connection-text">
				<li>{ConnectionStatesLabelMap[connectionState]}</li>
			</ul>
		</div>
	);
}

export default TestConnection;
