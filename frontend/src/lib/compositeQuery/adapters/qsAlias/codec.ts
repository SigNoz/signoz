/**
 * qsAlias codec: content-aware URL serialization with prefix substitution
 * and field aliasing for readable, compact URLs.
 *
 * Wire format: multiple query params with aliased paths
 *   _t=QAm&query0.ds=traces&query0.aa.key=http.status_code&query0.fl.it.0.key.key=service.name
 *
 * Prefix substitution: builder.queryData.0 → query0
 * Field aliasing: aggregateAttribute → aa, filters → fl, etc.
 */
import set from 'lodash-es/set';
import qs from 'qs';

import getBaselineByTag, {
	BaselineTag,
	pickBaseline,
} from 'lib/compositeQuery/baseline';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { computeDiff, DiffCode } from './diff/diff';
import { isLeaf, Json, PathSeg } from './diff/predicates';
import { decodeLeaf, encodeLeaf } from './leaf';
import {
	FIELD_ALIASES,
	FIELD_REVERSE,
	isOwnedKey,
	PREFIX_PATTERNS,
	PREFIX_REVERSE,
} from './maps';

const TAG_KEY = '_t';
const DEL_PREFIX = '-';

const isIndex = (seg: string): boolean => /^\d+$/.test(seg);

function matchesPrefix(path: PathSeg[], match: string[]): boolean {
	for (let i = 0; i < match.length; i++) {
		if (path[i] !== match[i]) {
			return false;
		}
	}
	return true;
}

// Path/alias helpers below are exported for direct unit testing; the adapter's
// public surface (index.ts) still exposes only encode/decode.
export function aliasField(seg: PathSeg): PathSeg {
	if (typeof seg === 'number') {
		return seg;
	}
	return FIELD_ALIASES[seg] ?? seg;
}

export function expandField(seg: string): string {
	if (isIndex(seg)) {
		return seg;
	}
	return FIELD_REVERSE[seg] ?? seg;
}

export function transformPath(path: PathSeg[]): PathSeg[] {
	for (const { match, prefix } of PREFIX_PATTERNS) {
		if (path.length > match.length && matchesPrefix(path, match)) {
			const idx = path[match.length];
			if (typeof idx === 'number') {
				const rest = path.slice(match.length + 1).map(aliasField);
				return [`${prefix}${idx}`, ...rest];
			}
		}
	}
	return path.map(aliasField);
}

export function expandPath(pathStr: string): PathSeg[] {
	const segs = pathStr.split('.');
	const first = segs[0];

	for (const [prefixName, originalPath] of Object.entries(PREFIX_REVERSE)) {
		const match = first.match(new RegExp(`^${prefixName}(\\d+)$`));
		if (match) {
			const idx = parseInt(match[1], 10);
			const rest = segs.slice(1).map(expandField);
			return [...originalPath, idx, ...rest];
		}
	}

	return segs.map((s) => (isIndex(s) ? parseInt(s, 10) : expandField(s)));
}

function flattenValue(
	target: Record<string, string>,
	prefix: string,
	value: Json,
): void {
	if (value === null || typeof value !== 'object') {
		target[prefix] = encodeLeaf(value);
		return;
	}
	if (Array.isArray(value)) {
		if (value.length === 0) {
			target[prefix] = encodeLeaf(value);
			return;
		}
		for (let i = 0; i < value.length; i++) {
			flattenValue(target, `${prefix}.${i}`, value[i]);
		}
		return;
	}
	const obj = value as Record<string, Json>;
	if (Object.keys(obj).length === 0) {
		target[prefix] = encodeLeaf(value);
		return;
	}
	for (const [k, v] of Object.entries(obj)) {
		flattenValue(target, `${prefix}.${aliasField(k)}`, v);
	}
}

function diffToFlatObject(
	baseline: Query,
	query: Query,
): Record<string, string> {
	const ops = computeDiff(baseline, query);

	const obj: Record<string, string> = {};
	for (const [code, path, value] of ops) {
		const key = transformPath(path).join('.');
		if (code === DiffCode.Delete) {
			obj[`${DEL_PREFIX}${key}`] = '';
		} else if (typeof value === 'object' && value !== null) {
			flattenValue(obj, key, value);
		} else {
			obj[key] = encodeLeaf(value);
		}
	}
	return obj;
}

function leafMap(obj: Json): Record<string, Json> {
	const out: Record<string, Json> = {};
	const walk = (node: Json, segs: PathSeg[]): void => {
		if (isLeaf(node)) {
			out[segs.join('.')] = node;
			return;
		}
		if (Array.isArray(node)) {
			node.forEach((value, index) => walk(value, [...segs, index]));
			return;
		}
		Object.entries(node as Record<string, Json>).forEach(([key, value]) =>
			walk(value, [...segs, key]),
		);
	};
	walk(obj, []);
	return out;
}

