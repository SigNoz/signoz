import { Filter } from 'types/api/v5/queryRange';

import { getSpanLogsQueryPayload } from '../constants';

describe('getSpanLogsQueryPayload', () => {
	const filter: Filter = {
		expression: "trace_id = 'abc' AND span_id = 'def'",
	};

	it('converts the millisecond time window to seconds for the V5 query payload', () => {
		// `start`/`end` are passed in milliseconds (the span time window padded by
		// ±5 min). GetQueryResultsProps -> prepareQueryRangePayloadV5 expects seconds
		// and multiplies by 1e3, so the payload must carry seconds here. Passing
		// milliseconds would yield a microsecond window (1000x too large) and the
		// related-logs query would match nothing.
		const startMs = 1782311871585;
		const endMs = 1782312471617;

		const payload = getSpanLogsQueryPayload(startMs, endMs, filter);

		expect(payload.start).toBe(Math.floor(startMs / 1000));
		expect(payload.end).toBe(Math.ceil(endMs / 1000));
	});

	it('keeps start/end at seconds magnitude (not milliseconds or microseconds)', () => {
		const startMs = 1782311871585;
		const endMs = 1782312471617;

		const payload = getSpanLogsQueryPayload(startMs, endMs, filter);

		// 10-digit epoch seconds, not 13-digit ms or 16-digit µs.
		expect(payload.start.toString()).toHaveLength(10);
		expect(payload.end.toString()).toHaveLength(10);
	});

	it('forwards the provided filter and ordering', () => {
		const payload = getSpanLogsQueryPayload(1000, 2000, filter, 'asc');
		const queryData = payload.query.builder.queryData[0];

		expect(queryData.filter).toBe(filter);
		expect(queryData.orderBy[0]).toEqual({ columnName: 'timestamp', order: 'asc' });
	});
});
