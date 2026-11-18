import { SpanV3 } from 'types/api/trace/getTraceV3';

import { getSpanDisplayData } from '../utils';

describe('getSpanDisplayData', () => {
	it('keeps only allow-listed fields', () => {
		const span = {
			span_id: 's1',
			trace_id: 't1',
			name: 'GET /api',
			attributes: { 'http.method': 'GET' },
			resource: { 'service.name': 'api' },
			level: 1,
			has_children: true,
			sub_tree_node_count: 3,
			'service.name': 'api',
			time_unix: 1700000000,
			formattedInput: '[]',
		} as unknown as SpanV3;

		expect(getSpanDisplayData(span)).toStrictEqual({
			span_id: 's1',
			trace_id: 't1',
			name: 'GET /api',
			attributes: { 'http.method': 'GET' },
			resource: { 'service.name': 'api' },
		});
	});

	it('parses JSON object and array attributes without changing other strings', () => {
		const span = {
			attributes: {
				'payment.request': '{"amount":129.99,"metadata":{"order_id":"order-42"}}',
				'payment.tags': '["priority","online"]',
				'http.method': 'POST',
				'payment.note': '{"unclosed":',
				'payment.code': '200',
			},
		} as unknown as SpanV3;

		expect(getSpanDisplayData(span).attributes).toStrictEqual({
			'payment.request': {
				amount: 129.99,
				metadata: { order_id: 'order-42' },
			},
			'payment.tags': ['priority', 'online'],
			'http.method': 'POST',
			'payment.note': '{"unclosed":',
			'payment.code': '200',
		});
	});
});
