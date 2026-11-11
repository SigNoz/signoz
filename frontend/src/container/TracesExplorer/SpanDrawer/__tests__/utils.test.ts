import { toSpanV3 } from '../utils';

describe('toSpanV3', () => {
	const row = {
		id: '772c4d29dd9076ac',
		span_id: '772c4d29dd9076ac',
		timestamp: '2024-07-19T08:39:58.735Z',
		resource: { 'service.name': 'frontend' },
		events: [
			{
				name: 'exception',
				timeUnixNano: 1721378398735000000,
				attributes: { 'exception.type': 'Error' },
			},
		],
		links: [{ traceId: 'a364a8e15af3e9a8', spanId: '5704353737b6778e' }],
	};

	it('reshapes a list row into the span the details panel reads', () => {
		const span = toSpanV3(row);

		expect(span.timestamp).toBe(Date.UTC(2024, 6, 19, 8, 39, 58, 735));
		expect(span['service.name']).toBe('frontend');
		expect(span.events).toStrictEqual([
			{
				name: 'exception',
				timeUnixNano: 1721378398735000000,
				attributeMap: { 'exception.type': 'Error' },
				isError: false,
			},
		]);
		expect((span as unknown as { references: unknown }).references).toStrictEqual(
			row.links,
		);
	});

	it('drops the parent from the linked spans', () => {
		const link = { traceId: 'a364a8e15af3e9a8', spanId: '5704353737b6778e' };
		const parent = { traceId: '1f2e3d4c5b6a7980', spanId: '0aa1bb2cc3dd4ee5' };
		const span = toSpanV3({
			...row,
			trace_id: parent.traceId,
			parent_span_id: parent.spanId,
			links: [parent, link, { ...parent, traceId: link.traceId }],
		});

		expect((span as unknown as { references: unknown }).references).toStrictEqual(
			[link, { ...parent, traceId: link.traceId }],
		);
	});

	it('drops the empty parent ref of a root span', () => {
		const span = toSpanV3({
			...row,
			trace_id: 'a364a8e15af3e9a8',
			parent_span_id: '',
			links: [{ traceId: 'a364a8e15af3e9a8' }],
		});

		expect((span as unknown as { references: unknown }).references).toStrictEqual(
			[],
		);
	});

	it('defaults missing events, links and service name', () => {
		const span = toSpanV3({ id: 'x', timestamp: row.timestamp });

		expect(span.events).toStrictEqual([]);
		expect(span['service.name']).toBe('');
		expect((span as unknown as { references: unknown }).references).toStrictEqual(
			[],
		);
	});
});
