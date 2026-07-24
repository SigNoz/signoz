// Quote/paren/bracket-aware scanning of the dashboards-list filter DSL, shared by
// the autocomplete engine (dslSuggestions) and the clause splicer (filterQuery).
// The DSL is a boolean composition of `key OP value` terms joined by AND/OR.
import {
	canonicalOperator,
	isOperatorSymbolStart,
	OPERATOR_PATTERN,
	VALUELESS_OPERATORS,
} from './dslGrammar';

export interface Term {
	// Raw substring of the term (may carry surrounding whitespace); callers trim.
	text: string;
	start: number; // absolute start index in the query (inclusive)
	end: number; // absolute end index in the query (exclusive)
	precedingJoiner: 'AND' | 'OR' | null;
}

// A top-level AND/OR keyword starting at index `i` (word-boundary aware), or null.
const joinerAt = (
	query: string,
	i: number,
): { value: 'AND' | 'OR'; length: number } | null => {
	const c = query[i];
	if (c !== 'A' && c !== 'a' && c !== 'O' && c !== 'o') {
		return null;
	}
	const prev = i === 0 ? '' : query[i - 1];
	if (!(i === 0 || /[^A-Za-z0-9_]/.test(prev))) {
		return null;
	}
	const m = /^(AND|OR)\b/i.exec(query.slice(i));
	return m
		? { value: m[1].toUpperCase() as 'AND' | 'OR', length: m[0].length }
		: null;
};

// Index just past the string literal that opens at `start` (handles `\` escapes;
// runs to end-of-input if unterminated).
const skipString = (query: string, start: number): number => {
	const quote = query[start];
	let i = start + 1;
	while (i < query.length) {
		if (query[i] === '\\') {
			i += 2;
		} else if (query[i] === quote) {
			return i + 1;
		} else {
			i += 1;
		}
	}
	return i;
};

// Split a query into its top-level (depth-0, outside quotes) AND/OR-separated
// terms. `AND`/`OR` inside quotes or brackets/parens are ignored.
export const splitTopLevelTerms = (query: string): Term[] => {
	const terms: Term[] = [];
	let depth = 0;
	let termStart = 0;
	let precedingJoiner: 'AND' | 'OR' | null = null;
	let i = 0;

	const push = (end: number, next: 'AND' | 'OR' | null): void => {
		terms.push({
			text: query.slice(termStart, end),
			start: termStart,
			end,
			precedingJoiner,
		});
		precedingJoiner = next;
	};

	while (i < query.length) {
		const c = query[i];
		if (c === "'" || c === '"') {
			i = skipString(query, i);
			continue;
		}
		if (c === '[' || c === '(') {
			depth += 1;
		} else if (c === ']' || c === ')') {
			depth = Math.max(0, depth - 1);
		} else if (depth === 0) {
			const joiner = joinerAt(query, i);
			if (joiner) {
				push(i, joiner.value);
				i += joiner.length;
				termStart = i;
				continue;
			}
		}
		i += 1;
	}
	push(query.length, null);
	return terms;
};

export interface TermScan {
	key?: { start: number; end: number; text: string };
	// The recognised operator (canonical form), if the second token parses as one.
	operator?: { start: number; end: number; canonical: string };
	// The second token when it is NOT (yet) a recognised operator — i.e. an
	// operator the user is still typing.
	operatorPartial?: { start: number; end: number; text: string };
	value?: { start: number; end: number; text: string };
}

// Scan a single term (relative coordinates) into key / operator / value tokens.
export const scanTerm = (text: string): TermScan => {
	const n = text.length;
	let i = 0;
	const skipWs = (): void => {
		while (i < n && /\s/.test(text[i])) {
			i += 1;
		}
	};

	skipWs();
	const scan: TermScan = {};

	// Key: a bare token up to whitespace or an operator symbol.
	const ks = i;
	while (i < n && !/\s/.test(text[i]) && !isOperatorSymbolStart(text[i])) {
		i += 1;
	}
	if (i > ks) {
		scan.key = { start: ks, end: i, text: text.slice(ks, i) };
	}

	skipWs();
	if (i >= n) {
		return scan;
	}

	// Operator: try to match a known operator at the current position.
	const rest = text.slice(i);
	const m = OPERATOR_PATTERN.exec(rest);
	// A word operator must end on a boundary so `INDIA` isn't read as `IN`.
	const wordBoundaryOk =
		m &&
		(/[^A-Za-z]$/.test(m[0]) ||
			i + m[0].length >= n ||
			/[^A-Za-z]/.test(text[i + m[0].length]));
	if (m && wordBoundaryOk) {
		scan.operator = {
			start: i,
			end: i + m[0].length,
			canonical: canonicalOperator(m[0]),
		};
		i += m[0].length;
		skipWs();
		if (i < n) {
			scan.value = { start: i, end: n, text: text.slice(i, n) };
		}
		return scan;
	}

	// Not a recognised operator yet — treat the second token as a partial op.
	const os = i;
	while (i < n && !/\s/.test(text[i])) {
		i += 1;
	}
	scan.operatorPartial = { start: os, end: i, text: text.slice(os, i) };
	return scan;
};

export type CaretStage = 'key' | 'operator' | 'value' | 'connector' | 'none';

export interface CaretContext {
	stage: CaretStage;
	fieldKey: string; // key of the active term ('' when still typing the key)
	operator: string; // canonical operator ('' when not yet parsed)
	partial: string; // text typed so far in the active slot (for matching)
	replaceStart: number; // absolute index to start replacing at
	replaceEnd: number; // absolute index to stop replacing (the caret)
}

