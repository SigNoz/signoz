import { resolveTexts } from '../useContextVariables';

const ROW_VARIABLES = { _trace_id: 'abc123', _span_id: 'def456' };

const resolveOne = (
	text: string,
	processedVariables: Record<string, string>,
): string => resolveTexts({ texts: [text], processedVariables }).fullTexts[0];

describe('resolveTexts', () => {
	it('resolves bare {{field}} placeholders from per-row field variables', () => {
		expect(
			resolveOne('/trace/{{trace_id}}?spanId={{span_id}}', ROW_VARIABLES),
		).toBe('/trace/abc123?spanId=def456');
	});

	it('still resolves the explicitly prefixed {{_field}} form', () => {
		expect(resolveOne('/trace/{{_trace_id}}', ROW_VARIABLES)).toBe(
			'/trace/abc123',
		);
	});

	it.each([
		['{{.trace_id}}', '/trace/{{.trace_id}}'],
		['[[trace_id]]', '/trace/[[trace_id]]'],
		['$trace_id', '/trace/$trace_id'],
	])('resolves the %s placeholder syntax', (_syntax, text) => {
		expect(resolveOne(text, ROW_VARIABLES)).toBe('/trace/abc123');
	});

	it('resolves a field name containing dots', () => {
		expect(
			resolveOne('/svc/{{service.name}}', { '_service.name': 'redis' }),
		).toBe('/svc/redis');
	});

	it('gives a dashboard variable precedence over a same-named row field', () => {
		expect(
			resolveOne('/svc/{{service}}', {
				service: 'from-dashboard',
				_service: 'from-row',
			}),
		).toBe('/svc/from-dashboard');
	});

	it('leaves an unknown placeholder untouched', () => {
		expect(resolveOne('/trace/{{unknown}}', ROW_VARIABLES)).toBe(
			'/trace/{{unknown}}',
		);
	});

	it('picks the truncated side of a multi-value field for truncatedTexts', () => {
		const { fullTexts, truncatedTexts } = resolveTexts({
			texts: ['services: {{service}}'],
			processedVariables: { _service: 'a, b +1-|-a, b, c' },
		});

		expect(fullTexts[0]).toBe('services: a, b, c');
		expect(truncatedTexts[0]).toBe('services: a, b +1');
	});
});
