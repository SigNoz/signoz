import {
	getCaretContext,
	spliceAtCaret,
	splitTopLevelTerms,
} from './dslTokenizer';

describe('splitTopLevelTerms', () => {
	it('splits on top-level AND/OR', () => {
		const terms = splitTopLevelTerms('a AND b OR c');
		expect(terms.map((t) => t.text.trim())).toStrictEqual(['a', 'b', 'c']);
		expect(terms.map((t) => t.precedingJoiner)).toStrictEqual([
			null,
			'AND',
			'OR',
		]);
	});

	it('ignores AND inside quotes', () => {
		const terms = splitTopLevelTerms("name = 'a AND b' AND env = 'x'");
		expect(terms).toHaveLength(2);
		expect(terms[0].text.trim()).toBe("name = 'a AND b'");
		expect(terms[1].text.trim()).toBe("env = 'x'");
	});

	it('ignores OR inside parentheses', () => {
		const terms = splitTopLevelTerms('(a OR b) AND c');
		expect(terms).toHaveLength(2);
		expect(terms[1].precedingJoiner).toBe('AND');
	});

	it('keeps an IN list as a single term', () => {
		const terms = splitTopLevelTerms("created_by IN ['a','b']");
		expect(terms).toHaveLength(1);
	});

	it('does not split inside a bare word containing and/or', () => {
		expect(splitTopLevelTerms('command = 1')).toHaveLength(1);
	});
});

describe('getCaretContext — stage detection', () => {
	const stageAt = (q: string, caret: number): string =>
		getCaretContext(q, caret).stage;

	it('is the key stage while typing the key', () => {
		const ctx = getCaretContext('env', 3);
		expect(ctx.stage).toBe('key');
		expect(ctx.partial).toBe('env');
		expect(ctx.replaceStart).toBe(0);
	});

	it('moves to the operator stage after the key + space', () => {
		const ctx = getCaretContext('env ', 4);
		expect(ctx.stage).toBe('operator');
		expect(ctx.fieldKey).toBe('env');
		expect(ctx.partial).toBe('');
	});

	it('stays on the operator while typing a partial operator', () => {
		const ctx = getCaretContext('env NOT', 7);
		expect(ctx.stage).toBe('operator');
		expect(ctx.partial).toBe('NOT');
		expect(ctx.replaceStart).toBe(4);
	});

	it('moves to the value stage after the operator + space', () => {
		const ctx = getCaretContext('env = ', 6);
		expect(ctx.stage).toBe('value');
		expect(ctx.fieldKey).toBe('env');
		expect(ctx.operator).toBe('=');
	});

	it('recognises a multi-word operator and moves to value', () => {
		const ctx = getCaretContext('env NOT IN ', 11);
		expect(ctx.stage).toBe('value');
		expect(ctx.operator).toBe('NOT IN');
	});

	it('reports value partial inside an open quote', () => {
		const ctx = getCaretContext("env = 'pr", 9);
		expect(ctx.stage).toBe('value');
		expect(ctx.partial).toBe("'pr");
		expect(ctx.replaceStart).toBe(6);
	});

	it('chains a connector after EXISTS (no value stage)', () => {
		expect(stageAt('env EXISTS ', 11)).toBe('connector');
	});

	it('moves to the connector stage after a complete value + space', () => {
		const ctx = getCaretContext("env = 'prod' ", 13);
		expect(ctx.stage).toBe('connector');
		expect(ctx.partial).toBe('');
	});

	it('reports a partial connector keyword', () => {
		const ctx = getCaretContext("env = 'prod' AN", 15);
		expect(ctx.stage).toBe('connector');
		expect(ctx.partial).toBe('AN');
		expect(ctx.replaceStart).toBe(13);
	});

	it('handles a key operator with no whitespace', () => {
		const ctx = getCaretContext("name='x", 7);
		expect(ctx.stage).toBe('value');
		expect(ctx.fieldKey).toBe('name');
		expect(ctx.operator).toBe('=');
	});

	it('starts a fresh key after a top-level AND', () => {
		const q = "created_by = 'a@x' AND ";
		const ctx = getCaretContext(q, q.length);
		expect(ctx.stage).toBe('key');
		expect(ctx.partial).toBe('');
	});

	it('detects the stage of the term under a mid-string caret', () => {
		const q = "env =  AND team = 'core'";
		// caret right after the first `env ` (index 4) is the operator stage
		expect(stageAt(q, 4)).toBe('operator');
	});
});

describe('spliceAtCaret', () => {
	it('splices a key suggestion and returns the caret', () => {
		const ctx = getCaretContext('env', 3);
		const { next, caret } = spliceAtCaret('env', ctx, 'name ');
		expect(next).toBe('name ');
		expect(caret).toBe(5);
	});

	it('splices an operator into the gap', () => {
		const ctx = getCaretContext('env ', 4);
		const { next } = spliceAtCaret('env ', ctx, '= ');
		expect(next).toBe('env = ');
	});

	it('splices a value over an open-quote partial', () => {
		const q = "env = 'pr";
		const ctx = getCaretContext(q, q.length);
		const { next } = spliceAtCaret(q, ctx, "'prod'");
		expect(next).toBe("env = 'prod'");
	});

	it('preserves text after the caret', () => {
		const q = "env  AND team = 'core'";
		const ctx = getCaretContext(q, 4); // operator gap after `env`
		const { next } = spliceAtCaret(q, ctx, '= ');
		expect(next).toBe("env =  AND team = 'core'");
	});
});
