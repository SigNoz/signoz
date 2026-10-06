import { parseSpanInput } from '../testPayload';

describe('parseSpanInput', () => {
	it('reads the envelope and trims extra top-level keys', () => {
		const span = parseSpanInput(`{
			"attributes": { "llm.model_name": "gpt-4o" },
			"resource": { "service.name": "llm-gateway" },
			"demo": { "name": "demo" }
		}`);

		expect(span.attributes).toStrictEqual({ 'llm.model_name': 'gpt-4o' });
		expect(span.resource).toStrictEqual({ 'service.name': 'llm-gateway' });
	});

	it('reads a clean envelope', () => {
		const span = parseSpanInput(`{
			"attributes": { "llm.model_name": "gpt-4o" },
			"resource": { "service.name": "llm-gateway" }
		}`);

		expect(span.attributes).toStrictEqual({ 'llm.model_name': 'gpt-4o' });
		expect(span.resource).toStrictEqual({ 'service.name': 'llm-gateway' });
	});

	it('treats an envelope-less object as a bare attribute map', () => {
		const span = parseSpanInput('{ "llm.model_name": "gpt-4o", "demo": "x" }');

		expect(span.attributes).toStrictEqual({
			'llm.model_name': 'gpt-4o',
			demo: 'x',
		});
		expect(span.resource).toStrictEqual({});
	});

	it('drops an envelope key that is not an object', () => {
		const span = parseSpanInput(
			'{ "attributes": { "llm.provider": "openai" }, "resource": "oops" }',
		);

		expect(span.attributes).toStrictEqual({ 'llm.provider': 'openai' });
		expect(span.resource).toStrictEqual({});
	});

	it.each([
		['   ', 'Paste a JSON span object to run the test.'],
		['{ "a": }', 'Invalid JSON — check for trailing commas or missing quotes.'],
		['[1, 2]', 'Span must be a JSON object of attribute key-value pairs.'],
	])('rejects %p', (input, message) => {
		expect(() => parseSpanInput(input)).toThrow(message);
	});
});
