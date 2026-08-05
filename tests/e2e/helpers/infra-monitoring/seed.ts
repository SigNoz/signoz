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
import {
	datasetFacts,
	datasetPath,
	NAME_LABEL,
	type DatasetKey,
} from './datasets';
import type { EntityDef } from './entities';

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
	const now = Date.now();
	const startTime = new Date(now - START_TIME_AGE_MS).toISOString();
	const latest = Math.max(...rows.map((row) => Date.parse(row.timestamp)));
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

const GROUP_ATTRS = [
	'k8s.namespace.name',
	'k8s.cluster.name',
	'k8s.node.name',
	'os.type',
];

function factsFor(dataset: DatasetKey, rows: MetricRow[]): SeededFacts {
	const { entity } = datasetFacts(dataset);
	const nameLabel = NAME_LABEL[entity];

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

const SEED_TIMEOUT_MS = 60_000;
/**
 * The seeder rejects very large single POSTs, and a 150 k-row fixture rebased in
 * one payload is slow to serialise. Chunking keeps both bounded.
 */
const SEED_CHUNK_SIZE = 2_000;

/**
 * Six workers hammering one uvicorn worker occasionally drops a connection
 * mid-POST ("socket hang up") — a transport failure, not a rejected payload.
 * Insertion is additive and idempotent enough to retry: a duplicated chunk adds
 * rows the assertions already tolerate (no spec counts absolute rows), whereas a
 * lost chunk fails the scenario for a reason that has nothing to do with it.
 */
const SEED_ATTEMPTS = 3;

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
			lastError = `${res.status()}: ${await res.text()}`;
		} catch (error) {
			lastError = String(error);
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
	const dataset = entity.seed.grouped as DatasetKey;
	const members = options.members ?? EXPANDED_ROW_LIMIT + 2;
	const namePrefix = options.namePrefix ?? `viewall-${entity.key}-`;
	const groupLabel = options.groupLabel ?? `viewall-${entity.key}`;
	const groupAttr = entity.groupByAttribute;
	const nameLabel = NAME_LABEL[entity.key];

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

/** Names {@link seedGroupedDataset} produces, without seeding. */
export function groupedCloneNames(
	entity: EntityDef,
	options: SeedGroupedOptions = {},
): { groupLabel: string; names: string[] } {
	const members = options.members ?? EXPANDED_ROW_LIMIT + 2;
	const namePrefix = options.namePrefix ?? `viewall-${entity.key}-`;
	return {
		groupLabel: options.groupLabel ?? `viewall-${entity.key}`,
		names: Array.from({ length: members }, (_, i) => `${namePrefix}${i + 1}`),
	};
}
