import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { LogViewMode } from 'container/LogsTable';
import { SET_VIEW_MODE } from 'types/actions/logs';

type ActionSetViewMode = { type: typeof SET_VIEW_MODE; payload: LogViewMode };

export function setViewMode(viewMode: LogViewMode): ActionSetViewMode {
	set(LOCALSTORAGE.LOGS_VIEW_MODE, viewMode);

	return {
		type: SET_VIEW_MODE,
		payload: viewMode,
	};
}
