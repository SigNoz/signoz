import { getSuggestions, type SuggestionSource } from './dslSuggestions';

const source: SuggestionSource = {
	tagKeys: ['env', 'team'],
	tagValuesByKey: { env: ['prod', 'dev'] },
	creatorEmails: ['alice@x.io', 'bob@x.io'],
	currentUserEmail: 'me@x.io',
};

const labels = (q: string, caret: number): string[] =>
	getSuggestions(q, caret, source).items.map((i) => i.label);
const inserts = (q: string, caret: number): string[] =>
	getSuggestions(q, caret, source).items.map((i) => i.insertText);

describe('getSuggestions — key stage', () => {
	it('suggests reserved + tag keys matching the partial', () => {
		expect(labels('en', 2)).toStrictEqual(['env']);
	});

	it('inserts the key with a trailing space', () => {
		expect(inserts('en', 2)).toStrictEqual(['env ']);
	});
});

describe('getSuggestions — operator stage', () => {
	it('offers the full tag operator set as "key op" labels', () => {
		const out = labels('env ', 4);
		expect(out).toContain('env =');
		expect(out).toContain('env CONTAINS');
		expect(out).toContain('env NOT IN');
		expect(out).toContain('env EXISTS');
		expect(out.some((l) => l.includes('REGEXP'))).toBe(false);
	});

	it('restricts locked to = and !=', () => {
		expect(labels('locked ', 7)).toStrictEqual(['locked =', 'locked !=']);
	});

	it('offers range operators for a timestamp key', () => {
		const out = labels('updated_at ', 11);
		expect(out).toContain('updated_at >=');
		expect(out).toContain('updated_at BETWEEN');
		expect(out).not.toContain('updated_at CONTAINS');
	});

	it('filters operators by the typed partial', () => {
		expect(labels('env NOT ', 8)).toHaveLength(0); // "NOT " + space → past partial op, no ops
		expect(labels('env NOT', 7)).toStrictEqual([
			'env NOT CONTAINS',
			'env NOT LIKE',
			'env NOT ILIKE',
			'env NOT IN',
			'env NOT EXISTS',
		]);
	});

	it('inserts just the operator with a trailing space', () => {
		expect(inserts('env C', 5)).toStrictEqual(['CONTAINS ']);
	});
});

describe('getSuggestions — value stage', () => {
	it('suggests creator emails (current user first, labelled) for created_by', () => {
		const out = getSuggestions('created_by = ', 13, source);
		expect(out.items[0].label).toBe('me@x.io (me)');
		expect(out.items.map((i) => i.insertText)).toContain("'alice@x.io' ");
	});

	it('suggests true/false unquoted for locked', () => {
		expect(inserts('locked = ', 9)).toStrictEqual(['true ', 'false ']);
	});

	it('suggests known tag values (quoted, trailing space) for a tag key', () => {
		expect(inserts('env = ', 6)).toStrictEqual(["'prod' ", "'dev' "]);
	});

	it('filters values by the open-quote partial', () => {
		expect(inserts("env = 'pr", 9)).toStrictEqual(["'prod' "]);
	});

	it('offers no value suggestions for free-text keys', () => {
		expect(labels('name = ', 7)).toStrictEqual([]);
	});
});

describe('getSuggestions — IN list values', () => {
	it('wraps a fresh IN value in a bracketed list, caret before the close', () => {
		const q = 'created_by IN ';
		const out = getSuggestions(q, q.length, source);
		const alice = out.items.find((i) => i.label === 'alice@x.io');
		expect(alice?.insertText).toBe("['alice@x.io']");
		expect(alice?.caretOffset).toBe(1);
	});

	it('wraps tag IN values in a bracketed list', () => {
		const q = 'env IN ';
		expect(inserts(q, q.length)).toStrictEqual(["['prod']", "['dev']"]);
	});

	it('appends to an open list and excludes already-entered values', () => {
		const q = "env IN ['prod', ]";
		const caret = q.indexOf(']'); // inside the brackets, after "'prod', "
		const out = getSuggestions(q, caret, source);
		expect(out.items.map((i) => i.label)).toStrictEqual(['dev']);
		const dev = out.items[0];
		// No closing bracket (the existing `]` stays); caret lands at the end.
		expect(dev.insertText).toBe("['prod', 'dev'");
		expect(dev.caretOffset).toBe(0);
	});

	it('treats a complete last literal (no trailing comma) as entered', () => {
		const q = "env IN ['prod'";
		const out = getSuggestions(q, q.length, source);
		// 'prod' is committed; only 'dev' remains and it appends after it.
		expect(out.items.map((i) => i.label)).toStrictEqual(['dev']);
		expect(out.items[0].insertText).toBe("['prod', 'dev'");
	});

	it('filters open-list suggestions by the fragment under the caret', () => {
		const q = "env IN ['de";
		expect(inserts(q, q.length)).toStrictEqual(["['dev'"]);
	});

	it('uses a plain literal for a single-value operator (=)', () => {
		expect(inserts('env = ', 6)).toStrictEqual(["'prod' ", "'dev' "]);
	});
});

describe('getSuggestions — connector stage', () => {
	it('chains AND/OR after a valueless operator', () => {
		expect(labels('env EXISTS ', 11)).toStrictEqual(['AND', 'OR']);
	});

	it('chains AND/OR after a complete value', () => {
		expect(labels("env = 'prod' ", 13)).toStrictEqual(['AND', 'OR']);
		expect(inserts("env = 'prod' ", 13)).toStrictEqual(['AND ', 'OR ']);
	});
});