interface Slot {
	stage: CaretStage;
	operator: string;
	partial: string;
	replaceStartRel: number;
}

// Index where the value CONTENT ends (the value token's `end` is the whole term
// tail, incl. trailing space). A quoted/bracketed value ends after its close; an
// unterminated one runs to the end (still being typed); a bare one ends at space.
const valueContentEnd = (text: string, start: number): number => {
	const n = text.length;
	const ch = text[start];
	if (ch === '"' || ch === "'") {
		for (let i = start + 1; i < n; i += 1) {
			if (text[i] === ch) {
				return i + 1;
			}
		}
		return n;
	}
	if (ch === '[' || ch === '(') {
		const close = ch === '[' ? ']' : ')';
		for (let i = start + 1; i < n; i += 1) {
			if (text[i] === close) {
				return i + 1;
			}
		}
		return n;
	}
	let i = start;
	while (i < n && !/\s/.test(text[i])) {
		i += 1;
	}
	return i;
};

// The connector slot: after a complete term, a (partial) AND/OR keyword sits in
// the trailing whitespace, ready to chain the next term.
const connectorSlot = (
	text: string,
	from: number,
	rel: number,
	operator: string,
): Slot => {
	const ws = /^\s*/.exec(text.slice(from, rel));
	const start = from + (ws ? ws[0].length : 0);
	return {
		stage: 'connector',
		operator,
		partial: text.slice(start, rel),
		replaceStartRel: start,
	};
};

// Slot resolution once the caret is past the key: operator vs value.
const afterKeySlot = (text: string, scan: TermScan, rel: number): Slot => {
	const { operator, operatorPartial, value } = scan;

	// Editing the operator (a partial second token, or within a recognised op).
	if (operatorPartial && rel <= operatorPartial.end) {
		return {
			stage: 'operator',
			operator: '',
			partial: text.slice(operatorPartial.start, rel),
			replaceStartRel: operatorPartial.start,
		};
	}
	if (operator && rel <= operator.end) {
		return {
			stage: 'operator',
			operator: '',
			partial: text.slice(operator.start, rel),
			replaceStartRel: operator.start,
		};
	}
	// Whitespace right after the key, before any operator — starting the operator.
	if (!operator && !operatorPartial) {
		return { stage: 'operator', operator: '', partial: '', replaceStartRel: rel };
	}
	// Past a recognised operator — the value slot, or (once complete) the connector.
	if (operator) {
		if (VALUELESS_OPERATORS.has(operator.canonical)) {
			// After a valueless op (e.g. EXISTS), trailing space → chain AND/OR.
			return rel > operator.end
				? connectorSlot(text, operator.end, rel, operator.canonical)
				: {
						stage: 'none',
						operator: operator.canonical,
						partial: '',
						replaceStartRel: rel,
					};
		}
		if (value) {
			// Caret past a complete value (into trailing space) → chain AND/OR.
			const contentEnd = valueContentEnd(text, value.start);
			if (rel > contentEnd) {
				return connectorSlot(text, contentEnd, rel, operator.canonical);
			}
			return {
				stage: 'value',
				operator: operator.canonical,
				partial: text.slice(value.start, rel),
				replaceStartRel: value.start,
			};
		}
		// No value typed yet — the (empty) value slot.
		return {
			stage: 'value',
			operator: operator.canonical,
			partial: '',
			replaceStartRel: rel,
		};
	}
	// A partial operator the caret has moved past — ambiguous, offer nothing.
	return { stage: 'none', operator: '', partial: '', replaceStartRel: rel };
};

// Resolve which slot (key/operator/value) the caret is editing within a scanned
// term, in term-relative coordinates.
const resolveSlot = (text: string, scan: TermScan, rel: number): Slot => {
	const { key } = scan;
	// Still in/at the key token (or before it).
	if (!key || rel <= key.end) {
		const start = key ? key.start : rel;
		return {
			stage: 'key',
			operator: '',
			partial: key ? text.slice(key.start, rel) : '',
			replaceStartRel: Math.min(start, rel),
		};
	}
	return afterKeySlot(text, scan, rel);
};

// Determine what the caret is currently editing (key / operator / value) within
// the top-level term it sits in, plus the range a suggestion should replace.
export const getCaretContext = (query: string, caret: number): CaretContext => {
	const pos = Math.max(0, Math.min(caret, query.length));
	const terms = splitTopLevelTerms(query);
	// The term the caret sits in: the first whose end >= caret (a joiner boundary
	// counts as the end of the preceding term).
	const term =
		terms.find((t) => pos >= t.start && pos <= t.end) ?? terms[terms.length - 1];

	const scan = scanTerm(term.text);
	const slot = resolveSlot(term.text, scan, pos - term.start);
	return {
		stage: slot.stage,
		fieldKey: scan.key ? scan.key.text : '',
		operator: slot.operator,
		partial: slot.partial,
		replaceStart: term.start + slot.replaceStartRel,
		replaceEnd: pos,
	};
};

export interface SpliceResult {
	next: string;
	caret: number;
}

// Replace the active slot (ctx.replaceStart..replaceEnd) with `insertText`,
// preserving everything after the caret, and return the new caret position.
export const spliceAtCaret = (
	query: string,
	ctx: CaretContext,
	insertText: string,
): SpliceResult => {
	const next =
		query.slice(0, ctx.replaceStart) + insertText + query.slice(ctx.replaceEnd);
	return { next, caret: ctx.replaceStart + insertText.length };
};
