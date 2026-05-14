import { SpanV3 } from 'types/api/trace/getTraceV3';

import {
	migrateV2ToV3Entries,
	v2KeyToPath,
} from '../useMigratePinnedAttributes';

function makeSpan(overrides: Partial<SpanV3> = {}): SpanV3 {
	return {
		span_id: 'span-1',
		trace_id: 'trace-1',
		parent_span_id: '',
		timestamp: 0,
		duration_nano: 0,
		name: 'test-span',
		'service.name': 'test-svc',
		has_error: false,
		status_message: '',
		status_code: 0,
		status_code_string: '',
		attributes: {},
		resource: {},
		...overrides,
	} as SpanV3;
}

describe('v2KeyToPath', () => {
	it('returns attributes path when key is in span.attributes', () => {
		const span = makeSpan({ attributes: { 'http.method': 'GET' } });
		expect(v2KeyToPath('http.method', span)).toStrictEqual([
			'attributes',
			'http.method',
		]);
	});

	it('returns resource path when key is only in span.resource', () => {
		const span = makeSpan({ resource: { 'service.name': 'svc' } });
		expect(v2KeyToPath('service.name', span)).toStrictEqual([
			'resource',
			'service.name',
		]);
	});

	it('prefers attributes over resource when key exists in both', () => {
		const span = makeSpan({
			attributes: { foo: 'a' },
			resource: { foo: 'r' },
		});
		expect(v2KeyToPath('foo', span)).toStrictEqual(['attributes', 'foo']);
	});

	it('returns top-level path when key is on the span root', () => {
		const span = makeSpan({ attributes: {}, resource: {} });
		// `name` is a top-level field on SpanV3
		expect(v2KeyToPath('name', span)).toStrictEqual(['name']);
	});

	it('returns null when key is not found anywhere', () => {
		const span = makeSpan({ attributes: {}, resource: {} });
		expect(v2KeyToPath('unknown.key', span)).toBeNull();
	});
});

describe('migrateV2ToV3Entries', () => {
	const span = makeSpan({
		attributes: { 'http.method': 'GET', 'db.system': 'postgres' },
		resource: { 'service.name': 'svc' },
	});

	it('returns empty result for empty input', () => {
		expect(migrateV2ToV3Entries([], span)).toStrictEqual({
			next: [],
			convertedAny: false,
			stillHasV2: false,
		});
	});

	it('passes V3 entries through unchanged', () => {
		const v3Entry = '["attributes","http.method"]';
		expect(migrateV2ToV3Entries([v3Entry], span)).toStrictEqual({
			next: [v3Entry],
			convertedAny: false,
			stillHasV2: false,
		});
	});

	it('converts a resolvable V2 entry under attributes', () => {
		const result = migrateV2ToV3Entries(['http.method'], span);
		expect(result.next).toStrictEqual(['["attributes","http.method"]']);
		expect(result.convertedAny).toBe(true);
		expect(result.stillHasV2).toBe(false);
	});

	it('converts a resolvable V2 entry under resource', () => {
		const result = migrateV2ToV3Entries(['service.name'], span);
		expect(result.next).toStrictEqual(['["resource","service.name"]']);
		expect(result.convertedAny).toBe(true);
		expect(result.stillHasV2).toBe(false);
	});

	it('preserves an unresolvable V2 entry as-is', () => {
		const result = migrateV2ToV3Entries(['unknown.key'], span);
		expect(result.next).toStrictEqual(['unknown.key']);
		expect(result.convertedAny).toBe(false);
		expect(result.stillHasV2).toBe(true);
	});

	it('handles a mixed array: V3 + resolvable V2 + unresolvable V2', () => {
		const v3Entry = '["attributes","http.method"]';
		const result = migrateV2ToV3Entries(
			[v3Entry, 'db.system', 'unknown.key'],
			span,
		);
		expect(result.next).toStrictEqual([
			v3Entry,
			'["attributes","db.system"]',
			'unknown.key',
		]);
		expect(result.convertedAny).toBe(true);
		expect(result.stillHasV2).toBe(true);
	});

	it('preserves input order in next[]', () => {
		const result = migrateV2ToV3Entries(
			['unknown.key', 'http.method', 'service.name'],
			span,
		);
		expect(result.next).toStrictEqual([
			'unknown.key',
			'["attributes","http.method"]',
			'["resource","service.name"]',
		]);
	});

	it('on a different span, previously-unresolvable entries can now resolve', () => {
		// First span doesn't have db.system.
		const httpSpan = makeSpan({
			attributes: { 'http.method': 'GET' },
			resource: {},
		});
		const first = migrateV2ToV3Entries(['db.system'], httpSpan);
		expect(first.stillHasV2).toBe(true);
		expect(first.next).toStrictEqual(['db.system']);

		// Same entries on a DB span now resolve.
		const dbSpan = makeSpan({
			attributes: { 'db.system': 'postgres' },
			resource: {},
		});
		const second = migrateV2ToV3Entries(first.next, dbSpan);
		expect(second.convertedAny).toBe(true);
		expect(second.stillHasV2).toBe(false);
		expect(second.next).toStrictEqual(['["attributes","db.system"]']);
	});
});
