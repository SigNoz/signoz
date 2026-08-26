/**
 * Seeding infra-monitoring metrics through the pytest harness's HTTP seeder.
 *
 * Reimplements the two behaviours `_load_pods_metrics` in
 * `tests/integration/tests/inframonitoring/02_pods.py` relies on:
 *
 * 1. **rebase** — shift every timestamp so the newest sample sits ~30 s in the
 *    past. The list endpoints only report an entity whose latest sample falls
 *    inside the queried window, and future-stamped samples are dropped outright.
 * 2. **`__START_TIME__` substitution** — the `k8s.pod.start_time` placeholder
 *    becomes a real ISO string, so `podAge` is deterministic.
 *
 * Seeding is **additive** and the stack is shared across workers, so a dataset
 * must own the names it asserts on (the fixtures already do) and specs must
 * never assert "the table has exactly N rows".
 */

import fs from 'fs';
import type { Page } from '@playwright/test';

import { seederUrl } from '../common';
import { datasetFacts, datasetPath, type DatasetKey } from './datasets';
import { ENTITIES, entityByKey, type EntityDef } from './entities';

const START_TIME_PLACEHOLDER = '__START_TIME__';

/** `K8sExpandedRow`'s `EXPANDED_ROW_LIMIT` — the expanded table's page size. */
export const EXPANDED_ROW_LIMIT = 10;

export interface MetricRow {
	timestamp: string;
	labels?: Record<string, string>;
	[key: string]: unknown;
}

export interface SeededFacts {
	dataset: DatasetKey;
	entity: string;
	/** Entity names actually seeded, sorted. */
	names: string[];
	/** Group label → member count, per group attribute. */
	groups: Record<string, Record<string, number>>;
	/** Rows POSTed to the seeder. */
	rowCount: number;
}

// ─── Fixture reading ─────────────────────────────────────────────────────────

function readRows(dataset: DatasetKey): MetricRow[] {
	const file = datasetPath(dataset);
	if (!fs.existsSync(file)) {
		throw new Error(
			`dataset fixture missing: ${file}. Datasets come from the integration suite — check tests/integration/testdata/inframonitoring/.`,
		);
	}
	return fs
		.readFileSync(file, 'utf8')
		.split('\n')
		.filter((line) => line.trim() !== '')
		.map((line) => JSON.parse(line) as MetricRow);
}

/**
 * Shift a series so its newest sample lands `LATEST_SAMPLE_LAG_MS` before now,
 * and resolve the start-time placeholder.
 */
const LATEST_SAMPLE_LAG_MS = 30_000;
const START_TIME_AGE_MS = 10 * 60 * 1000;

function rebaseToNow(rows: MetricRow[]): MetricRow[] {
	if (rows.length === 0) {
		// `Math.max()` of nothing is -Infinity, which makes every rebased timestamp
		// `new Date(NaN).toISOString()` — a RangeError from deep inside the map, with
		// nothing pointing at the empty fixture that caused it.
		throw new Error('rebaseToNow: no rows — the fixture is empty or unparsed');
	}
	const now = Date.now();
	const startTime = new Date(now - START_TIME_AGE_MS).toISOString();
	const timestamps = rows.map((row) => Date.parse(row.timestamp));
	const unparsed = timestamps.findIndex(Number.isNaN);
	if (unparsed !== -1) {
		throw new Error(
			`rebaseToNow: row ${unparsed} has an unparseable timestamp \`${rows[unparsed].timestamp}\``,
		);
	}
	const latest = Math.max(...timestamps);
	const offset = now - LATEST_SAMPLE_LAG_MS - latest;

	return rows.map((row) => {
		const labels = { ...row.labels };
		if (labels['k8s.pod.start_time'] === START_TIME_PLACEHOLDER) {
			labels['k8s.pod.start_time'] = startTime;
		}
		return {
			...row,
			labels,
			timestamp: new Date(Date.parse(row.timestamp) + offset).toISOString(),
		};
	});
}

// ─── Facts ───────────────────────────────────────────────────────────────────

