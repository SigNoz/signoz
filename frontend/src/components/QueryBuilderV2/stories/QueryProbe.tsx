import { useMemo } from 'react';
import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import styles from './QueryProbe.module.scss';

/** Fixed, so the printed payload is the same on every render and capture. */
const WINDOW = { start: 1_700_000_000_000, end: 1_700_003_600_000 };

/**
 * Prints the `compositeQuery` the builder's live state would send, so a play
 * function asserts on the query rather than on the DOM that edits it.
 */
function QueryProbe(): JSX.Element {
	const { currentQuery, panelType } = useQueryBuilder();

	const payload = useMemo(() => {
		try {
			return prepareQueryRangePayloadV5({
				query: currentQuery,
				graphType: panelType ?? PANEL_TYPES.TIME_SERIES,
				selectedTime: 'GLOBAL_TIME',
				...WINDOW,
			}).queryPayload.compositeQuery;
		} catch (error) {
			return { error: String(error) };
		}
	}, [currentQuery, panelType]);

	return (
		<pre className={styles.probe} data-testid="qb-payload">
			{JSON.stringify(payload, null, 2)}
		</pre>
	);
}

export default QueryProbe;
