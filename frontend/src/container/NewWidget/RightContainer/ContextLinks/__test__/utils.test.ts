import { processContextLinks } from '../utils';

describe('processContextLinks', () => {
	// Regression for #11325.
	it('substitutes per-row groupBy values in the path and query params', () => {
		const [link] = processContextLinks(
			[
				{
					id: '1',
					label: 'Open trace {{trace_id}}',
					url: '/trace/{{trace_id}}?spanId={{span_id}}&levelUp=0&levelDown=0',
				},
			],
			{ _trace_id: 'abc123', _span_id: 'def456' },
		);

		expect(link.url).toBe('/trace/abc123?spanId=def456&levelUp=0&levelDown=0');
		expect(link.label).toBe('Open trace abc123');
	});

	it('resolves dashboard and global variables alongside row fields', () => {
		const [link] = processContextLinks(
			[
				{ id: '1', label: 'Logs', url: '/logs/{{service}}?ts={{timestamp_start}}' },
			],
			{ service: 'frontend', timestamp_start: '1720512000000', _service: 'redis' },
		);

		expect(link.url).toBe('/logs/frontend?ts=1720512000000');
	});

	it('leaves an unresolvable token in place', () => {
		const [link] = processContextLinks(
			[{ id: '1', label: 'Open', url: '/trace/{{trace_id}}' }],
			{},
		);

		expect(link.url).toBe('/trace/{{trace_id}}');
	});
});
