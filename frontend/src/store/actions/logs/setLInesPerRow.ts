import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { SET_LINES_PER_ROW } from 'types/actions/logs';

type ActionSetLinesPerRow = { type: typeof SET_LINES_PER_ROW; payload: number };

export function setLinesPerRow(lines: number): ActionSetLinesPerRow {
	set(LOCALSTORAGE.LOGS_LINES_PER_ROW, lines.toString());

	return {
		type: SET_LINES_PER_ROW,
		payload: lines,
	};
}
