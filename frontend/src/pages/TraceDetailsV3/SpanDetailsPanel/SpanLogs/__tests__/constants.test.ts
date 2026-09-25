import { Filter } from 'types/api/v5/queryRange';

import { getSpanLogsQueryPayload } from '../constants';

describe('getSpanLogsQueryPayload', () => {
	it('converts millisecond time range to seconds for query range payload', () => {
		const start = 1_782_311_871_585;
		const end = 1_782_312_471_617;

		const payload = getSpanLogsQueryPayload(start, end, {} as Filter);

		expect(payload.start).toBe(1_782_311_871);
		expect(payload.end).toBe(1_782_312_472);
	});
});
