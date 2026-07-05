import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesPatchOpDTO } from 'api/generated/services/sigNoz.schemas';
import { cloneDeep } from 'lodash-es';

/**
 * Applies the RFC-6902 ops our `patchOps` builders emit to a document, so a
 * dashboard edit can be reflected in the react-query cache optimistically before
 * the server responds. Pure: deep-clones and returns a new document, never
 * mutating the input.
 *
 * Deliberately lenient — mirrors the backend's apply (a `remove`/`replace` on a
 * missing path is a no-op, `add` creates missing object parents) rather than
 * throwing as strict RFC-6902 would. This is safe because the mutation always
 * refetches on settle, so any mis-applied edge op self-corrects; the applier only
 * needs to be right for the common case to kill the perceived lag.
 *
 * Scope: `add` / `replace` / `remove` (the only ops the builders produce).
 * `move` / `copy` / `test` are never emitted, so they are treated as no-ops.
 */
export function applyJsonPatch<T>(
	doc: T,
	ops: DashboardtypesJSONPatchOperationDTO[],
): T {
	const next = cloneDeep(doc);
	ops.forEach((op) => applyOperation(next as unknown, op));
	return next;
}

type JsonRecord = Record<string, unknown>;

function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Unescape one JSON-Pointer reference token (RFC-6901): `~1`→`/`, `~0`→`~`. */
function unescapeToken(token: string): string {
	return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Parse a JSON Pointer into its reference tokens (`""`/`"/"` → root, `[]`). */
function parsePointer(path: string): string[] {
	if (!path || path === '/') {
		return [];
	}
	return path.slice(1).split('/').map(unescapeToken);
}

/**
 * Walks to the container that holds the pointer's last token. Returns `undefined`
 * when the path can't be resolved (lenient skip). For `add`, missing intermediate
 * object nodes are created (backend parity); array steps are never auto-created.
 */
function navigateToParent(
	root: unknown,
	tokens: string[],
	createMissing: boolean,
): unknown {
	let current: unknown = root;
	for (let i = 0; i < tokens.length - 1; i += 1) {
		const token = tokens[i];
		if (isArray(current)) {
			const index = token === '-' ? current.length : Number(token);
			current = current[index];
		} else if (isRecord(current)) {
			if (current[token] === undefined && createMissing) {
				current[token] = {};
			}
			current = current[token];
		} else {
			return undefined;
		}
		if (current === undefined || current === null) {
			return undefined;
		}
	}
	return current;
}

/** `add`: array-insert (`-` = append) or object-set. */
function addAt(parent: unknown, key: string, value: unknown): void {
	if (isArray(parent)) {
		const index = key === '-' ? parent.length : Number(key);
		parent.splice(index, 0, value);
	} else if (isRecord(parent)) {
		parent[key] = value;
	}
}

/** `replace`: overwrite an in-range array index or an object key. */
function replaceAt(parent: unknown, key: string, value: unknown): void {
	if (isArray(parent)) {
		const index = Number(key);
		if (index >= 0 && index < parent.length) {
			parent[index] = value;
		}
	} else if (isRecord(parent)) {
		parent[key] = value;
	}
}

/** `remove`: splice an in-range array index or delete an object key (lenient). */
function removeAt(parent: unknown, key: string): void {
	if (isArray(parent)) {
		const index = Number(key);
		if (index >= 0 && index < parent.length) {
			parent.splice(index, 1);
		}
	} else if (isRecord(parent)) {
		delete parent[key];
	}
}

function applyOperation(
	root: unknown,
	op: DashboardtypesJSONPatchOperationDTO,
): void {
	const tokens = parsePointer(op.path);
	// Whole-document ops would need to reassign the root reference — our builders
	// never target root, so skip rather than complicate the contract.
	if (tokens.length === 0) {
		return;
	}

	const parent = navigateToParent(
		root,
		tokens,
		op.op === DashboardtypesPatchOpDTO.add,
	);
	if (parent === undefined || parent === null) {
		return;
	}
	const key = tokens[tokens.length - 1];

	// move / copy / test are never emitted by our builders → no-op (reconciled by refetch).
	// Clone the inserted value: a later op in the same batch can target a node we
	// just added (e.g. add an empty section, then add an item into it), and writing
	// the value by reference would mutate the caller's `op.value` — corrupting the
	// ops still queued for the network request.
	if (op.op === DashboardtypesPatchOpDTO.add) {
		addAt(parent, key, cloneDeep(op.value));
	} else if (op.op === DashboardtypesPatchOpDTO.replace) {
		replaceAt(parent, key, cloneDeep(op.value));
	} else if (op.op === DashboardtypesPatchOpDTO.remove) {
		removeAt(parent, key);
	}
}
