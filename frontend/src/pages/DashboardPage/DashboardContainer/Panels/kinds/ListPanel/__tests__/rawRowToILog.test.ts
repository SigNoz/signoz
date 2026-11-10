import { rawRowToILog } from '../rawRowToILog';

describe('rawRowToILog', () => {
	it('maps snake_case log fields onto the ILog aliases', () => {
		const log = rawRowToILog({
			key: 0,
			id: 'log-1',
			timestamp: '2026-01-01T00:00:00Z',
			body: 'hello world',
			severity_text: 'INFO',
			severity_number: 9,
			trace_id: 'trace-abc',
			span_id: 'span-xyz',
		});

		expect(log).toMatchObject({
			id: 'log-1',
			date: '2026-01-01T00:00:00Z',
			timestamp: '2026-01-01T00:00:00Z',
			body: 'hello world',
			severityText: 'INFO',
			severity_text: 'INFO',
			severityNumber: 9,
			severity_number: 9,
			traceId: 'trace-abc',
			trace_id: 'trace-abc',
			spanID: 'span-xyz',
			span_id: 'span-xyz',
		});
	});

	it('falls back to the synthetic row key when the row has no id', () => {
		expect(rawRowToILog({ key: 7, body: 'x' }).id).toBe('7');
	});

	it('defaults missing severity/ids to empty/zero without throwing', () => {
		const log = rawRowToILog({ key: 1, body: 'x' });
		expect(log.severityText).toBe('');
		expect(log.severityNumber).toBe(0);
		expect(log.traceId).toBe('');
		expect(log.spanID).toBe('');
	});

	it('guarantees object map fields so the drawer never hits Object.keys(undefined)', () => {
		// A flattened row has no resources_string; the drawer iterates it with
		// Object.keys, so it must be an object, not undefined.
		const log = rawRowToILog({
			key: 2,
			body: 'x',
			'service.name': 'currencyservice',
		});
		expect(log.resources_string).toStrictEqual({});
		expect(log.attributes_string).toStrictEqual({});
		expect(() => Object.keys(log.resources_string)).not.toThrow();
	});

	it('preserves a structured resources_string when present', () => {
		const log = rawRowToILog({
			key: 3,
			body: 'x',
			resources_string: { 'service.name': 'currencyservice' },
		});
		expect(log.resources_string).toStrictEqual({
			'service.name': 'currencyservice',
		});
	});
});
