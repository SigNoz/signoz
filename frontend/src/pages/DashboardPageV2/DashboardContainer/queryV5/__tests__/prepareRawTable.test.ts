import {
	type Querybuildertypesv5RawDataDTO,
	TelemetrytypesSignalDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

import { prepareRawTable } from '../prepareRawTable';

function result(
	rows: Querybuildertypesv5RawDataDTO['rows'],
	nextCursor?: string,
): Querybuildertypesv5RawDataDTO {
	return { queryName: 'A', rows, nextCursor };
}

const field = (name: string): TelemetrytypesTelemetryFieldKeyDTO => ({ name });

describe('prepareRawTable', () => {
	it('flattens row data and lifts timestamp as the first column', () => {
		const table = prepareRawTable({
			results: [
				result([
					{
						timestamp: '2026-01-01T00:00:00Z',
						data: { body: 'hello', level: 'info' },
					},
				]),
			],
			selectFields: [],
		});

		expect(table?.columns).toStrictEqual(['timestamp', 'body', 'level']);
		expect(table?.rows[0]).toMatchObject({
			key: 0,
			timestamp: '2026-01-01T00:00:00Z',
			body: 'hello',
			level: 'info',
		});
	});

	it('uses selectFields for column order when provided, timestamp still first', () => {
		const table = prepareRawTable({
			results: [
				result([
					{ timestamp: '2026-01-01T00:00:00Z', data: { body: 'x', level: 'warn' } },
				]),
			],
			selectFields: [field('level'), field('body')],
		});

		expect(table?.columns).toStrictEqual(['timestamp', 'level', 'body']);
	});

	it('omits the timestamp column when no row carries one', () => {
		const table = prepareRawTable({
			results: [result([{ data: { body: 'x' } }])],
			selectFields: [],
		});

		expect(table?.columns).toStrictEqual(['body']);
	});

	it('takes the first result that has rows', () => {
		const table = prepareRawTable({
			results: [result([]), result([{ data: { body: 'y' } }], 'cursor-1')],
			selectFields: [],
		});

		expect(table?.rows).toHaveLength(1);
		expect(table?.nextCursor).toBe('cursor-1');
	});

	it('returns undefined when there is nothing to show', () => {
		expect(prepareRawTable({ results: [], selectFields: [] })).toBeUndefined();
		expect(
			prepareRawTable({ results: [result([])], selectFields: [] }),
		).toBeUndefined();
		expect(
			prepareRawTable({ results: [result(null)], selectFields: [] }),
		).toBeUndefined();
	});

	// The V5 raw log row nests resource/attribute maps; selected fields like
	// `service.name` live under `resources_string` (V1 `FlatLogData` parity).
	const logRow = {
		timestamp: '2026-06-17T13:48:29Z',
		data: {
			body: 'GetSupportedCurrencies successful',
			severity_text: 'INFO',
			attributes_string: {},
			resources_string: {
				'service.name': 'currencyservice',
				'k8s.pod.name': 'app-demo-currencyservice-74bdf8c78c-zrdlf',
			},
		},
	};

	it('flattens nested attribute/resource maps for logs so selected fields resolve', () => {
		const table = prepareRawTable({
			results: [result([logRow])],
			selectFields: [field('body'), field('service.name'), field('k8s.pod.name')],
			signal: TelemetrytypesSignalDTO.logs,
		});

		expect(table?.rows[0]).toMatchObject({
			body: 'GetSupportedCurrencies successful',
			'service.name': 'currencyservice',
			'k8s.pod.name': 'app-demo-currencyservice-74bdf8c78c-zrdlf',
		});
		// The nested map is RETAINED on the row so the log-detail drawer still gets
		// the structured resources, but it's excluded from the derived columns.
		expect(table?.rows[0]).toHaveProperty('resources_string');
	});

	it('keeps nested maps out of derived columns (logs, no selectFields)', () => {
		const table = prepareRawTable({
			results: [result([logRow])],
			selectFields: [],
			signal: TelemetrytypesSignalDTO.logs,
		});

		expect(table?.columns).toContain('service.name'); // lifted child
		expect(table?.columns).not.toContain('resources_string'); // the map itself
		expect(table?.columns).not.toContain('attributes_string');
	});

	it('does not flatten for non-log signals (traces return flat data)', () => {
		const table = prepareRawTable({
			results: [result([logRow])],
			selectFields: [],
			signal: TelemetrytypesSignalDTO.traces,
		});

		expect(table?.rows[0]).toHaveProperty('resources_string');
		expect(table?.rows[0]).not.toHaveProperty('service.name');
	});
});
