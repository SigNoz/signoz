import { isUndefined } from 'lodash-es';

import { ConnectionStates } from './TestConnection';

export function getConnectionStatesFromConnectionStatus(
	connectionStatus:
		| {
				last_received_ts: number;
				last_received_from: string;
		  }
		| undefined,
): ConnectionStates {
	console.log(connectionStatus);
	if (isUndefined(connectionStatus)) {
		return ConnectionStates.NotInstalled;
	}
	return ConnectionStates.Connected;
}
