import { TelemetryFieldKey } from 'api/v5/v5';

import {
	defaultLogsSelectedColumns,
	ensureLogsRequiredColumns,
} from '../constants';

const TIMESTAMP = defaultLogsSelectedColumns.find(
	(c) => c.name === 'timestamp',
);
const BODY = defaultLogsSelectedColumns.find((c) => c.name === 'body');

if (!TIMESTAMP || !BODY) {
	throw new Error('defaults missing timestamp/body — test fixture invalid');
}

const ATTR_A: TelemetryFieldKey = {
	name: 'service.name',
	signal: 'logs',
	fieldContext: 'resource',
	fieldDataType: 'string',
};
const ATTR_B: TelemetryFieldKey = {
	name: 'severity_text',
	signal: 'logs',
	fieldContext: 'log',
	fieldDataType: 'string',
};

describe('ensureLogsRequiredColumns', () => {
	it('prepends both timestamp + body to an empty list', () => {
		expect(ensureLogsRequiredColumns([])).toStrictEqual([TIMESTAMP, BODY]);
	});

	it('prepends only `body` when `timestamp` is already present', () => {
		expect(ensureLogsRequiredColumns([TIMESTAMP, ATTR_A])).toStrictEqual([
			BODY,
			TIMESTAMP,
			ATTR_A,
		]);
	});

	it('prepends only `timestamp` when `body` is already present', () => {
		expect(ensureLogsRequiredColumns([BODY, ATTR_A])).toStrictEqual([
			TIMESTAMP,
			BODY,
			ATTR_A,
		]);
	});

	it('returns the same array when both are present (no duplicates, original order preserved)', () => {
		const input = [TIMESTAMP, BODY, ATTR_A, ATTR_B];
		expect(ensureLogsRequiredColumns(input)).toBe(input);
	});

	it('preserves a non-default order when both are present', () => {
		const input = [ATTR_A, BODY, ATTR_B, TIMESTAMP];
		expect(ensureLogsRequiredColumns(input)).toStrictEqual(input);
	});

	it('prepends both when neither is present in a list of user attributes', () => {
		expect(ensureLogsRequiredColumns([ATTR_A, ATTR_B])).toStrictEqual([
			TIMESTAMP,
			BODY,
			ATTR_A,
			ATTR_B,
		]);
	});

	it('does not duplicate if a required column appears twice in the input', () => {
		// Tolerant of malformed input — invariant only adds *missing* required
		// columns; it does not deduplicate existing entries (that's a separate
		// concern, not its job).
		const input = [BODY, BODY, ATTR_A];
		const result = ensureLogsRequiredColumns(input);
		expect(result.filter((c) => c.name === 'timestamp')).toHaveLength(1);
		expect(result[0]).toStrictEqual(TIMESTAMP);
	});
});
