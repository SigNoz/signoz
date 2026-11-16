import dayjs from 'dayjs';

import {
	areQueriesEqual,
	createdByClause,
	isQueryEmpty,
	hasTopLevelClause,
	parseReflectedClauses,
	reflectedEqualityValue,
	spliceClause,
	updatedWindowFromTimestamp,
} from './filterQuery';

describe('createdByClause', () => {
	it('is null for no emails, = for one, IN for many', () => {
		expect(createdByClause([])).toBeNull();
		expect(createdByClause(['a@x.io'])).toBe("created_by = 'a@x.io'");
		expect(createdByClause(['a@x.io', 'b@x.io'])).toBe(
			"created_by IN ['a@x.io', 'b@x.io']",
		);
	});
});

describe('parseReflectedClauses', () => {
	it('reflects a top-level created_by equality', () => {
		expect(
			parseReflectedClauses("created_by = 'a@x.io'").createdBy,
		).toStrictEqual(['a@x.io']);
	});

	it('reflects a created_by IN list', () => {
		expect(
			parseReflectedClauses("created_by IN ['a@x.io','b@x.io']").createdBy,
		).toStrictEqual(['a@x.io', 'b@x.io']);
	});

	it('does not reflect a non =/IN created_by operator', () => {
		expect(
			parseReflectedClauses("created_by != 'a@x.io'").createdBy,
		).toStrictEqual([]);
	});

	it('does not reflect a nested (parenthesised) clause', () => {
		expect(
			parseReflectedClauses("(created_by = 'a@x.io') AND name = 'x'").createdBy,
		).toStrictEqual([]);
	});

	it('does not reflect a duplicated key', () => {
		expect(
			parseReflectedClauses("created_by = 'a@x.io' AND created_by = 'b@x.io'")
				.createdBy,
		).toStrictEqual([]);
	});

	it('reflects a recent updated_at >= as the nearest window', () => {
		const iso = dayjs().subtract(7, 'day').toISOString();
		expect(parseReflectedClauses(`updated_at >= '${iso}'`).updated).toBe('7d');
	});

	it('falls back to any for an unrecognised updated_at cutoff', () => {
		const iso = dayjs().subtract(400, 'day').toISOString();
		expect(parseReflectedClauses(`updated_at >= '${iso}'`).updated).toBe('any');
	});
});

describe('reflectedEqualityValue', () => {
	it('reads the unquoted value of a top-level equality', () => {
		expect(reflectedEqualityValue("status = 'active'", 'status')).toBe('active');
		expect(reflectedEqualityValue('status = deleted AND x', 'status')).toBe(
			'deleted',
		);
	});

	it('reads a one-value IN list as the value', () => {
		expect(reflectedEqualityValue("status IN ['active']", 'status')).toBe(
			'active',
		);
		expect(reflectedEqualityValue('status in (deleted)', 'status')).toBe(
			'deleted',
		);
		expect(
			reflectedEqualityValue("status IN ['active', 'deleted']", 'status'),
		).toBeNull();
	});

	it('is null when the key is absent, nested, repeated or not an equality', () => {
		expect(reflectedEqualityValue('name = x', 'status')).toBeNull();
		expect(reflectedEqualityValue("(status = 'active')", 'status')).toBeNull();
		expect(
			reflectedEqualityValue('status = active OR status = deleted', 'status'),
		).toBeNull();
		expect(reflectedEqualityValue('status != active', 'status')).toBeNull();
	});
});

describe('hasTopLevelClause', () => {
	it('is true for any top-level operator on the key and false otherwise', () => {
		expect(hasTopLevelClause("status != 'active'", 'status')).toBe(true);
		expect(hasTopLevelClause("name = 'x' AND status IN [a, b]", 'status')).toBe(
			true,
		);
		expect(hasTopLevelClause("(status = 'active')", 'status')).toBe(false);
		expect(hasTopLevelClause("name = 'x'", 'status')).toBe(false);
	});
});

describe('spliceClause', () => {
	it('groups OR-joined terms before appending a clause', () => {
		expect(
			spliceClause("name = 'foo' OR email = 'bar'", 'status', "status = 'x'"),
		).toBe("(name = 'foo' OR email = 'bar') AND status = 'x'");
		expect(
			spliceClause("name = 'foo' AND email = 'bar'", 'status', "status = 'x'"),
		).toBe("name = 'foo' AND email = 'bar' AND status = 'x'");
	});

	it('appends a clause when the key is absent', () => {
		expect(
			spliceClause("name = 'x'", 'created_by', "created_by = 'a@x.io'"),
		).toBe("name = 'x' AND created_by = 'a@x.io'");
	});

	it('replaces an existing top-level clause for the key', () => {
		expect(
			spliceClause(
				"created_by = 'old' AND name = 'x'",
				'created_by',
				"created_by = 'new'",
			),
		).toBe("created_by = 'new' AND name = 'x'");
	});

	it('removes the clause when passed null', () => {
		expect(
			spliceClause("created_by = 'a@x.io' AND name = 'x'", 'created_by', null),
		).toBe("name = 'x'");
	});

	it('leaves a nested clause untouched and appends instead', () => {
		expect(
			spliceClause(
				"(created_by = 'a') AND name = 'x'",
				'created_by',
				"created_by = 'b'",
			),
		).toBe("(created_by = 'a') AND name = 'x' AND created_by = 'b'");
	});

	it('is a no-op removing an absent key', () => {
		expect(spliceClause("name = 'x'", 'updated_at', null)).toBe("name = 'x'");
	});
});

describe('updatedWindowFromTimestamp', () => {
	it('maps a ~1 day cutoff to today', () => {
		expect(
			updatedWindowFromTimestamp(dayjs().subtract(1, 'day').toISOString()),
		).toBe('today');
	});

	it('returns null for an unquoted invalid value', () => {
		expect(updatedWindowFromTimestamp('not-a-date')).toBeNull();
	});
});

describe('query helpers', () => {
	it('isQueryEmpty ignores whitespace', () => {
		expect(isQueryEmpty('   ')).toBe(true);
		expect(isQueryEmpty("name = 'x'")).toBe(false);
	});

	it('areQueriesEqual trims before comparing', () => {
		expect(areQueriesEqual("name = 'x' ", "  name = 'x'")).toBe(true);
	});
});
