import set from 'api/browser/localstorage/set';
import { LogViewMode } from 'container/LogsTable';
import { LOGS_VIEW_MODE } from 'pages/Logs/utils';
import { SET_VIEW_MODE } from 'types/actions/logs';

type ActionSetViewMode = { type: typeof SET_VIEW_MODE; payload: LogViewMode };

export function setViewMode(viewMode: LogViewMode): ActionSetViewMode {
	set(LOGS_VIEW_MODE, viewMode);

	return {
		type: SET_VIEW_MODE,
		payload: viewMode,
	};
}