/**
 * Every attribute any entity can group by, derived rather than hand-listed — the
 * literal version silently omitted `host.name` (hosts' `secondGroupByAttribute`),
 * so `SeededFacts.groups` had no entry for it and any scenario grouping on it got
 * `undefined` back.
 */
const GROUP_ATTRS = [
	...new Set(
		ENTITIES.flatMap((entity) =>
			[entity.groupByAttribute, entity.secondGroupByAttribute].filter(
				(attr): attr is string => Boolean(attr),
			),
		),
	),
];

function factsFor(dataset: DatasetKey, rows: MetricRow[]): SeededFacts {
	const { entity } = datasetFacts(dataset);
	// The registry's `nameColumnId` doubles as the name *label* for all ten
	// entities, and the drift guard checks it against the product's table config.
	// `datasets.NAME_LABEL` used to hold a third hand-maintained copy of the same
	// mapping, which #12402 renamed all ten values of in one commit.
	const nameLabel = entityByKey(entity).nameColumnId;

	const names = new Set<string>();
	const groups: Record<string, Record<string, Set<string>>> = {};

	for (const row of rows) {
		const name = row.labels?.[nameLabel];
		if (!name) {
			continue;
		}
		names.add(name);
		for (const attr of GROUP_ATTRS) {
			const value = row.labels?.[attr];
			if (!value) {
				continue;
			}
			((groups[attr] ??= {})[value] ??= new Set()).add(name);
		}
	}

	return {
		dataset,
		entity,
		names: [...names].sort(),
		groups: Object.fromEntries(
			Object.entries(groups).map(([attr, byLabel]) => [
				attr,
				Object.fromEntries(
					Object.entries(byLabel).map(([label, members]) => [label, members.size]),
				),
			]),
		),
		rowCount: rows.length,
	};
}

/**
 * Re-derive a dataset's declared facts from the fixture and fail if they drifted.
 * Cheap enough to run in a `beforeAll`; it turns a fixture edit into an explicit
 * error here instead of a puzzling assertion failure three specs away.
 */
export function assertDatasetFacts(dataset: DatasetKey): SeededFacts {
	const declared = datasetFacts(dataset);
	const actual = factsFor(dataset, readRows(dataset));

	// Both loops below are guarded on non-empty input, so a dataset that declares
	// neither is registered with nothing this function can check.
	if (
		declared.names.length === 0 &&
		Object.keys(declared.groups ?? {}).length === 0
	) {
		throw new Error(
			`dataset ${dataset} declares no names and no groups, so SMOKE-00 asserts nothing about it`,
		);
	}

	if (declared.names.length > 0) {
		const missing = declared.names.filter((name) => !actual.names.includes(name));
		if (missing.length > 0) {
			throw new Error(
				`dataset ${dataset}: declared names ${missing.join(', ')} are not in the fixture (found ${actual.names.join(', ')})`,
			);
		}
	}

	for (const [attr, expected] of Object.entries(declared.groups ?? {})) {
		for (const [label, count] of Object.entries(expected)) {
			const got = actual.groups[attr]?.[label];
			if (got !== count) {
				throw new Error(
					`dataset ${dataset}: group ${attr}=${label} has ${got ?? 0} members, declared ${count}`,
				);
			}
		}
	}

	return actual;
}

// ─── Seeder transport ────────────────────────────────────────────────────────

/**
 * Per-attempt budget, sized so all {@link SEED_ATTEMPTS} fit inside one test.
 *
 * Was 60 s, which with three attempts meant a worst case of 180 s against a 30 s
 * (local) / 60 s (CI) test timeout — so a genuinely dead seeder reported as a
 * bare "Test timeout exceeded" with no failing assertion, which is the least
 * debuggable failure the runner can emit.
 */
const SEED_TIMEOUT_MS = 15_000;

/**
 * The seeder rejects very large single POSTs, so chunking keeps each one bounded.
 * The largest fixture in the corpus is ~430 rows, i.e. always a single chunk —
 * this is headroom for a future fixture, not something the suite exercises today.
 */
const SEED_CHUNK_SIZE = 2_000;

