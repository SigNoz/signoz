import './IntegrationDetailPage.styles.scss';

import cx from 'classnames';

export enum ConnectionStates {
	Connected = 'connected',
	TestingConnection = 'testingConnection',
	NoDataSinceLong = 'noDataSinceLong',
	NotInstalled = 'notInstalled',
}

const ConnectionStatesLabelMap = {
	[ConnectionStates.Connected]: 'This integration is working properly',
	[ConnectionStates.TestingConnection]: 'Listening for data...',
	[ConnectionStates.NoDataSinceLong]:
		'This integration has not received data in a while :/',
	[ConnectionStates.NotInstalled]: '',
};

interface TestConnectionProps {
	connectionState: ConnectionStates;
}

function TestConnection(props: TestConnectionProps): JSX.Element {
	const { connectionState } = props;
	return (
		<div className={cx('connection-container', connectionState)}>
			<ul className="connection-text">
				<li>{ConnectionStatesLabelMap[connectionState]}</li>
			</ul>
		</div>
	);
}

export default TestConnection;
