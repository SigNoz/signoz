import { normalizeRawToV2 } from '../usePinnedAttributes';

describe('normalizeRawToV2', () => {
	it('returns empty result for empty input', () => {
		expect(normalizeRawToV2([])).toStrictEqual({ value: [], changed: false });
	});

	it('passes V2 flat entries through unchanged', () => {
		const raw = ['http.method', 'service.name'];
		expect(normalizeRawToV2(raw)).toStrictEqual({
			value: ['http.method', 'service.name'],
			changed: false,
		});
	});

	it('converts a V3 path entry to its leaf key', () => {
		const result = normalizeRawToV2(['["attributes","http.method"]']);
		expect(result.value).toStrictEqual(['http.method']);
		expect(result.changed).toBe(true);
	});

	it('converts V3 resource path to its leaf key', () => {
		const result = normalizeRawToV2(['["resource","service.name"]']);
		expect(result.value).toStrictEqual(['service.name']);
		expect(result.changed).toBe(true);
	});

	it('handles single-element V3 path (top-level fields)', () => {
		const result = normalizeRawToV2(['["name"]']);
		expect(result.value).toStrictEqual(['name']);
		expect(result.changed).toBe(true);
	});

	it('dedupes V3 entries that share a leaf key across namespaces', () => {
		const result = normalizeRawToV2([
			'["attributes","http.method"]',
			'["resource","http.method"]',
		]);
		expect(result.value).toStrictEqual(['http.method']);
		expect(result.changed).toBe(true);
	});

	it('dedupes a V3 entry sharing a leaf with an existing V2 entry', () => {
		const result = normalizeRawToV2([
			'http.method',
			'["attributes","http.method"]',
		]);
		expect(result.value).toStrictEqual(['http.method']);
		expect(result.changed).toBe(true);
	});

	it('dedupes duplicate V2 entries', () => {
		const result = normalizeRawToV2(['http.method', 'http.method']);
		expect(result.value).toStrictEqual(['http.method']);
		expect(result.changed).toBe(true);
	});

	it('preserves V2 entries when no V3 conversion or dedupe is needed', () => {
		const result = normalizeRawToV2(['a', 'b', 'c']);
		expect(result.value).toStrictEqual(['a', 'b', 'c']);
		expect(result.changed).toBe(false);
	});

	it('handles a mixed array: V3 + V2 with no overlap', () => {
		const result = normalizeRawToV2([
			'["attributes","http.method"]',
			'db.system',
			'["resource","service.name"]',
		]);
		expect(result.value).toStrictEqual([
			'http.method',
			'db.system',
			'service.name',
		]);
		expect(result.changed).toBe(true);
	});

	it('preserves insertion order of first-seen leaf keys', () => {
		const result = normalizeRawToV2([
			'["attributes","b"]',
			'a',
			'["resource","c"]',
			'a', // duplicate, should be dropped
		]);
		expect(result.value).toStrictEqual(['b', 'a', 'c']);
		expect(result.changed).toBe(true);
	});

	it('treats malformed V3-looking entries (non-array JSON) as V2 flat', () => {
		// '{}' parses as JSON but isn't an array, so isV3PinnedAttribute returns false.
		const result = normalizeRawToV2(['{}']);
		expect(result.value).toStrictEqual(['{}']);
		expect(result.changed).toBe(false);
	});

	it('keeps a V3 entry as-is when deserialize fails (empty path)', () => {
		// Edge case: '[]' parses as an empty array. isV3PinnedAttribute returns
		// true, but deserializeKeyPath returns an empty array → leaf can't be
		// extracted, so we fall back to keeping the entry verbatim.
		const result = normalizeRawToV2(['[]']);
		expect(result.value).toStrictEqual(['[]']);
		expect(result.changed).toBe(false);
	});

	describe('round-trip with V3 migration', () => {
		it('V2 entries → V3 conversion → V2 normalization recovers the originals', () => {
			// Simulates the cross-view workflow.
			const originalV2 = ['http.method', 'service.name'];

			// Simulate V3 migration would have produced these paths.
			const v3Form = [
				'["attributes","http.method"]',
				'["resource","service.name"]',
			];

			// V2 hook normalizes them back to flat strings.
			const result = normalizeRawToV2(v3Form);
			expect(result.value).toStrictEqual(originalV2);
			expect(result.changed).toBe(true);
		});
	});
});
