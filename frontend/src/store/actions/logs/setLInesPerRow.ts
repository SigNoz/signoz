import set from 'api/browser/localstorage/set';
import { LOGS_LINES_PER_ROW } from 'pages/Logs/utils';
import { SET_LINES_PER_ROW } from 'types/actions/logs';

type ActionSetLinesPerRow = { type: typeof SET_LINES_PER_ROW; payload: number };

export function setLinesPerRow(lines: number): ActionSetLinesPerRow {
	set(LOGS_LINES_PER_ROW, lines.toString());

	return {
		type: SET_LINES_PER_ROW,
		payload: lines,
	};
}
