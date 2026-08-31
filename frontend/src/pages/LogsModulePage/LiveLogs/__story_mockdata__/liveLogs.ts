/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { initialQueriesMap } from 'constants/queryBuilder';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { logRows, type LogSeverity } from '../../__story_mockdata__/logs';

/** `QueryRawStream` asks the querier for at most this many rows. */
export const LIVE_TAIL_LIMIT = 500;

/** A reconnection delay the story will never reach. */
const NO_RECONNECT_MS = 24 * 60 * 60 * 1000;

/** The filter the story live-tails on. See `liveLogsQuery`. */
export const LIVE_TAIL_FILTER = "service.name = 'checkout'";

/**
 * The query the live tail runs on, seeded from the app's own so a change to the
 * query-builder shape reaches the story.
 *
 * The filter is not decoration. The container remembers the expression it
 * connected with, but stores an empty one as `null`, and its "has the filter
 * changed" guard is `!previous || previous !== current`. An unfiltered live tail
 * therefore reads as changed on every render: it clears the lines it has and
 * reopens the connection, and the list never fills.
 */
export const liveLogsQuery = (): Query => {
	const seed = initialQueriesMap[DataSource.LOGS];

	return {
		...seed,
		builder: {
			...seed.builder,
			queryData: seed.builder.queryData.map(
				(data): IBuilderQuery => ({
					...data,
					filter: { expression: LIVE_TAIL_FILTER },
				}),
			),
		},
	};
};

/**
 * The frames a live-tail connection carries, oldest first.
 *
 * Two things the shape has to match that the explorer's does not. The stream
 * sends one `RawRow` per `data:` frame rather than a page of them, and the
 * container hands `row.data` to the list untouched, so the timestamp has to be
 * on the row's own data as well as beside it. And each batch is reversed before
 * it is prepended, so the last frame in the body is the line that ends up at the
 * top of the list.
 *
 * msw answers a request in one piece rather than as a stream, so the response
 * ends the moment the backlog is out and the client reconnects on its own. A
 * reconnection would replay every line, so the stream sets a reconnection time
 * it will never reach.
 */
export const liveLogsStream = (
	count: number,
	severities: readonly LogSeverity[],
	endMilli: number,
): string =>
	`retry: ${NO_RECONNECT_MS}\n\n${logRows(count, severities, endMilli, false)
		.map(
			(row) =>
				`data: ${JSON.stringify({
					timestamp: row.timestamp,
					data: { ...row.data, timestamp: row.timestamp },
				})}\n\n`,
		)
		.reverse()
		.join('')}`;