function rebuildFromLeaves(map: Record<string, Json>): Record<string, Json> {
	const root: Record<string, Json> = {};
	Object.entries(map).forEach(([path, value]) => {
		const segs = path.split('.').map((s) => (isIndex(s) ? parseInt(s, 10) : s));
		set(root, segs, value);
	});
	return root;
}

/**
 * Clone baseline[0] paths to a higher index for template-based array diffing.
 * When encoder emits `query1.aggOp=avg`, decoder needs `builder.queryData.1.*`
 * to exist first (cloned from index 0) before applying the patch.
 */
function ensureArrayIndexFromTemplate(
	baseMap: Record<string, Json>,
	arrayPrefix: string,
	targetIndex: number,
): void {
	const sourcePrefix = `${arrayPrefix}.0.`;
	const targetPrefix = `${arrayPrefix}.${targetIndex}.`;

	// Skip if target already has entries (already cloned or from baseline)
	const hasTarget = Object.keys(baseMap).some((k) => k.startsWith(targetPrefix));
	if (hasTarget) {
		return;
	}

	// Clone all index-0 paths to target index
	for (const [path, value] of Object.entries(baseMap)) {
		if (path.startsWith(sourcePrefix)) {
			const suffix = path.slice(sourcePrefix.length);
			baseMap[`${targetPrefix}${suffix}`] = value;
		}
	}
}

export function encode(query: Query): { params: URLSearchParams; tag: string } {
	const { baseline, tag } = pickBaseline(query);
	const obj = diffToFlatObject(baseline, query);

	// `encodeValuesOnly` percent-encodes values (so `&`, `=`, `%`, … survive)
	// while leaving the readable dotted keys untouched.
	const queryString = qs.stringify(
		{ [TAG_KEY]: `QA${tag}`, ...obj },
		{
			encodeValuesOnly: true,
			sort: (a, b) => a.localeCompare(b),
		},
	);

	return { params: new URLSearchParams(queryString), tag: `QA${tag}` };
}

/**
 * When a nested path like `a.b.0.c` is set, any ancestor empty-container entry
 * (`a.b` = `[]`) must be removed or `rebuildFromLeaves` order may clobber it.
 */
function deleteAncestorEmptyContainers(
	map: Record<string, Json>,
	fullPath: string,
): void {
	const segs = fullPath.split('.');
	for (let i = 1; i < segs.length; i += 1) {
		const ancestor = segs.slice(0, i).join('.');
		const value = map[ancestor];
		if (
			(Array.isArray(value) && value.length === 0) ||
			(typeof value === 'object' &&
				value !== null &&
				Object.keys(value).length === 0)
		) {
			delete map[ancestor];
		}
	}
}

/**
 * Check if expanded path refers to an array element beyond index 0.
 * Returns [arrayPrefix, index] if so, null otherwise.
 */
function detectArrayGrowth(expandedPath: PathSeg[]): [string, number] | null {
	for (const { match } of PREFIX_PATTERNS) {
		if (expandedPath.length > match.length) {
			const matchesPattern = match.every((seg, i) => expandedPath[i] === seg);
			if (matchesPattern) {
				const idx = expandedPath[match.length];
				if (typeof idx === 'number' && idx > 0) {
					return [match.join('.'), idx];
				}
			}
		}
	}
	return null;
}

export function decode(params: URLSearchParams): Query {
	const parsed = qs.parse(params.toString()) as Record<string, unknown>;
	const tagValue = (parsed[TAG_KEY] as string) ?? '';
	const baselineTag = tagValue.slice(2) as BaselineTag;
	const baseline = getBaselineByTag(baselineTag);

	const baseMap = leafMap(baseline);
	const clonedIndices = new Set<string>();

	for (const [key, value] of Object.entries(parsed)) {
		if (key === TAG_KEY) {
			continue;
		}

		// Skip foreign params (e.g. panelTypes, startTime) that qs.parse included.
		if (!isOwnedKey(key)) {
			continue;
		}

		if (key.startsWith(DEL_PREFIX)) {
			const expandedPath = expandPath(key.slice(1));
			const shortPath = expandedPath.join('.');
			for (const basePath of Object.keys(baseMap)) {
				if (basePath === shortPath || basePath.startsWith(`${shortPath}.`)) {
					delete baseMap[basePath];
				}
			}
			continue;
		}

		const expandedPath = expandPath(key);

		// For paths like builder.queryData.1.*, clone from index 0 first
		const growth = detectArrayGrowth(expandedPath);
		if (growth) {
			const [arrayPrefix, idx] = growth;
			const cacheKey = `${arrayPrefix}.${idx}`;
			if (!clonedIndices.has(cacheKey)) {
				ensureArrayIndexFromTemplate(baseMap, arrayPrefix, idx);
				clonedIndices.add(cacheKey);
			}
		}

		const fullPath = expandedPath.join('.');
		deleteAncestorEmptyContainers(baseMap, fullPath);
		baseMap[fullPath] = typeof value === 'string' ? decodeLeaf(value) : value;
	}

	return rebuildFromLeaves(baseMap) as unknown as Query;
}
