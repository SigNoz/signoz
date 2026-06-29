import { Json, PathSeg } from './predicates';

export const DiffCode = {
	Set: 1,
	Delete: 2,
} as const;

export type DiffCodeValue = (typeof DiffCode)[keyof typeof DiffCode];

/**
 * A single diff operation: `[code, path, value]`. `value` is `undefined` for deletes.
 */
export type DiffOp = [code: DiffCodeValue, path: PathSeg[], value: Json];

/**
 * Keys that must never reach a downstream `set`/rebuild step. Walking these
 * would let a crafted query poison `Object.prototype`. They are skipped on both
 * sides of the diff, so neither a SET nor a DELETE op is ever produced for them.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Array paths that use template-based diffing (added elements diff against [0]).
 * These are query builder arrays where added items are structurally similar.
 */
const TEMPLATE_ARRAY_PATHS = [
	['builder', 'queryData'],
	['builder', 'queryFormulas'],
	['builder', 'queryTraceOperator'],
	['promql'],
	['clickhouse_sql'],
];

function isTemplateArrayPath(path: PathSeg[]): boolean {
	return TEMPLATE_ARRAY_PATHS.some(
		(pattern) =>
			pattern.length === path.length && pattern.every((seg, i) => seg === path[i]),
	);
}

const hasOwn = (obj: object, key: string): boolean =>
	Object.prototype.hasOwnProperty.call(obj, key);

const leavesEqual = (a: Json, b: Json): boolean =>
	JSON.stringify(a) === JSON.stringify(b);

/**
 * Diff two arrays element-wise.
 * Extra query items are SET; missing ones DELETE.
 * Special case: if query is empty but baseline isn't, emit a single SET of `[]`
 * rather than individual DELETEs, so the empty array survives the round-trip.
 *
 * For known query builder arrays (queryData, queryFormulas, etc.), added elements
 * diff against baseArr[0] as template to minimize output size.
 */
export function diffArrays(
	baseArr: Json[],
	queryArr: Json[],
	path: PathSeg[] = [],
): DiffOp[] {
	// If query is empty but baseline has elements, emit SET of [] to preserve it.
	if (queryArr.length === 0 && baseArr.length > 0) {
		return [[DiffCode.Set, path, []]];
	}

	// Use template diffing for known query builder arrays
	const useTemplate = isTemplateArrayPath(path) && baseArr.length > 0;
	const template = useTemplate ? baseArr[0] : undefined;

	const ops: DiffOp[] = [];
	const maxLen = Math.max(baseArr.length, queryArr.length);
	for (let i = 0; i < maxLen; i += 1) {
		const segPath = [...path, i];
		if (i >= queryArr.length) {
			ops.push([DiffCode.Delete, segPath, undefined]);
		} else if (i >= baseArr.length) {
			// Use template diffing if available, otherwise wholesale SET
			if (template !== undefined) {
				ops.push(...diffNodes(template, queryArr[i], segPath));
			} else {
				ops.push([DiffCode.Set, segPath, queryArr[i]]);
			}
		} else {
			ops.push(...diffNodes(baseArr[i], queryArr[i], segPath));
		}
	}
	return ops;
}

/**
 * Diff two plain objects by own keys. Forbidden keys are skipped entirely.
 * Special case: if query is empty but baseline isn't, emit a single SET of `{}`
 * rather than individual DELETEs, so the empty object survives the round-trip.
 */
export function diffObjects(
	baseObj: Record<string, Json>,
	queryObj: Record<string, Json>,
	path: PathSeg[] = [],
): DiffOp[] {
	const baseKeys = Object.keys(baseObj).filter((k) => !FORBIDDEN_KEYS.has(k));
	const queryKeys = Object.keys(queryObj).filter((k) => !FORBIDDEN_KEYS.has(k));

	// If query is empty but baseline has keys, emit SET of {} to preserve it.
	if (queryKeys.length === 0 && baseKeys.length > 0) {
		return [[DiffCode.Set, path, {}]];
	}

	const ops: DiffOp[] = [];
	const allKeys = new Set([...baseKeys, ...queryKeys]);
	for (const key of allKeys) {
		const segPath = [...path, key];
		if (!hasOwn(queryObj, key)) {
			ops.push([DiffCode.Delete, segPath, undefined]);
		} else if (!hasOwn(baseObj, key)) {
			ops.push([DiffCode.Set, segPath, queryObj[key]]);
		} else {
			ops.push(...diffNodes(baseObj[key], queryObj[key], segPath));
		}
	}
	return ops;
}

/**
 * Diff any two nodes, dispatching on their shape.
 */
export function diffNodes(
	baseline: Json,
	query: Json,
	path: PathSeg[] = [],
): DiffOp[] {
	const baseIsArray = Array.isArray(baseline);
	const queryIsArray = Array.isArray(query);
	const baseIsObj =
		typeof baseline === 'object' && baseline !== null && !baseIsArray;
	const queryIsObj =
		typeof query === 'object' && query !== null && !queryIsArray;

	// Both arrays: walk element-wise even if one is empty. This ensures paths
	// like `['builder', 'queryFormulas', 0, ...]` are emitted (not a wholesale
	// SET on the array itself), which is required for prefix substitution.
	if (baseIsArray && queryIsArray) {
		return diffArrays(baseline, query, path);
	}

	// Both plain objects (including empty ones): walk key-wise.
	if (baseIsObj && queryIsObj) {
		return diffObjects(
			baseline as Record<string, Json>,
			query as Record<string, Json>,
			path,
		);
	}

	// Both scalars (non-containers): emit a SET only when they differ.
	if (!baseIsArray && !baseIsObj && !queryIsArray && !queryIsObj) {
		return leavesEqual(baseline, query) ? [] : [[DiffCode.Set, path, query]];
	}

	// Mixed container types (array-vs-object): walk key-wise, treating array
	// indices as string keys. This is an edge case but preserves intent.
	if ((baseIsArray || baseIsObj) && (queryIsArray || queryIsObj)) {
		return diffObjects(
			baseline as Record<string, Json>,
			query as Record<string, Json>,
			path,
		);
	}

	// True shape mismatch: scalar vs container → replace wholesale.
	return [[DiffCode.Set, path, query]];
}

/**
 * Entry point: diff a baseline against a query, rooted at the empty path.
 */
export function computeDiff(baseline: Json, query: Json): DiffOp[] {
	return diffNodes(baseline, query, []);
}
