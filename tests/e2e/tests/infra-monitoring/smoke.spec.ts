/**
 * Phase-1 smoke: every dataset's declared facts still match its fixture.
 *
 * The per-entity render check that used to live here only ever reached
 * `entity.seed.primary`, and `B-LIST-01` / `B-LIST-05` already assert the same
 * default columns and total-count label per entity.
 *
 * This is pure filesystem work: no browser, no seeding, ~1 s for the corpus.
 */

import { expect, test } from '../../fixtures/auth';
import {
	DATASETS,
	type DatasetKey,
} from '../../helpers/infra-monitoring/datasets';
import { assertDatasetFacts } from '../../helpers/infra-monitoring/seed';

test.describe('smoke datasets', () => {
	test('SMOKE-00 every dataset’s declared facts match its fixture', () => {
		const keys = Object.keys(DATASETS) as DatasetKey[];
		expect(keys.length).toBeGreaterThan(0);
		for (const key of keys) {
			assertDatasetFacts(key);
		}
	});
});
