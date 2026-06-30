import {
	applyKeySuggestion,
	buildSuggestionKeys,
	getActiveKeyToken,
	matchKeys,
	RESERVED_DSL_KEYS,
} from './dslSuggestions';

describe('getActiveKeyToken', () => {
	it('returns the partial key at the start', () => {
		expect(getActiveKeyToken('nam')).toStrictEqual({ token: 'nam', start: 0 });
	});

	it('returns the partial key after AND', () => {
		const value = 'name = "x" AND en';
		expect(getActiveKeyToken(value)).toStrictEqual({ token: 'en', start: 15 });
	});

	it('is null once an operator (space) has been typed', () => {
		expect(getActiveKeyToken('name contains')).toBeNull();
	});

	it('is null for an empty trailing segment', () => {
		expect(getActiveKeyToken('name = "x" AND ')).toBeNull();
	});
});

describe('buildSuggestionKeys', () => {
	it('lists reserved keys plus distinct tag keys', () => {
		const keys = buildSuggestionKeys([
			{ key: 'env', value: 'prod' },
			{ key: 'env', value: 'dev' },
			{ key: 'team', value: 'core' },
		]);
		expect(keys).toStrictEqual([...RESERVED_DSL_KEYS, 'env', 'team']);
	});
});

describe('matchKeys', () => {
	it('matches case-insensitively and excludes exact matches', () => {
		expect(matchKeys(['name', 'created_by', 'env'], 'NAM')).toStrictEqual([
			'name',
		]);
		expect(matchKeys(['name'], 'name')).toStrictEqual([]);
	});
});

describe('applyKeySuggestion', () => {
	it('replaces the partial key with the chosen key and a trailing space', () => {
		const value = 'name = "x" AND en';
		const active = getActiveKeyToken(value);
		if (!active) {
			throw new Error('expected an active key token');
		}
		expect(applyKeySuggestion(value, active, 'env')).toBe('name = "x" AND env ');
	});
});