/**
 * Six workers hammering one uvicorn worker occasionally drops a connection
 * mid-POST ("socket hang up") — a transport failure, not a rejected payload.
 * Insertion is additive and idempotent enough to retry that: a duplicated chunk
 * adds rows the assertions already tolerate (no spec counts absolute rows),
 * whereas a lost chunk fails the scenario for a reason that has nothing to do
 * with it.
 */
const SEED_ATTEMPTS = 3;

/** Backoff between attempts. Three retries in the same millisecond against a
 *  seeder that just dropped a connection under load all fail the same way. */
const SEED_BACKOFF_MS = 250;

async function postChunk(page: Page, chunk: MetricRow[]): Promise<void> {
	let lastError = '';
	for (let attempt = 1; attempt <= SEED_ATTEMPTS; attempt += 1) {
		try {
			const res = await page.request.post(`${seederUrl()}/telemetry/metrics`, {
				data: chunk,
				timeout: SEED_TIMEOUT_MS,
			});
			if (res.ok()) {
				return;
			}
			const body = await res.text();
			// Only 5xx and transport faults are worth another try. A 4xx is the
			// seeder telling us the payload is wrong — retrying it twice more burns
			// the test's budget to arrive at the same answer, and buries the message
			// that would have explained it.
			if (res.status() < 500) {
				throw new Error(
					`seeder POST /telemetry/metrics rejected the payload — ${res.status()}: ${body}`,
				);
			}
			lastError = `${res.status()}: ${body}`;
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes('rejected the payload')
			) {
				throw error;
			}
			lastError = String(error);
		}
		if (attempt < SEED_ATTEMPTS) {
			await new Promise((resolve) => {
				setTimeout(resolve, SEED_BACKOFF_MS * attempt);
			});
		}
	}
	throw new Error(
		`seeder POST /telemetry/metrics failed after ${SEED_ATTEMPTS} attempts — ${lastError}`,
	);
}

