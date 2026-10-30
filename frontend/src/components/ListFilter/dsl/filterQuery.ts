// Pure, side-effect-free helpers over the backend list-filter DSL string
// (e.g. `GET /api/v2/dashboards?query=...`). The query string is the single source of
// truth; these build/parse/splice clauses for it. Free of React so the same
// logic backs live filtering, saved views, and built-in views.
//
// DSL reference (subset used here):
//   name CONTAINS 'text'
//   created_by = 'a@b.com'  |  created_by IN ['a@b.com', 'c@d.com']
//   updated_at >= '2026-06-01T00:00:00.000Z'   (RFC3339)
//   env = 'prod'           (any non-reserved key is a dynamic filter, e.g. a tag)
//   locked = true
import dayjs from 'dayjs';

import type { UpdatedWindow } from './types';
import { literal } from './dslGrammar';
import { scanTerm, splitTopLevelTerms } from './dslTokenizer';

const UPDATED_WINDOW_DAYS: Record<Exclude<UpdatedWindow, 'any'>, number> = {
	today: 1,
	'7d': 7,
	'30d': 30,
};

// The `updated_at >= <cutoff>` clause for a relative window (null for 'any').
export const updatedClause = (window: UpdatedWindow): string | null => {
	if (window === 'any') {
		return null;
	}
	const cutoff = dayjs()
		.subtract(UPDATED_WINDOW_DAYS[window], 'day')
		.toISOString();
	return `updated_at >= ${literal(cutoff)}`;
};

export const isQueryEmpty = (query: string): boolean => !query.trim();

export const areQueriesEqual = (a: string, b: string): boolean =>
	a.trim() === b.trim();

// The `created_by` clause for a set of emails (single `=`, multiple `IN [...]`).
export const createdByClause = (emails: string[]): string | null => {
	if (emails.length === 0) {
		return null;
	}
	if (emails.length === 1) {
		return `created_by = ${literal(emails[0])}`;
	}
	return `created_by IN [${emails.map(literal).join(', ')}]`;
};

// Strip matching surrounding quotes and unescape a DSL string value.
const unquote = (raw: string): string => {
	const t = raw.trim();
	if (
		t.length >= 2 &&
		(t[0] === "'" || t[0] === '"') &&
		t[t.length - 1] === t[0]
	) {
		return t.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
	}
	return t;
};

// Parse a `[...]` / `(...)` (or single) value list into unquoted strings.
const parseValueList = (raw: string): string[] => {
	let inner = raw.trim();
	if (/^[[(].*[\])]$/.test(inner)) {
		inner = inner.slice(1, -1);
	}
	const parts: string[] = [];
	let buf = '';
	let quote: string | null = null;
	for (let i = 0; i < inner.length; i += 1) {
		const c = inner[i];
		if (quote) {
			if (c === '\\') {
				buf += inner[i + 1] ?? '';
				i += 1;
			} else if (c === quote) {
				quote = null;
			} else {
				buf += c;
			}
		} else if (c === "'" || c === '"') {
			quote = c;
		} else if (c === ',') {
			parts.push(buf.trim());
			buf = '';
		} else {
			buf += c;
		}
	}
	if (buf.trim()) {
		parts.push(buf.trim());
	}
	return parts.filter(Boolean);
};

// Map a `updated_at >= <iso>` timestamp back to the nearest relative window it
// was likely generated from, else null (a custom/older cutoff we won't reflect).
export const updatedWindowFromTimestamp = (
	iso: string,
): UpdatedWindow | null => {
	const then = dayjs(unquote(iso));
	if (!then.isValid()) {
		return null;
	}
	const days = dayjs().diff(then, 'day', true);
	if (days >= 0.5 && days <= 1.5) {
		return 'today';
	}
	if (days >= 6 && days <= 8) {
		return '7d';
	}
	if (days >= 28 && days <= 32) {
		return '30d';
	}
	return null;
};

export interface ReflectedClauses {
	createdBy: string[];
	updated: UpdatedWindow;
}

// Best-effort extraction of the two dropdown-reflected clauses from the query.
// Only top-level, AND-joined, simple `key OP value` terms reflect; OR/nested/
// duplicate/other-operator clauses fall back to the dropdown default.
export const parseReflectedClauses = (query: string): ReflectedClauses => {
	const terms = splitTopLevelTerms(query);
	let createdBy: string[] = [];
	let updated: UpdatedWindow = 'any';
	let createdByCount = 0;
	let updatedCount = 0;

	terms.forEach((term) => {
		const trimmed = term.text.trim();
		if (!trimmed || trimmed.startsWith('(')) {
			return;
		}
		const scan = scanTerm(term.text);
		if (!scan.key || !scan.operator || !scan.value) {
			return;
		}
		const key = scan.key.text.toLowerCase();
		const op = scan.operator.canonical;
		const value = scan.value.text.trim();
		if (key === 'created_by') {
			createdByCount += 1;
			if (op === '=') {
				createdBy = [unquote(value)];
			} else if (op === 'IN') {
				createdBy = parseValueList(value);
			} else {
				createdBy = [];
			}
		} else if (key === 'updated_at') {
			updatedCount += 1;
			updated = op === '>=' ? (updatedWindowFromTimestamp(value) ?? 'any') : 'any';
		}
	});

	if (createdByCount > 1) {
		createdBy = [];
	}
	if (updatedCount > 1) {
		updated = 'any';
	}
	return { createdBy, updated };
};

// Add / replace / remove a top-level simple clause for `key`, leaving every other
// (incl. nested/OR) term intact. Never corrupts hand-typed structure.
export const spliceClause = (
	query: string,
	key: string,
	clause: string | null,
): string => {
	const terms = splitTopLevelTerms(query);
	const target = key.toLowerCase();
	const matches: number[] = [];
	terms.forEach((term, idx) => {
		const trimmed = term.text.trim();
		if (!trimmed || trimmed.startsWith('(')) {
			return;
		}
		const scan = scanTerm(term.text);
		if (scan.key && scan.operator && scan.key.text.toLowerCase() === target) {
			matches.push(idx);
		}
	});

	const firstMatch = matches.length ? matches[0] : -1;
	const kept: { text: string; joiner: 'AND' | 'OR' | null }[] = [];
	const joinerFor = (fallback: 'AND' | 'OR' | null): 'AND' | 'OR' | null =>
		kept.length === 0 ? null : (fallback ?? 'AND');

	terms.forEach((term, idx) => {
		if (matches.includes(idx)) {
			if (idx === firstMatch && clause !== null) {
				kept.push({ text: clause, joiner: joinerFor(term.precedingJoiner) });
			}
			return;
		}
		const trimmed = term.text.trim();
		if (trimmed) {
			kept.push({ text: trimmed, joiner: joinerFor(term.precedingJoiner) });
		}
	});

	if (clause !== null && matches.length === 0) {
		kept.push({ text: clause, joiner: joinerFor('AND') });
	}

	return kept
		.map((k, i) => (i === 0 ? k.text : ` ${k.joiner} ${k.text}`))
		.join('');
};
