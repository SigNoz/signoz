import dayjs from 'dayjs';
import { isNull, isUndefined } from 'lodash-es';

import { ConnectionStates } from './TestConnection';

export function getConnectionStatesFromConnectionStatus(
	installation:
		| {
				installed_at: string;
		  }
		| null
		| undefined,
	connection_status: {
		logs:
			| {
					last_received_ts_ms: number;
					last_received_from: string;
			  }
			| null
			| undefined;
		metrics:
			| {
					last_received_ts_ms: number;
					last_received_from: string;
			  }
			| null
			| undefined;
	},
): ConnectionStates {
	if (isNull(installation) || isUndefined(installation)) {
		return ConnectionStates.NotInstalled;
	}
	if (
		(isNull(connection_status.logs) || isUndefined(connection_status.logs)) &&
		(isNull(connection_status.metrics) || isUndefined(connection_status.metrics))
	) {
		const installationDate = dayjs(installation.installed_at);
		if (installationDate.isBefore(dayjs().subtract(7, 'days'))) {
			return ConnectionStates.NoDataSinceLong;
		}
		return ConnectionStates.TestingConnection;
	}

	const logsDate = dayjs(connection_status.logs?.last_received_ts_ms);
	const metricsDate = dayjs(connection_status.metrics?.last_received_ts_ms);

	if (
		logsDate.isBefore(dayjs().subtract(7, 'days')) &&
		metricsDate.isBefore(dayjs().subtract(7, 'days'))
	) {
		return ConnectionStates.NoDataSinceLong;
	}

	return ConnectionStates.Connected;
}
