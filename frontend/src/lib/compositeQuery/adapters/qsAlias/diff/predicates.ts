/**
 * Value-shape predicates shared by the diff algorithm and the codec's leaf
 * walker. A "leaf" is anything the serializer emits as a single token: a
 * scalar (string/number/boolean/null/undefined), or an *empty* container
 * (`[]` / `{}`). Non-empty containers are walked recursively.
 */

export type Json = unknown;
export type PathSeg = string | number;

export const isContainer = (
	value: Json,
): value is Record<string, Json> | Json[] =>
	typeof value === 'object' && value !== null;

export const isEmptyContainer = (value: Json): boolean =>
	isContainer(value) &&
	(Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0);

export const isLeaf = (value: Json): boolean =>
	!isContainer(value) || isEmptyContainer(value);