async function postMetrics(page: Page, rows: MetricRow[]): Promise<void> {
	for (let i = 0; i < rows.length; i += SEED_CHUNK_SIZE) {
		await postChunk(page, rows.slice(i, i + SEED_CHUNK_SIZE));
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Seed a dataset with timestamps rebased so its samples land a few seconds
 * before now — inside every default time window the UI uses. Returns the facts
 * derived from what was actually seeded, so a spec asserts against the fixture
 * rather than against a transcription of it.
 */
export async function seedDataset(
	page: Page,
	dataset: DatasetKey,
): Promise<SeededFacts> {
	const rows = rebaseToNow(readRows(dataset));
	await postMetrics(page, rows);
	return factsFor(dataset, rows);
}

export interface SeedGroupedOptions {
	/**
	 * How many members the cloned group should hold. Defaults to
	 * `EXPANDED_ROW_LIMIT + 2`, so the expanded table is capped *and* offers
	 * "View All" — the two things B-EXP-02/06 need.
	 */
	members?: number;
	/**
	 * Prefix for the cloned entity names. Defaults to a per-entity value; it must
	 * be unique to the calling scenario family because seeding is additive across
	 * workers.
	 */
	namePrefix?: string;
	/** Group label the clones land under. Defaults to `viewall-<entity.key>`. */
	groupLabel?: string;
	/**
	 * Attribute the clones are grouped under. Defaults to `entity.groupByAttribute`.
	 *
	 * Needed for clusters, whose group attribute *is* its name attribute — grouping
	 * clusters by cluster name makes every group a singleton, so a >10-member group
	 * is not constructible that way. `clusters_groupby.jsonl` also carries
	 * `cloud.provider`, which is the usable alternative.
	 */
	groupAttribute?: string;
}

/**
 * Seed a group whose member count exceeds `EXPANDED_ROW_LIMIT`.
 *
 * No fixture has a group that large — the biggest is 6 — so the rows for one
 * entity are cloned under fresh names inside a scenario-owned group label, the
 * same trick the original pods-only helper used for `ns-viewall`.
 *
 * Cloning preserves every label the list endpoint needs, so the clones are
 * indistinguishable from seeded rows apart from their name and group.
 */
export async function seedGroupedDataset(
	page: Page,
	entity: EntityDef,
	options: SeedGroupedOptions = {},
): Promise<SeededFacts> {
	const dataset = entity.seed.grouped;
	const { members, namePrefix, groupLabel } = resolveGroupedOptions(
		entity,
		options,
	);
	const groupAttr = options.groupAttribute ?? entity.groupByAttribute;
	const nameLabel = entity.nameColumnId;

	// For clusters the name label *is* the group attribute, so the two label writes
	// below collide: every clone would be renamed to `groupLabel` and the twelve
	// members would collapse into one row, while `groupedCloneNames` still promised
	// twelve. That is a real property of the entity, not a fixture gap — grouping
	// clusters by cluster name makes every group a singleton. Fail loudly rather
	// than seeding one row and letting the caller time out on "row not visible".
	if (nameLabel === groupAttr) {
		throw new Error(
			`${entity.key}: groupByAttribute '${groupAttr}' is also its name attribute, so ` +
				`every group holds exactly one member and grouped clones cannot be distinct. ` +
				`Pass { groupAttribute } explicitly — '${dataset}' carries cloud.provider.`,
		);
	}

	const all = readRows(dataset);
	// Clone one entity's whole series so the clones carry every metric the list
	// endpoint reads, not just the one the group is keyed on.
	const templateName = all.find((row) => row.labels?.[nameLabel])?.labels?.[
		nameLabel
	];
	if (!templateName) {
		throw new Error(
			`dataset ${dataset}: no row carries ${nameLabel}, cannot build a grouped clone`,
		);
	}
	const template = all.filter((row) => row.labels?.[nameLabel] === templateName);

	const clones = Array.from({ length: members }, (_, index) => {
		const name = `${namePrefix}${index + 1}`;
		return template.map((row) => {
			const labels = { ...row.labels, [nameLabel]: name, [groupAttr]: groupLabel };
			// Pods are identified by UID, so a clone needs its own or the list
			// collapses every clone into one row.
			if (labels['k8s.pod.uid']) {
				labels['k8s.pod.uid'] = `${name}-uid`;
			}
			return { ...row, labels };
		});
	}).flat();

	const rows = rebaseToNow(clones);
	await postMetrics(page, rows);
	return factsFor(dataset, rows);
}

/**
 * The one place the grouped-clone defaults live.
 *
 * {@link seedGroupedDataset} and {@link groupedCloneNames} each used to re-derive
 * these, so changing a default in one made specs address names that were never
 * seeded — and the failure would have been a 30 s "row not visible".
 */
function resolveGroupedOptions(
	entity: EntityDef,
	options: SeedGroupedOptions,
): { members: number; namePrefix: string; groupLabel: string } {
	return {
		members: options.members ?? EXPANDED_ROW_LIMIT + 2,
		namePrefix: options.namePrefix ?? `viewall-${entity.key}-`,
		groupLabel: options.groupLabel ?? `viewall-${entity.key}`,
	};
}

/**
 * The row key / `selectedItem` value for a seeded entity called `name`.
 *
 * The two differ only for pods, which `getK8sPodRowKey` identifies by UID — and
 * {@link seedGroupedDataset} mints clone UIDs as `<name>-uid`, the same shape the
 * `*_value_accuracy` fixtures use (`acc-p1` → `acc-p1-uid`). Addressing a pod row
 * by its *name* builds `row-acc-p1`, which matches nothing whether the behaviour
 * under test works or not — a silent pass, not a failure.
 */
export function itemKeyFor(entity: EntityDef, name: string): string {
	return entity.key === 'pods' ? `${name}-uid` : name;
}

/** Names {@link seedGroupedDataset} produces, without seeding. */
export function groupedCloneNames(
	entity: EntityDef,
	options: SeedGroupedOptions = {},
): { groupLabel: string; names: string[] } {
	const { members, namePrefix, groupLabel } = resolveGroupedOptions(
		entity,
		options,
	);
	return {
		groupLabel,
		names: Array.from({ length: members }, (_, i) => `${namePrefix}${i + 1}`),
	};
}
