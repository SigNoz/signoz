import { SpanV3 } from 'types/api/trace/getTraceV3';

import { getAncestorSpanIds, getVisibleSpans } from '../utils';

function makeSpan(
	overrides: Partial<SpanV3> & { span_id: string; level: number },
): SpanV3 {
	const { span_id, level, ...rest } = overrides;
	return {
		span_id,
		trace_id: 'test-trace',
		parent_span_id: '',
		timestamp: 1000000,
		duration_nano: 50000000,
		name: `span-${span_id}`,
		'service.name': 'test-service',
		has_error: false,
		status_message: '',
		status_code: 0,
		status_code_string: '',
		kind: 0,
		kind_string: '',
		has_children: false,
		has_sibling: false,
		sub_tree_node_count: 0,
		level,
		attributes: {},
		resource: {},
		events: [],
		http_method: '',
		http_url: '',
		http_host: '',
		db_name: '',
		db_operation: '',
		external_http_method: '',
		external_http_url: '',
		response_status_code: '',
		is_remote: '',
		flags: 0,
		trace_state: '',
		...rest,
	};
}

describe('getVisibleSpans', () => {
	it('returns empty array for empty input', () => {
		expect(getVisibleSpans([], new Set())).toEqual([]);
	});

	it('returns single root span with no children', () => {
		const spans = [makeSpan({ span_id: 'root', level: 0 })];
		expect(getVisibleSpans(spans, new Set())).toEqual(spans);
	});

	it('returns all spans for flat tree (all level 0, no children)', () => {
		const spans = [
			makeSpan({ span_id: 'a', level: 0 }),
			makeSpan({ span_id: 'b', level: 0 }),
			makeSpan({ span_id: 'c', level: 0 }),
		];
		expect(getVisibleSpans(spans, new Set())).toEqual(spans);
	});

	it('returns all spans when all parents are expanded', () => {
		const spans = [
			makeSpan({ span_id: 'root', level: 0, has_children: true }),
			makeSpan({ span_id: 'a', level: 1 }),
			makeSpan({ span_id: 'b', level: 1 }),
		];
		const uncollapsed = new Set(['root']);
		expect(getVisibleSpans(spans, uncollapsed)).toEqual(spans);
	});

	it('hides children when root is collapsed', () => {
		const spans = [
			makeSpan({
				span_id: 'root',
				level: 0,
				has_children: true,
				sub_tree_node_count: 2,
			}),
			makeSpan({ span_id: 'a', level: 1 }),
			makeSpan({ span_id: 'b', level: 1 }),
		];
		const uncollapsed = new Set<string>(); // root NOT in set → collapsed
		const result = getVisibleSpans(spans, uncollapsed);
		expect(result).toHaveLength(1);
		expect(result[0].span_id).toBe('root');
	});

	it('hides subtree when mid-level span is collapsed', () => {
		// root → A → B → C (linear chain)
		const spans = [
			makeSpan({ span_id: 'root', level: 0, has_children: true }),
			makeSpan({ span_id: 'A', level: 1, has_children: true }),
			makeSpan({ span_id: 'B', level: 2, has_children: true }),
			makeSpan({ span_id: 'C', level: 3 }),
		];
		// root and A expanded, but A is collapsed
		const uncollapsed = new Set(['root']); // A not in set → collapsed
		const result = getVisibleSpans(spans, uncollapsed);
		expect(result.map((s) => s.span_id)).toEqual(['root', 'A']);
	});

	it('collapses one subtree while sibling subtree stays visible', () => {
		// root → childA (with grandchildren), childB (with grandchildren)
		const spans = [
			makeSpan({ span_id: 'root', level: 0, has_children: true }),
			makeSpan({ span_id: 'childA', level: 1, has_children: true }),
			makeSpan({ span_id: 'A1', level: 2 }),
			makeSpan({ span_id: 'A2', level: 2 }),
			makeSpan({ span_id: 'childB', level: 1, has_children: true }),
			makeSpan({ span_id: 'B1', level: 2 }),
			makeSpan({ span_id: 'B2', level: 2 }),
		];
		// root and childB expanded, childA collapsed
		const uncollapsed = new Set(['root', 'childB']);
		const result = getVisibleSpans(spans, uncollapsed);
		expect(result.map((s) => s.span_id)).toEqual([
			'root',
			'childA', // visible but collapsed
			'childB', // visible and expanded
			'B1',
			'B2',
		]);
	});

	it('collapse then uncollapse restores children', () => {
		const spans = [
			makeSpan({ span_id: 'root', level: 0, has_children: true }),
			makeSpan({ span_id: 'a', level: 1 }),
			makeSpan({ span_id: 'b', level: 1 }),
		];

		// Collapsed
		const collapsed = getVisibleSpans(spans, new Set());
		expect(collapsed.map((s) => s.span_id)).toEqual(['root']);

		// Uncollapsed
		const uncollapsed = getVisibleSpans(spans, new Set(['root']));
		expect(uncollapsed.map((s) => s.span_id)).toEqual(['root', 'a', 'b']);
	});

	it('hides all levels below collapsed span in deeply nested tree', () => {
		// 6 levels deep, collapse at level 2
		const spans = [
			makeSpan({ span_id: 'L0', level: 0, has_children: true }),
			makeSpan({ span_id: 'L1', level: 1, has_children: true }),
			makeSpan({ span_id: 'L2', level: 2, has_children: true }),
			makeSpan({ span_id: 'L3', level: 3, has_children: true }),
			makeSpan({ span_id: 'L4', level: 4, has_children: true }),
			makeSpan({ span_id: 'L5', level: 5 }),
		];
		// Expand L0 and L1, collapse L2
		const uncollapsed = new Set(['L0', 'L1']);
		const result = getVisibleSpans(spans, uncollapsed);
		expect(result.map((s) => s.span_id)).toEqual(['L0', 'L1', 'L2']);
	});

	it('shows only root-level spans when all parents are collapsed', () => {
		const spans = [
			makeSpan({ span_id: 'root1', level: 0, has_children: true }),
			makeSpan({ span_id: 'child1', level: 1 }),
			makeSpan({ span_id: 'root2', level: 0, has_children: true }),
			makeSpan({ span_id: 'child2', level: 1 }),
		];
		const uncollapsed = new Set<string>(); // nothing expanded
		const result = getVisibleSpans(spans, uncollapsed);
		expect(result.map((s) => s.span_id)).toEqual(['root1', 'root2']);
	});

	it('leaf span in uncollapsed set has no effect', () => {
		const spans = [
			makeSpan({ span_id: 'root', level: 0, has_children: true }),
			makeSpan({ span_id: 'leaf', level: 1, has_children: false }),
		];
		// leaf is in uncollapsed set but has_children=false, should make no difference
		const uncollapsed = new Set(['root', 'leaf']);
		const result = getVisibleSpans(spans, uncollapsed);
		expect(result).toEqual(spans);
	});

	it('handles 10k spans within 50ms', () => {
		// Build a tree: 100 root spans, each with 99 children = 10,000 spans
		const spans: SpanV3[] = [];
		const uncollapsed = new Set<string>();

		for (let i = 0; i < 100; i++) {
			const rootId = `root-${i}`;
			spans.push(makeSpan({ span_id: rootId, level: 0, has_children: true }));
			uncollapsed.add(rootId);
			for (let j = 0; j < 99; j++) {
				spans.push(makeSpan({ span_id: `child-${i}-${j}`, level: 1 }));
			}
		}

		expect(spans).toHaveLength(10000);

		const start = performance.now();
		const result = getVisibleSpans(spans, uncollapsed);
		const elapsed = performance.now() - start;

		expect(result).toHaveLength(10000); // all expanded
		expect(elapsed).toBeLessThan(50);
	});

	it('handles multiple collapsed spans at the same level correctly', () => {
		// root → A (collapsed), B (collapsed), C (expanded)
		const spans = [
			makeSpan({ span_id: 'root', level: 0, has_children: true }),
			makeSpan({ span_id: 'A', level: 1, has_children: true }),
			makeSpan({ span_id: 'A1', level: 2 }),
			makeSpan({ span_id: 'B', level: 1, has_children: true }),
			makeSpan({ span_id: 'B1', level: 2 }),
			makeSpan({ span_id: 'C', level: 1, has_children: true }),
			makeSpan({ span_id: 'C1', level: 2 }),
		];
		// root and C expanded; A and B collapsed
		const uncollapsed = new Set(['root', 'C']);
		const result = getVisibleSpans(spans, uncollapsed);
		expect(result.map((s) => s.span_id)).toEqual(['root', 'A', 'B', 'C', 'C1']);
	});
});

