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

	it('collapses composite-key duplicates in the input', () => {
		// Two identical `body` entries → deduped to one, then timestamp prepended.
		const input = [BODY, BODY, ATTR_A];
		const result = ensureLogsRequiredColumns(input);
		expect(result).toStrictEqual([TIMESTAMP, BODY, ATTR_A]);
		expect(result.filter((c) => c.name === 'body')).toHaveLength(1);
	});

	it('keeps same-name fields with different contexts as distinct columns', () => {
		// Different composite keys → both legitimate, neither deduped.
		const ATTR_BODY: TelemetryFieldKey = {
			name: 'body',
			signal: 'logs',
			fieldContext: 'attribute',
			fieldDataType: 'string',
		};
		const input = [TIMESTAMP, BODY, ATTR_BODY];
		expect(ensureLogsRequiredColumns(input)).toStrictEqual(input);
	});
});
