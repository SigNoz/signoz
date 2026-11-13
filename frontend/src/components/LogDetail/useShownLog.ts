import { useState } from 'react';
import { ILog } from 'types/api/logs/log';

/**
 * The log to render: `log`, or the last non-null one after `log` becomes `null`, so the drawer
 * keeps its content while it slides out.
 */
export function useShownLog(log: ILog | null): ILog | null {
	const [shownLog, setShownLog] = useState(log);

	if (log !== null && log !== shownLog) {
		setShownLog(log);
	}

	return log ?? shownLog;
}