describe('getAncestorSpanIds', () => {
	it('returns empty set for root span', () => {
		const spans = [makeSpan({ span_id: 'root', level: 0 })];
		expect(getAncestorSpanIds(spans, 'root').size).toBe(0);
	});

	it('returns parent for direct child', () => {
		const spans = [
			makeSpan({ span_id: 'root', level: 0, has_children: true }),
			makeSpan({ span_id: 'child', level: 1, parent_span_id: 'root' }),
		];
		const ancestors = getAncestorSpanIds(spans, 'child');
		expect(ancestors).toEqual(new Set(['root']));
	});

	it('returns all ancestors for deeply nested span', () => {
		const spans = [
			makeSpan({ span_id: 'L0', level: 0, has_children: true }),
			makeSpan({
				span_id: 'L1',
				level: 1,
				has_children: true,
				parent_span_id: 'L0',
			}),
			makeSpan({
				span_id: 'L2',
				level: 2,
				has_children: true,
				parent_span_id: 'L1',
			}),
			makeSpan({ span_id: 'L3', level: 3, parent_span_id: 'L2' }),
		];
		const ancestors = getAncestorSpanIds(spans, 'L3');
		expect(ancestors).toEqual(new Set(['L2', 'L1', 'L0']));
	});

	it('returns empty set for unknown span', () => {
		const spans = [makeSpan({ span_id: 'root', level: 0 })];
		expect(getAncestorSpanIds(spans, 'unknown').size).toBe(0);
	});
});
