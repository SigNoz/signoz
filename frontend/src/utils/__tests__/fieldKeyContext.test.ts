import {
	FIELD_CONTEXTS,
	getFieldContextPrefix,
	getFieldKeyLabel,
	matchesFieldContextPrefix,
} from '../fieldKeyContext';

describe('getFieldContextPrefix', () => {
	it('matches a complete context prefix with a remainder', () => {
		expect(getFieldContextPrefix('attribute.status')).toStrictEqual({
			context: 'attribute',
			remainder: 'status',
		});
	});

	it('matches a bare context prefix with empty remainder', () => {
		expect(getFieldContextPrefix('resource.')).toStrictEqual({
			context: 'resource',
			remainder: '',
		});
	});

	it('matches every backend field context', () => {
		expect(FIELD_CONTEXTS).toStrictEqual(
			expect.arrayContaining(['attribute', 'resource', 'span', 'body', 'log']),
		);
		FIELD_CONTEXTS.forEach((ctx) => {
			expect(getFieldContextPrefix(`${ctx}.x`)).toStrictEqual({
				context: ctx,
				remainder: 'x',
			});
		});
	});

	it('does not match a partial context name', () => {
		expect(getFieldContextPrefix('attr')).toBeNull();
		expect(getFieldContextPrefix('attribute')).toBeNull();
	});

	it('does not match a non-context key with dots', () => {
		expect(getFieldContextPrefix('status.code')).toBeNull();
	});

	it('matches context case-insensitively but keeps remainder casing', () => {
		expect(getFieldContextPrefix('Attribute.Status')).toStrictEqual({
			context: 'attribute',
			remainder: 'Status',
		});
	});
});

describe('getFieldKeyLabel', () => {
	it('returns the bare name when the search has no prefix', () => {
		expect(getFieldKeyLabel('service.name', 'serv')).toBe('service.name');
		expect(getFieldKeyLabel('service.name', '')).toBe('service.name');
	});

	it('prepends the typed context to a bare name', () => {
		expect(getFieldKeyLabel('service.name', 'resource.serv')).toBe(
			'resource.service.name',
		);
		expect(getFieldKeyLabel('service.name', 'attribute.')).toBe(
			'attribute.service.name',
		);
	});

	it('does not double a prefix the name already carries', () => {
		expect(getFieldKeyLabel('attribute.service.name', 'attribute.serv')).toBe(
			'attribute.service.name',
		);
	});
});

describe('matchesFieldContextPrefix', () => {
	it('accepts every context when the search has no prefix', () => {
		expect(matchesFieldContextPrefix('attribute', 'serv')).toBe(true);
		expect(matchesFieldContextPrefix(undefined, '')).toBe(true);
	});

	it('accepts only the typed context when the search has a prefix', () => {
		expect(matchesFieldContextPrefix('resource', 'resource.serv')).toBe(true);
		expect(matchesFieldContextPrefix('attribute', 'resource.serv')).toBe(false);
		expect(matchesFieldContextPrefix(undefined, 'resource.')).toBe(false);
	});
});
